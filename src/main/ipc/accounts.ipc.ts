import { ipcMain } from 'electron';
import { AccountsRepository } from '../../data/repositories/accounts.repo';
import { SecurityCrypto } from '../../core/security/crypto';
import { ProfileManager } from '../../core/browser/profile-manager';
import { ProxyManager } from '../../core/browser/proxy';
import { Account } from '../../shared/types';
import { chromium, BrowserContext } from 'playwright-core';
import { StealthManager } from '../../core/browser/stealth';

// Quản lý các cửa sổ trình duyệt đăng nhập đang mở
const activeLoginSessions = new Map<string, BrowserContext>();

export function registerAccountsIpc(): void {
  const repo = new AccountsRepository();
  const crypto = new SecurityCrypto();
  const profileManager = new ProfileManager();
  const proxyManager = new ProxyManager();

  // 1. Lấy danh sách tài khoản
  ipcMain.handle('accounts:list', async () => {
    return repo.getAll();
  });

  // 2. Lấy chi tiết 1 tài khoản
  ipcMain.handle('accounts:get', async (_event, id: string) => {
    return repo.getById(id);
  });

  // 3. Thêm mới tài khoản (Tập trung vào Profile và Proxy)
  ipcMain.handle('accounts:create', async (_event, data: {
    platform: 'facebook' | 'linkedin';
    username: string;
    proxyUrl?: string;
    note?: string;
  }) => {
    const id = `acc_${Date.now()}`;
    const profileDir = profileManager.getProfilePath(id);

    const account: Account = {
      id,
      platform: data.platform,
      username: data.username,
      profileDir,
      proxyUrl: data.proxyUrl,
      status: 'idle', // Ban đầu là chưa đăng nhập (idle)
      createdAt: new Date().toISOString(),
    };

    repo.insert(account);
    return { success: true, account };
  });

  // 4. Xóa tài khoản và dọn profile
  ipcMain.handle('accounts:delete', async (_event, id: string) => {
    // Nếu trình duyệt đăng nhập đang mở thì đóng trước
    const activeContext = activeLoginSessions.get(id);
    if (activeContext) {
      await activeContext.close().catch(() => {});
      activeLoginSessions.delete(id);
    }

    repo.delete(id);
    profileManager.clearSession(id);
    return { success: true };
  });

  // 5. Kiểm tra kết nối Proxy
  ipcMain.handle('accounts:testProxy', async (_event, rawProxy: string) => {
    try {
      const parsed = proxyManager.parseProxy(rawProxy);
      const isDuplicate = proxyManager.checkDuplicateIp(parsed.host);
      const result = await proxyManager.verifyProxy(parsed);
      proxyManager.releaseIp(parsed.host);

      return {
        success: result.isAlive,
        isDuplicate,
        responseTimeMs: result.responseTimeMs,
        errorMessage: result.errorMessage,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err.message || 'Định dạng proxy không hợp lệ',
      };
    }
  });

  // 6. Bắt đầu phiên Đăng nhập: Mở trình duyệt độc lập (Profile riêng + Proxy) để người dùng tự đăng nhập & nhập 2FA
  ipcMain.handle('accounts:startLogin', async (_event, id: string) => {
    const account = repo.getById(id);
    if (!account) throw new Error('Không tìm thấy tài khoản');

    // Đóng context cũ nếu có
    const existing = activeLoginSessions.get(id);
    if (existing) {
      await existing.close().catch(() => {});
      activeLoginSessions.delete(id);
    }

    const profileDir = profileManager.getProfilePath(account.id);
    let proxyConfig: any = undefined;
    if (account.proxyUrl) {
      const parsed = proxyManager.parseProxy(account.proxyUrl);
      proxyConfig = {
        server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
        username: parsed.username,
        password: parsed.password,
      };
    }

    const chromiumArgs = StealthManager.getChromiumArgs(!!account.proxyUrl);

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: 'chrome',
      proxy: proxyConfig,
      args: chromiumArgs,
      viewport: null,
    });

    await StealthManager.applyStealth(context);

    activeLoginSessions.set(id, context);

    const targetUrl = account.platform === 'facebook'
      ? 'https://www.facebook.com/'
      : 'https://www.linkedin.com/';

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto(targetUrl).catch(() => {});

    return { success: true };
  });

  // 7. Hoàn tất Đăng nhập: Lưu trạng thái active và TỰ ĐỘNG ĐÓNG TRÌNH DUYỆT
  ipcMain.handle('accounts:finishLogin', async (_event, id: string) => {
    const context = activeLoginSessions.get(id);
    let cookiesCount = 0;

    if (context) {
      try {
        const cookies = await context.cookies();
        cookiesCount = cookies.length;
      } catch (e) {
        console.warn('[Accounts IPC] Không đọc được cookie trước khi đóng:', e);
      }

      // TỰ ĐỘNG ĐÓNG TRÌNH DUYỆT ĐĂNG NHẬP
      await context.close().catch(() => {});
      activeLoginSessions.delete(id);
      console.log(`[Accounts IPC] Đã tự động đóng trình duyệt đăng nhập của tài khoản ${id}`);
    }

    // Cập nhật trạng thái tài khoản thành Đang hoạt động
    repo.updateStatus(id, 'active');
    repo.updateLastActive(id);

    return {
      success: true,
      cookiesCount,
      message: 'Đã lưu phiên đăng nhập thành công và tự động đóng trình duyệt.',
    };
  });

  // 8. Hủy phiên đăng nhập (Đóng trình duyệt mà không lưu)
  ipcMain.handle('accounts:cancelLogin', async (_event, id: string) => {
    const context = activeLoginSessions.get(id);
    if (context) {
      await context.close().catch(() => {});
      activeLoginSessions.delete(id);
    }
    return { success: true };
  });
}
