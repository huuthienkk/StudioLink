import { EventEmitter } from 'events';
import { BrowserContext } from 'playwright-core';
import { Campaign, Account, CampaignStatus } from '../../shared/types';
import { CampaignsRepository } from '../../data/repositories/campaigns.repo';
import { AccountsRepository } from '../../data/repositories/accounts.repo';
import { LinkedInCampaignFlow, CampaignExecutionCallbacks } from '../../platforms/linkedin/campaign';

interface CampaignController {
  status: CampaignStatus;
  stopFlag: boolean;
  context?: BrowserContext;
  pausePromiseResolve?: () => void;
}

/**
 * Smart Concurrency Pool & Memory Recycler:
 * - Giới hạn tối đa `maxConcurrency` luồng Chromium chạy song song (mặc định 3 luồng).
 * - Tự động xếp hàng (Queue) khi vượt quá giới hạn.
 * - Giải phóng triệt để RAM và đóng Browser Context ngay khi chiến dịch kết thúc trước khi bốc nick tiếp theo.
 * - Giữ bộ nhớ RAM luôn ở mức an toàn (< 2.2GB) dù khách hàng nạp 50 hay 100 profile.
 */
export class CampaignRunner extends EventEmitter {
  private static instance: CampaignRunner;
  private runningCampaigns: Map<string, CampaignController> = new Map();
  private queue: string[] = [];
  private maxConcurrency: number = 3;

  private campaignsRepo = new CampaignsRepository();
  private accountsRepo = new AccountsRepository();
  private liFlow = new LinkedInCampaignFlow();

  static getInstance(): CampaignRunner {
    if (!CampaignRunner.instance) {
      CampaignRunner.instance = new CampaignRunner();
    }
    return CampaignRunner.instance;
  }

