import { BrowserContext } from 'playwright-core';

/**
 * Module Stealth chuyên sâu: Che giấu toàn diện dấu vết tự động hóa của Chromium / Playwright
 * Vượt qua các hệ thống phát hiện bot nâng cao (Akamai, PerimeterX, FingerprintJS, Arkose Labs)
 */
export class StealthManager {
  /**
   * Danh sách tham số khởi chạy Chromium tối ưu chống phát hiện
   */
  static getChromiumArgs(hasProxy: boolean = false): string[] {
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-notifications',
      '--no-sandbox',
      '--start-maximized',
      '--disable-infobars',
      '--ignore-certificate-errors',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];

    if (hasProxy) {
      // Chống lộ địa chỉ IP thật của máy qua WebRTC khi chạy bằng Proxy
      args.push(
        '--enforce-webrtc-ip-permission-check',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'
      );
    }

    return args;
  }

  /**
   * Tiêm script vào mọi trang và iframe trước khi tải bất kỳ DOM nào
   */
  static async applyStealth(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // 1. Gỡ bỏ thuộc tính navigator.webdriver
      const nav = navigator as any;
      Object.defineProperty(nav, 'webdriver', {
        get: () => undefined,
      });

      // 2. Giả lập đối tượng window.chrome đầy đủ như trình duyệt thật của người dùng
      if (!(window as any).chrome) {
        (window as any).chrome = {};
      }
      (window as any).chrome.runtime = {
        OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
        PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
        PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64' },
      };
      (window as any).chrome.app = { isInstalled: false };
      (window as any).chrome.csi = () => {};
      (window as any).chrome.loadTimes = () => {};

      // 3. Giả lập danh sách plugin trình duyệt thông thường
      if (!nav.plugins || nav.plugins.length === 0) {
        const dummyPlugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ];
        Object.defineProperty(nav, 'plugins', {
          get: () => dummyPlugins,
        });
      }

      // 4. Giả lập danh sách ngôn ngữ
      Object.defineProperty(nav, 'languages', {
        get: () => ['vi-VN', 'vi', 'en-US', 'en'],
      });

      // 5. Chuẩn hóa truy vấn quyền Permissions (tránh default automation denied)
      const originalQuery = nav.permissions?.query;
      if (originalQuery) {
        nav.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: 'prompt', onchange: null } as any)
            : originalQuery(parameters);
      }

      // 6. Xóa các biến nhận diện nội bộ của Playwright / Selenium
      delete (window as any).__playwright;
      delete (window as any).__pw_manual;
      delete (window as any).__webdriver_script_function;
      delete (window as any).__driver_evaluate;
    });
  }
}
