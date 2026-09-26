import { chromium, BrowserContext, Page } from 'playwright-core';
import { LinkedInAuth } from './auth';
import { LinkedInPeopleSearch } from './people-search';
import { LinkedInConnector } from './connector';
import { LI_SELECTORS } from './selectors';
import { Campaign, Account } from '../../shared/types';
import { ProfileManager } from '../../core/browser/profile-manager';
import { ProxyManager } from '../../core/browser/proxy';
import { Scheduler } from '../../core/engine/scheduler';
import { Humanize } from '../../core/browser/humanize';
import { ReportsRepository } from '../../data/repositories/reports.repo';
import { AccountsRepository } from '../../data/repositories/accounts.repo';
import { StealthManager } from '../../core/browser/stealth';
import { AutomationGuards } from '../../core/engine/guards';
import { OrganicActions } from './organic';

export interface CampaignExecutionCallbacks {
  shouldStop?: () => boolean;
  waitIfPaused?: () => Promise<void>;
  onContextCreated?: (ctx: BrowserContext) => void;
  onProgress?: (data: any) => void;
  onLog?: (message: string) => void;
}

export class LinkedInCampaignFlow {
  private auth = new LinkedInAuth();
  private search = new LinkedInPeopleSearch();
  private connector = new LinkedInConnector();
  private profileManager = new ProfileManager();
  private proxyManager = new ProxyManager();
  private reportsRepo = new ReportsRepository();
  private accountsRepo = new AccountsRepository();

  /**
   * Thực thi toàn bộ luồng chiến dịch kết nối LinkedIn:
   * 1. Khởi chạy Chrome với Profile riêng, Stealth Mode & Chống lộ IP WebRTC
   * 2. Tải số lượng hành động hôm nay từ CSDL SQLite vào Scheduler chống tràn quota
   * 3. Kiểm tra an toàn Proxy và xác thực phiên đăng nhập
   * 4. Tìm kiếm từ khóa chức danh & Áp dụng bộ lọc Vị trí qua UI
   * 5. Duyệt các thẻ ứng viên với click tự nhiên và đường cong chuột Bezier
   * 6. Giám sát tự động bằng AutomationGuards: Ngắt ngay khi dính 3 lỗi liên tiếp, mất proxy hoặc checkpoint
   */
  async execute(
    campaign: Campaign,
    account: Account,
    callbacks?: CampaignExecutionCallbacks
  ): Promise<void> {
    const log = (msg: string) => {
      console.log(`[LI Campaign] ${msg}`);
      callbacks?.onLog?.(msg);
    };

    const targetKeyword = (campaign.targetKeywords && campaign.targetKeywords.length > 0)
      ? campaign.targetKeywords[0]
      : 'CEO';
    const targetLocation = campaign.targetLocation || '';
    const targetTotal = campaign.maxConnections || campaign.scheduleConfig?.dailyLimit || 30;

    log(`Bắt đầu chiến dịch LinkedIn: "${campaign.name}" | Từ khóa: "${targetKeyword}" | Vị trí: "${targetLocation || 'Toàn bộ'}" | Mục tiêu: ${targetTotal} kết nối`);

    // Phục hồi số lượng hành động hôm nay từ CSDL SQLite
    const executedToday = this.reportsRepo.getTodayCountByAccount(account.id);
    const scheduler = new Scheduler(campaign.scheduleConfig, executedToday);
    log(`Trạng thái ngày: Đã gửi ${executedToday} lượt hôm nay | Hạn mức còn lại: ${scheduler.getRemainingQuotaToday()}`);

    if (!scheduler.canExecuteNow()) {
      log('CẢNH BÁO AN TOÀN: Tài khoản đã đạt hạn mức tối đa trong ngày hoặc ngoài khung giờ cho phép. Dừng chiến dịch.');
      return;
    }

    // Kiểm tra tính sẵn sàng của Proxy
    if (account.proxyUrl) {
      log('Đang kiểm tra kết nối an toàn qua Proxy...');
      const isProxyAlive = await AutomationGuards.verifyProxySafe(this.proxyManager, account.proxyUrl);
      if (AutomationGuards.shouldAbortOnDeadProxy(isProxyAlive)) {
        log('LỖI KHẨN CẤP: Proxy không phản hồi! Dừng chiến dịch để tránh rò rỉ IP thật.');
        return;
      }
      log('Proxy hoạt động ổn định, kết nối an toàn.');
    }

    const profileDir = this.profileManager.getProfilePath(account.id);

    let proxyConfig: any = undefined;
    let geoOptions: any = {};
    if (account.proxyUrl) {
      const parsed = this.proxyManager.parseProxy(account.proxyUrl);
      proxyConfig = {
        server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
        username: parsed.username,
        password: parsed.password,
      };
      this.proxyManager.checkDuplicateIp(parsed.host);

      // Đồng bộ vân tay địa lý (Múi giờ, Locale, Geolocation) khớp 100% với IP Proxy
      const geo = await this.proxyManager.resolveGeoFingerprint(parsed.host);
      log(`Đồng bộ vân tay địa lý với Proxy: Múi giờ ${geo.timezoneId} | Ngôn ngữ: ${geo.locale}`);
      geoOptions = {
        timezoneId: geo.timezoneId,
        locale: geo.locale,
        geolocation: geo.latitude && geo.longitude ? { latitude: geo.latitude, longitude: geo.longitude } : undefined,
      };
    }

    // Kích hoạt Persona sinh trắc học riêng biệt cho tài khoản (chống chữ ký trùng lặp)
    const persona = Humanize.getPersonaForAccount(account.id);
    log(`Kích hoạt Persona sinh trắc học riêng: Nhịp gõ ${(persona.typingSpeedMultiplier * 100).toFixed(0)}%, Rung chuột ${(persona.jitterMultiplier * 100).toFixed(0)}%`);

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let consecutiveFailures = 0;

    try {
      const chromiumArgs = StealthManager.getChromiumArgs(!!account.proxyUrl);

      context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        channel: 'chrome',
        proxy: proxyConfig,
        args: chromiumArgs,
        viewport: null,
        ...geoOptions,
      });

