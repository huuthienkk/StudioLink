import { ProxyManager } from '../browser/proxy';

/**
 * Bộ bảo vệ an toàn: Tự động phát hiện và ngắt khẩn cấp tiến trình
 * Bảo vệ tài khoản LinkedIn khỏi bị checkpoint, spam flag hoặc lộ IP thật
 */
export class AutomationGuards {
  /**
   * Kiểm tra điều kiện Checkpoint / Captcha
   */
  static shouldAbortOnCheckpoint(isCheckpointDetected: boolean): boolean {
    if (isCheckpointDetected) {
      console.warn('[Guard] CẢNH BÁO: Phát hiện Checkpoint / Thử thách bảo mật! Dừng khẩn cấp để cứu tài khoản.');
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra điều kiện rớt proxy
   */
  static shouldAbortOnDeadProxy(isProxyAlive: boolean): boolean {
    if (!isProxyAlive) {
      console.warn('[Guard] CẢNH BÁO: Mất kết nối Proxy! Dừng chiến dịch lập tức để không lộ địa chỉ IP thật của máy.');
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra số lỗi liên tiếp
   */
  static shouldAbortOnConsecutiveFailures(consecutiveFailures: number, maxFailures: number = 3): boolean {
    if (consecutiveFailures >= maxFailures) {
      console.warn(`[Guard] Đã gặp ${consecutiveFailures} lỗi liên tiếp. Dừng an toàn để tránh bị đánh dấu Spam.`);
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra độ sẵn sàng của Proxy trước hoặc trong khi chạy
   */
  static async verifyProxySafe(proxyManager: ProxyManager, rawProxy?: string): Promise<boolean> {
    if (!rawProxy) return true;
    try {
      const parsed = proxyManager.parseProxy(rawProxy);
      const res = await proxyManager.verifyProxy(parsed, 6000);
      return res.isAlive;
    } catch {
      return false;
    }
  }
}