  setMaxConcurrency(limit: number): void {
    this.maxConcurrency = Math.max(1, Math.min(10, limit));
    this.processQueue();
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  getActiveRunningCount(): number {
    let count = 0;
    for (const ctrl of this.runningCampaigns.values()) {
      if (ctrl.status === 'running') count++;
    }
    return count;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getCampaignStatus(campaignId: string): CampaignStatus {
    const active = this.runningCampaigns.get(campaignId);
    if (active) return active.status;
    const dbCamp = this.campaignsRepo.getById(campaignId);
    return dbCamp ? dbCamp.status : 'draft';
  }

  async start(campaignId: string): Promise<void> {
    const existing = this.runningCampaigns.get(campaignId);
    if (existing) {
      if (existing.status === 'paused') {
        this.resume(campaignId);
        return;
      }
      if (existing.status === 'running' || existing.status === 'queued') {
        console.warn(`[Runner] Chiến dịch ${campaignId} đang ở trạng thái "${existing.status}", bỏ qua gọi start.`);
        return;
      }
    }

    const campaign = this.campaignsRepo.getById(campaignId);
    if (!campaign) {
      throw new Error(`Không tìm thấy chiến dịch với ID: ${campaignId}`);
    }

    const account = this.accountsRepo.getById(campaign.accountId);
    if (!account) {
      throw new Error(`Không tìm thấy tài khoản gắn liền với chiến dịch: ${campaign.accountId}`);
    }

    // Kiểm tra giới hạn Concurrency Pool
    if (this.getActiveRunningCount() >= this.maxConcurrency) {
      // Đưa vào hàng đợi (Queue)
      if (!this.queue.includes(campaignId)) {
        this.queue.push(campaignId);
      }
      const controller: CampaignController = {
        status: 'queued',
        stopFlag: false,
      };
      this.runningCampaigns.set(campaignId, controller);
      this.campaignsRepo.updateStatus(campaignId, 'queued');
      this.emit('statusChanged', { campaignId, status: 'queued' });
      this.emit('progress', {
        campaignId,
        current: 0,
        total: campaign.maxConnections || 30,
        message: `⏳ Đang trong hàng đợi (Vị trí #${this.queue.indexOf(campaignId) + 1}). Giới hạn ${this.maxConcurrency} luồng song song để bảo vệ RAM.`,
        cooldownRemainingSeconds: 0,
      });
      console.log(`[Runner Queue] Chiến dịch ${campaignId} đã xếp vào hàng đợi (Vị trí #${this.queue.length}).`);
      return;
    }

    // Đủ tài nguyên -> Thực thi ngay
    await this.executeCampaign(campaignId, campaign, account);
  }

  private async executeCampaign(campaignId: string, campaign?: Campaign, account?: Account): Promise<void> {
    const targetCampaign = campaign || this.campaignsRepo.getById(campaignId);
    if (!targetCampaign) return;

    const targetAccount = account || this.accountsRepo.getById(targetCampaign.accountId);
    if (!targetAccount) return;

    const controller: CampaignController = {
      status: 'running',
      stopFlag: false,
    };
    this.runningCampaigns.set(campaignId, controller);
    this.campaignsRepo.updateStatus(campaignId, 'running');
    this.emit('statusChanged', { campaignId, status: 'running' });

    // Chạy bất đồng bộ
    (async () => {
      try {
        const callbacks: CampaignExecutionCallbacks = {
          shouldStop: () => controller.stopFlag,
          waitIfPaused: async () => {
            while (controller.status === 'paused' && !controller.stopFlag) {
              await new Promise<void>((resolve) => {
                controller.pausePromiseResolve = resolve;
              });
            }
          },
          onContextCreated: (ctx: BrowserContext) => {
            controller.context = ctx;
          },
          onProgress: (data: any) => {
            this.emit('progress', { campaignId, ...data });
          },
          onLog: (message: string) => {
            this.emit('log', { campaignId, message });
          },
        };

        await this.liFlow.execute(targetCampaign, targetAccount, callbacks);

        const finalStatus = controller.stopFlag ? 'stopped' : 'completed';
        this.campaignsRepo.updateStatus(campaignId, finalStatus);
        this.emit('statusChanged', { campaignId, status: finalStatus });
      } catch (err: any) {
        console.error(`[Runner] Kết thúc chiến dịch ${campaignId}:`, err);
        const finalStatus = controller.stopFlag ? 'stopped' : 'error';
        this.campaignsRepo.updateStatus(campaignId, finalStatus);
        this.emit('statusChanged', { campaignId, status: finalStatus, error: err.message });
      } finally {
        // Tái chế tài nguyên & Đóng Browser Context giải phóng triệt để RAM
        if (controller.context) {
          try {
            await controller.context.close();
          } catch {}
          controller.context = undefined;
        }

        this.runningCampaigns.delete(campaignId);
        const queueIdx = this.queue.indexOf(campaignId);
        if (queueIdx !== -1) {
          this.queue.splice(queueIdx, 1);
        }

        console.log(`[Runner Pool] Đã đóng tài nguyên của chiến dịch ${campaignId}. Đang kiểm tra hàng đợi...`);
        // Tự động bốc chiến dịch tiếp theo trong hàng đợi
        this.processQueue();
      }
    })();
  }

  private processQueue(): void {
    while (this.getActiveRunningCount() < this.maxConcurrency && this.queue.length > 0) {
      const nextCampaignId = this.queue.shift();
      if (!nextCampaignId) break;

      const ctrl = this.runningCampaigns.get(nextCampaignId);
      if (ctrl && ctrl.stopFlag) {
        continue; // Bỏ qua chiến dịch đã bị hủy khi đang chờ
      }

      console.log(`[Runner Queue] Bốc chiến dịch tiếp theo từ hàng đợi: ${nextCampaignId}`);
      this.executeCampaign(nextCampaignId);
    }
  }

  pause(campaignId: string): void {
    const active = this.runningCampaigns.get(campaignId);
    if (active && active.status === 'running') {
      active.status = 'paused';
      this.campaignsRepo.updateStatus(campaignId, 'paused');
      this.emit('statusChanged', { campaignId, status: 'paused' });
      this.emit('progress', {
        campaignId,
        message: '⏸ Đang tạm dừng... (Bấm Tiếp tục để chạy lại)',
      });
    }
  }

  resume(campaignId: string): void {
    const active = this.runningCampaigns.get(campaignId);
    if (active && active.status === 'paused') {
      active.status = 'running';
      if (active.pausePromiseResolve) {
        active.pausePromiseResolve();
        active.pausePromiseResolve = undefined;
      }
      this.campaignsRepo.updateStatus(campaignId, 'running');
      this.emit('statusChanged', { campaignId, status: 'running' });
      this.emit('progress', {
        campaignId,
        message: '▶ Đang tiếp tục chiến dịch...',
      });
    }
  }

  async stop(campaignId: string): Promise<void> {
    // Nếu chiến dịch đang nằm trong hàng đợi chờ
    const queueIdx = this.queue.indexOf(campaignId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
    }

    const active = this.runningCampaigns.get(campaignId);
    if (active) {
      active.stopFlag = true;
      active.status = 'stopped';
      if (active.pausePromiseResolve) {
        active.pausePromiseResolve();
        active.pausePromiseResolve = undefined;
      }
      if (active.context) {
        try {
          await active.context.close();
        } catch {}
        active.context = undefined;
      }
      this.runningCampaigns.delete(campaignId);
      this.campaignsRepo.updateStatus(campaignId, 'stopped');
      this.emit('statusChanged', { campaignId, status: 'stopped' });
      this.emit('progress', {
        campaignId,
        message: '⏹ Chiến dịch đã dừng hẳn và rời khỏi hàng đợi.',
      });
      // Giải phóng slot cho hàng đợi
      this.processQueue();
    } else {
      this.campaignsRepo.updateStatus(campaignId, 'stopped');
      this.emit('statusChanged', { campaignId, status: 'stopped' });
    }
  }
}