      // Áp dụng lớp ngụy trang Stealth chuyên sâu trước khi điều hướng trang
      await StealthManager.applyStealth(context);

      callbacks?.onContextCreated?.(context);

      page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

      // 1. Xác thực đăng nhập & Cầu dao bảo vệ (Circuit Breaker)
      log('Đang kiểm tra phiên đăng nhập LinkedIn...');
      const isLoggedIn = await this.auth.login(page, {
        username: account.username,
        password: account.encryptedPassword,
      });

      if (!isLoggedIn) {
        log(`🚨 [Circuit Breaker] Đăng nhập thất bại hoặc phát hiện Checkpoint! Tự động cách ly tài khoản "${account.username}" để bảo vệ toàn hệ thống.`);
        this.accountsRepo.updateStatus(account.id, 'checkpoint');
        return;
      }

      // 2. Phân tầng tài khoản & Chế độ Nuôi nick Warm-up (Account Tiering)
      const accountTier = account.tier || 'tier3_mature';
      if (accountTier === 'tier1_cold') {
        log('🛡️ TÀI KHOẢN MỚI (Tier 1 - Cold): Kích hoạt chế độ Nuôi nick Warm-up tự động.');
        log('Không gửi kết nối trong giai đoạn này. Đang lướt Newsfeed và xem tin tức để tích lũy Trust Score...');
        await OrganicActions.wanderFeed(page, 90);
        log('Hoàn thành phiên Warm-up hôm nay. Tài khoản đã tích lũy tín hiệu người dùng sạch.');
        return;
      }

      // 2. Tìm kiếm từ khóa & Áp dụng bộ lọc vị trí qua UI
      log(`Tìm kiếm ứng viên chức danh: "${targetKeyword}" tại vị trí: "${targetLocation || 'Mặc định'}"...`);
      const searchSuccess = await this.search.navigateToPeopleSearchWithLocation(
        page,
        targetKeyword,
        targetLocation,
        campaign.secondDegreeOnly !== false
      );
      if (!searchSuccess) {
        log('Không thể điều hướng tới trang danh sách nhân sự. Dừng chiến dịch.');
        return;
      }

      // 3. Vòng lặp duyệt danh sách kết quả & Gửi kết nối trực tiếp trên thẻ
      let connectedCount = 0;
      let currentPage = 1;
      const customMessageTemplate = campaign.templateContent || '';

