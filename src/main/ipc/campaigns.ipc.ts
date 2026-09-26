import { ipcMain, dialog, BrowserWindow } from 'electron';
import { CampaignsRepository } from '../../data/repositories/campaigns.repo';
import { AccountsRepository } from '../../data/repositories/accounts.repo';
import { VariantGenerator } from '../../core/ai/variant-generator';
import { GeminiWebBot } from '../../core/ai/gemini-web-bot';
import { CampaignRunner } from '../../core/engine/runner';
import { ProfileManager } from '../../core/browser/profile-manager';
import { ProxyManager } from '../../core/browser/proxy';
import { Campaign, TargetGroupItem } from '../../shared/types';
import { chromium } from 'playwright-core';

export function registerCampaignsIpc(): void {
  const repo = new CampaignsRepository();
  const accRepo = new AccountsRepository();
  const variantGenerator = new VariantGenerator();
  const geminiBot = new GeminiWebBot();
  const runner = CampaignRunner.getInstance();
  const profileManager = new ProfileManager();
  const proxyManager = new ProxyManager();

  // Chuyển tiếp sự kiện tiến trình của Runner tới Giao diện Renderer
  runner.on('progress', (data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('campaign:progress', data);
    });
  });

  runner.on('log', (data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('campaign:log', data);
    });
  });

  runner.on('statusChanged', (data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('campaign:statusChanged', data);
    });
  });

  // 1. Lấy danh sách chiến dịch
  ipcMain.handle('campaigns:list', async () => {
    return repo.getAll();
  });

  // 2. Lấy chi tiết 1 chiến dịch
  ipcMain.handle('campaigns:get', async (_event, id: string) => {
    return repo.getById(id);
  });

  // 3. Tạo mới chiến dịch (hỗ trợ targetGroups & mediaPaths)
  ipcMain.handle('campaigns:create', async (_event, data: {
    name: string;
    platform: 'facebook' | 'linkedin';
    accountId: string;
    scheduleConfig: any;
    targetKeywords: string[];
    targetGroups?: TargetGroupItem[];
    templateContent: string;
    mediaPaths?: string[];
    generatedVariants?: string[];
    targetLocation?: string;
    maxConnections?: number;
  }) => {
    const id = `camp_${Date.now()}`;
    const campaign: Campaign = {
      id,
      name: data.name,
      platform: data.platform,
      accountId: data.accountId,
      status: 'draft',
      scheduleConfig: data.scheduleConfig,
      targetKeywords: data.targetKeywords || [],
      targetGroups: data.targetGroups || [],
      templateContent: data.templateContent,
      mediaPaths: data.mediaPaths || [],
      generatedVariants: data.generatedVariants || [],
      targetLocation: data.targetLocation,
      maxConnections: data.maxConnections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    repo.insert(campaign);
    return { success: true, campaign };
  });

  // 3b. Cập nhật chiến dịch đã có
  ipcMain.handle('campaigns:update', async (_event, campaign: Campaign) => {
    repo.update(campaign);
    return { success: true, campaign };
  });

  // 4. Quét nhóm (Không áp dụng cho LinkedIn)
  ipcMain.handle('campaigns:scanJoinedGroups', async () => {
    return { success: false, errorMessage: 'Tính năng quét nhóm chỉ áp dụng cho Facebook.', groups: [] };
  });

  // 5. Chọn hình ảnh đính kèm từ máy tính (Native Open File Dialog)
  ipcMain.handle('campaigns:selectImages', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Chọn hình ảnh đính kèm bài viết Facebook',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Hình ảnh (*.jpg, *.png, *.jpeg, *.webp)', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      ],
    });

    if (result.canceled) return [];
    return result.filePaths;
  });

  // 6. Gemini Web Bot: Đăng nhập Google & Sinh biến thể
  ipcMain.handle('campaigns:openGeminiLogin', async () => {
    return geminiBot.openLoginSession();
  });

  ipcMain.handle('campaigns:closeGeminiLogin', async () => {
    await geminiBot.closeLoginSession();
    return { success: true };
  });

  ipcMain.handle('campaigns:generateGeminiWeb', async (_event, data: { content: string; count?: number }) => {
    const variants = await geminiBot.rewriteContent(data.content, data.count || 5);
    return { success: true, variants };
  });

  // 7. Sinh biến thể bài viết bằng API AI (Dự phòng)
  ipcMain.handle('campaigns:generateVariants', async (_event, options: {
    content: string;
    count?: number;
    tone?: 'professional' | 'friendly' | 'urgent' | 'storytelling';
  }) => {
    const variants = await variantGenerator.generateVariants({
      baseContent: options.content,
      count: options.count || 5,
      tone: options.tone || 'friendly',
    });
    return { success: true, variants };
  });

  // 8. Điều khiển vòng đời chiến dịch (Start, Pause, Resume, Stop)
  ipcMain.handle('campaigns:start', async (_event, campaignId: string) => {
    await runner.start(campaignId);
    return { success: true };
  });

  ipcMain.handle('campaigns:pause', async (_event, campaignId: string) => {
    runner.pause(campaignId);
    return { success: true };
  });

  ipcMain.handle('campaigns:resume', async (_event, campaignId: string) => {
    runner.resume(campaignId);
    return { success: true };
  });

  ipcMain.handle('campaigns:stop', async (_event, campaignId: string) => {
    await runner.stop(campaignId);
    return { success: true };
  });

  // 9. Xóa chiến dịch
  ipcMain.handle('campaigns:delete', async (_event, id: string) => {
    repo.delete(id);
    return { success: true };
  });
}