      while (connectedCount < targetTotal && !callbacks?.shouldStop?.()) {
        if (callbacks?.waitIfPaused) {
          await callbacks.waitIfPaused();
          if (callbacks?.shouldStop?.()) break;
        }

        if (!scheduler.canExecuteNow()) {
          log('Đạt giới hạn số lượt kết nối trong ngày hoặc ngoài khung giờ an toàn. Tạm dừng.');
          break;
        }

        log(`Đang quét danh sách nhân sự tại trang #${currentPage}...`);
        await Humanize.randomDelay(2000, 3500);

        // Cuộn trang mượt với mouse wheel để nạp lazy-load
        await Humanize.smoothScroll(
          async (step) => {
            await page?.evaluate((y) => window.scrollBy(0, y), step);
          },
          800,
          page
        );

        const cards = await page.$$(LI_SELECTORS.search.resultCards);
        log(`Tìm thấy ${cards.length} thẻ kết quả tại trang #${currentPage}.`);

        if (cards.length === 0) {
          log('Không tìm thấy thẻ ứng viên nào trên trang này.');
          break;
        }

        let hitLimit = false;

        for (let idx = 0; idx < cards.length; idx++) {
          if (callbacks?.shouldStop?.()) break;

          if (callbacks?.waitIfPaused) {
            await callbacks.waitIfPaused();
            if (callbacks?.shouldStop?.()) break;
          }

          if (connectedCount >= targetTotal) {
            log(`Đã đạt đủ mục tiêu chiến dịch: ${connectedCount}/${targetTotal} kết nối!`);
            break;
          }

          // Kiểm tra định kỳ 5 kết nối một lần xem proxy còn sống không
          if (account.proxyUrl && connectedCount > 0 && connectedCount % 5 === 0) {
            const alive = await AutomationGuards.verifyProxySafe(this.proxyManager, account.proxyUrl);
            if (AutomationGuards.shouldAbortOnDeadProxy(alive)) {
              log('CẢNH BÁO AN TOÀN: Proxy bị ngắt giữa chừng! Ngắt khẩn cấp để bảo vệ IP máy.');
              hitLimit = true;
              break;
            }
          }

          const card = cards[idx];

          // Trích xuất tên ứng viên
          const nameEl = await card.$(LI_SELECTORS.search.nameSpan);
          const leadName = (await nameEl?.textContent().catch(() => ''))?.trim() || '';

          // Trích xuất link hoặc định danh hồ sơ
          const linkEl = await card.$(LI_SELECTORS.search.profileLink);
          const rawUrl = (await linkEl?.getAttribute('href').catch(() => '')) || '';
          const profileUrl = rawUrl.split('?')[0] || `li_lead_p${currentPage}_${idx + 1}`;

          callbacks?.onProgress?.({
            current: connectedCount,
            total: targetTotal,
            message: `Đang kết nối tới: ${leadName || 'ứng viên'} (Trang ${currentPage})`,
            cooldownRemainingSeconds: 0,
          });

          // Gửi kết nối với mô phỏng ghé thăm hồ sơ (Organic Profile Visit) nếu có link cá nhân
          let result: any;
          const isDirectProfile = profileUrl.includes('/in/');

          if (isDirectProfile) {
            log(`Hành vi tự nhiên: Mở xem hồ sơ của "${leadName || 'ứng viên'}" trước khi kết nối...`);
            let profileTab: Page | null = null;
            try {
              profileTab = await page.context().newPage();
              await profileTab.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
              await OrganicActions.simulateProfileReading(profileTab);
              result = await this.connector.sendConnectionInvite(profileTab, profileUrl, customMessageTemplate);
            } catch (err: any) {
              log(`Không mở được trang hồ sơ chi tiết (${err.message}), fallback kết nối trên thẻ.`);
              result = await this.connector.connectOnResultCard(page, card, customMessageTemplate, leadName);
            } finally {
              if (profileTab) {
                await profileTab.close().catch(() => {});
              }
            }
          } else {
            result = await this.connector.connectOnResultCard(page, card, customMessageTemplate, leadName);
          }

          // Lưu báo cáo hoạt động vào SQLite
          this.reportsRepo.insert({
            id: `rep_li_${Date.now()}_${connectedCount}`,
            campaignId: campaign.id,
            platform: 'linkedin',
            accountId: account.id,
            targetIdentifier: profileUrl,
            status: result.success ? 'success' : 'failed',
            message: result.message,
            timestamp: new Date().toISOString(),
          });

          // Dừng khẩn cấp nếu LinkedIn chạm trần giới hạn tuần
          if (result.limitReached) {
            log('CẢNH BÁO AN TOÀN: Tài khoản đã chạm trần giới hạn kết nối trong tuần của LinkedIn! Dừng khẩn cấp để bảo vệ tài khoản.');
            hitLimit = true;
            break;
          }

          if (result.success) {
            connectedCount++;
            consecutiveFailures = 0; // Reset số lỗi liên tiếp
            scheduler.recordExecution();
            log(`[${connectedCount}/${targetTotal}] Đã gửi thành công lời mời kết nối tới: "${leadName || 'Ứng viên'}"`);

            // Tạo nhiễu tự nhiên (Organic noise): Cứ mỗi 4 kết nối thành công, cho bot lướt nhẹ Newsfeed 20s
            if (connectedCount < targetTotal && connectedCount % 4 === 0) {
              log('Tạo nhiễu hành vi sinh học: Tạm dừng lướt Newsfeed 20s...');
              let feedTab: Page | null = null;
              try {
                feedTab = await page.context().newPage();
                await OrganicActions.wanderFeed(feedTab, 20);
              } catch {
                // Bỏ qua lỗi phụ
              } finally {
                if (feedTab) await feedTab.close().catch(() => {});
              }
            }

            callbacks?.onProgress?.({
              current: connectedCount,
              total: targetTotal,
              message: `Đã kết nối ${connectedCount}/${targetTotal}. Nghỉ an toàn...`,
              cooldownRemainingSeconds: 0,
            });

            // Nếu chưa đạt mục tiêu thì nghỉ giãn cách ngẫu nhiên
            if (connectedCount < targetTotal && idx < cards.length - 1) {
              const delayMs = scheduler.getNextDelayMs();
              const delaySec = Math.round(delayMs / 1000);
              log(`Nghỉ ngẫu nhiên an toàn ${delaySec}s trước lời mời tiếp theo để chống ban nick...`);

              for (let sec = delaySec; sec > 0; sec--) {
                if (callbacks?.shouldStop?.()) break;
                if (callbacks?.waitIfPaused) {
                  await callbacks.waitIfPaused();
                  if (callbacks?.shouldStop?.()) break;
                }
                callbacks?.onProgress?.({
                  current: connectedCount,
                  total: targetTotal,
                  message: `Nghỉ an toàn chống ban nick: còn ${sec}s...`,
                  cooldownRemainingSeconds: sec,
                });
                await Humanize.sleep(1000);
              }
            }
          } else {
            // Đếm số lỗi liên tiếp
            consecutiveFailures++;
            log(`Thao tác không thành công (${result.message}). Số lỗi liên tiếp: ${consecutiveFailures}/3`);

            if (AutomationGuards.shouldAbortOnConsecutiveFailures(consecutiveFailures, 3)) {
              log('DỪNG KHẨN CẤP: Đã gặp 3 lỗi liên tiếp! Tự động dừng chiến dịch để tránh bị thuật toán LinkedIn đánh dấu Spam.');
              hitLimit = true;
              break;
            }
          }
        }

        if (hitLimit || callbacks?.shouldStop?.() || connectedCount >= targetTotal) {
          break;
        }

        // 4. Phân trang: Cuộn xuống cuối và bấm nút "Next >"
        log('Đã duyệt xong danh sách thẻ trên trang hiện tại, đang chuyển sang trang tiếp theo...');
        await Humanize.smoothScroll(
          async (step) => {
            await page?.evaluate((y) => window.scrollBy(0, y), step);
          },
          1200,
          page
        );
        await Humanize.randomDelay(1500, 2500);

        const nextBtn = await page.$(LI_SELECTORS.search.paginationNextButton);
        if (!nextBtn) {
          log('Không tìm thấy nút chuyển trang tiếp theo (Next). Kết thúc danh sách.');
          break;
        }

        const isNextDisabled = await nextBtn.evaluate((el: any) => el.hasAttribute('disabled') || el.classList.contains('artdeco-button--disabled')).catch(() => false);
        if (isNextDisabled) {
          log('Đã đến trang kết quả cuối cùng của LinkedIn.');
          break;
        }

        try {
          await Humanize.clickElementNaturally(page, nextBtn);
        } catch {
          await nextBtn.click().catch(() => {});
        }

        currentPage++;
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await Humanize.randomDelay(3000, 5000);
      }

      if (callbacks?.shouldStop?.()) {
        log(`Chiến dịch LinkedIn đã dừng lại theo yêu cầu. Tổng kết nối đã gửi: ${connectedCount}/${targetTotal}.`);
      } else {
        log(`Chiến dịch LinkedIn hoàn tất! Đã gửi thành công ${connectedCount}/${targetTotal} lời mời kết nối.`);
      }
    } catch (err: any) {
      if (callbacks?.shouldStop?.()) {
        log('Chiến dịch LinkedIn đã dừng an toàn.');
      } else {
        log(`Lỗi trong luồng chiến dịch LinkedIn: ${err.message}`);
      }
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }
}
