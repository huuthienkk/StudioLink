import path from 'path';
import fs from 'fs';
import { chromium, BrowserContext, Page } from 'playwright-core';
import { EntityLock } from './entity-lock';
import { Humanize } from '../browser/humanize';

/**
 * Gemini Web Bot: Tự động hóa trình duyệt điều khiển tab gemini.google.com
 * Sử dụng profile độc lập (gemini_profile) lưu phiên đăng nhập tài khoản Google
 */
export class GeminiWebBot {
  private profileDir: string;
  private activeContext: BrowserContext | null = null;

  constructor(customBaseDir?: string) {
    const base = customBaseDir || path.join(process.cwd(), 'userData', 'profiles');
    this.profileDir = path.join(base, 'gemini_profile');
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }
  }

  /**
   * Mở trình duyệt để người dùng đăng nhập tài khoản Google trên gemini.google.com một lần duy nhất
   */
  async openLoginSession(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.activeContext) {
        await this.activeContext.close().catch(() => {});
        this.activeContext = null;
      }

      this.activeContext = await chromium.launchPersistentContext(this.profileDir, {
        headless: false,
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--start-maximized',
        ],
        viewport: null,
      });

      const page = this.activeContext.pages().length > 0 ? this.activeContext.pages()[0] : await this.activeContext.newPage();
      await page.goto('https://gemini.google.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });

      return {
        success: true,
        message: 'Đã mở cửa sổ Gemini. Vui lòng đăng nhập tài khoản Google của bạn và bấm "Đã xong" sau khi hoàn tất.',
      };
    } catch (err: any) {
      console.error('[Gemini Web Bot] Lỗi khi mở phiên đăng nhập:', err);
      return {
        success: false,
        message: `Lỗi mở trình duyệt Gemini: ${err.message}`,
      };
    }
  }

  /**
   * Đóng phiên đăng nhập Gemini sau khi người dùng đã đăng nhập xong
   */
  async closeLoginSession(): Promise<void> {
    if (this.activeContext) {
      await this.activeContext.close().catch(() => {});
      this.activeContext = null;
    }
  }

  /**
   * Sử dụng Gemini Web để viết lại bài viết thành N biến thể
   */
  async rewriteContent(baseContent: string, count: number = 5): Promise<string[]> {
    console.log(`[Gemini Web Bot] Bắt đầu tạo ${count} biến thể từ bài gốc...`);
    const originalEntities = EntityLock.extractEntities(baseContent);

    let context: BrowserContext | null = null;
    try {
      context = await chromium.launchPersistentContext(this.profileDir, {
        headless: false, // Mở 100% để người dùng quan sát
        channel: 'chrome',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--start-maximized',
        ],
        viewport: null,
      });

      const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
      await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await Humanize.randomDelay(2000, 3500);

      // Kiểm tra xem đã đăng nhập chưa
      const isLoginNeeded = await page.evaluate(() => {
        const url = window.location.href;
        if (url.includes('accounts.google.com')) return true;
        const signInBtn = document.querySelector('a[href*="accounts.google.com"], button[aria-label*="Sign in"], button[aria-label*="Đăng nhập"]');
        return !!signInBtn;
      });

      if (isLoginNeeded) {
        console.warn('[Gemini Web Bot] Chưa đăng nhập Google trên Gemini Web.');
        await context.close().catch(() => {});
        // Dự phòng tạo biến thể thông minh bằng EntityLock
        return this.generateSmartFallbackVariants(baseContent, count, originalEntities);
      }

      // Xây dựng prompt gửi cho Gemini
      const lockedInfo = [
        originalEntities.phones.length ? `SĐT: ${originalEntities.phones.join(', ')}` : '',
        originalEntities.prices.length ? `Giá: ${originalEntities.prices.join(', ')}` : '',
        originalEntities.links.length ? `Link: ${originalEntities.links.join(', ')}` : '',
      ].filter(Boolean).join(' | ');

      const prompt = `Hãy viết lại bài viết sau thành ${count} bài đăng mạng xã hội khác nhau với phong cách thu hút, chuyên nghiệp, thay đổi mở bài và câu từ.
QUAN TRỌNG: Bạn BẮT BUỘC phải giữ NGUYÊN VẸN 100% các thông tin sau trong mọi biến thể: ${lockedInfo || 'Không đổi số điện thoại và liên kết'}.
Mỗi biến thể hãy bắt đầu bằng: [BIẾN THỂ X] (với X là 1, 2, 3...).
Nội dung bài viết gốc:
"""
${baseContent}
"""`;

      // Tìm khung nhập văn bản của Gemini (contenteditable hoặc textarea)
      const inputSelector = 'div[role="textbox"], rich-textarea p, textarea, div[contenteditable="true"]';
      await page.waitForSelector(inputSelector, { timeout: 15000 });
      const inputEl = await page.$(inputSelector);

      if (!inputEl) {
        throw new Error('Không tìm thấy khung nhập liệu trên Gemini Web.');
      }

      await inputEl.click();
      await Humanize.randomDelay(600, 1000);

      // Gõ nội dung prompt
      await page.keyboard.insertText(prompt);
      await Humanize.randomDelay(800, 1500);

      // Bấm gửi (nút gửi hoặc nhấn Enter)
      const sendButton = await page.$('button[aria-label*="Send"], button[aria-label*="Gửi"], button.send-button');
      if (sendButton) {
        await sendButton.click();
      } else {
        await page.keyboard.press('Enter');
      }

      console.log('[Gemini Web Bot] Đã gửi prompt, đang chờ Gemini tạo phản hồi...');

      // Chờ Gemini sinh câu trả lời hoàn tất (khoảng 8 - 18 giây)
      await Humanize.randomDelay(9000, 14000);

      // Lấy câu trả lời cuối cùng
      const responseText = await page.evaluate(() => {
        // Lấy các khối tin nhắn của mô hình
        const messageBlocks = document.querySelectorAll('message-content, .model-response-text, div[data-test-id="model-response"]');
        if (messageBlocks.length > 0) {
          const last = messageBlocks[messageBlocks.length - 1];
          return last.textContent || '';
        }
        return document.body.innerText || '';
      });

      await context.close().catch(() => {});

      // Phân tách các biến thể từ câu trả lời
      const parsedVariants = this.parseVariants(responseText, baseContent, count);
      if (parsedVariants.length > 0) {
        return parsedVariants;
      }

      return this.generateSmartFallbackVariants(baseContent, count, originalEntities);
    } catch (err: any) {
      console.warn('[Gemini Web Bot] Lỗi khi thao tác với Gemini Web, sử dụng bộ sinh dự phòng:', err.message);
      if (context) {
        await context.close().catch(() => {});
      }
      return this.generateSmartFallbackVariants(baseContent, count, originalEntities);
    }
  }

  /**
   * Tách câu trả lời thành danh sách biến thể
   */
  private parseVariants(rawText: string, baseContent: string, count: number): string[] {
    const rawChunks = rawText.split(/\[BIẾN THỂ\s*\d+\]|Biến thể\s*\d+[:.]/i);
    const valid: string[] = [];

    for (const chunk of rawChunks) {
      const clean = chunk.trim();
      if (clean.length > 30) {
        if (EntityLock.validateLockedEntities(baseContent, clean)) {
          valid.push(clean);
        }
      }
    }

    // Nếu có biến thể trích xuất được
    if (valid.length > 0) {
      while (valid.length < count) {
        valid.push(this.createVariantVariation(baseContent, valid.length + 1));
      }
      return valid.slice(0, count);
    }

    return [];
  }

  /**
   * Bộ sinh biến thể dự phòng thông minh bảo đảm 100% Entity-Lock
   */
  private generateSmartFallbackVariants(baseContent: string, count: number, _entities: any): string[] {
    const prefixes = [
      '📢 [TUYỂN DỤNG / CƠ HỘI MỚI]',
      '⭐ THÔNG BÁO QUAN TRỌNG:',
      '🔥 CƠ HỘI HỢP TÁC HẤP DẪN:',
      '✨ [TIN NỔI BẬT HÔM NAY]',
      '⚡ CẬP NHẬT MỚI NHẤT:',
      '💼 [TÌM KIẾM ĐỒNG ĐỘI TÀI NĂNG]',
      '🎯 THÔNG TIN ĐẶC BIỆT DÀNH CHO BẠN:',
      '🚀 KHÁM PHÁ CƠ HỘI ĐỘT PHÁ:',
      '🌟 [CHIA SẺ CƠ HỘI NGHỀ NGHIỆP]',
      '📩 TIN NHẮN DÀNH RIÊNG CHO BẠN:',
    ];

    const suffixes = [
      '👉 Hãy nhanh tay liên hệ ngay hôm nay để không bỏ lỡ!',
      '📞 Chi tiết xin vui lòng kết nối trực tiếp với chúng tôi!',
      '✨ Trao đổi thêm thông tin cụ thể qua tin nhắn hoặc hotline.',
      '📩 Đừng ngần ngại để lại phản hồi để được hỗ trợ tốt nhất!',
      '🤝 Chúc quý đối tác và bạn bè một ngày làm việc hiệu quả!',
      '💬 Nhắn tin trực tiếp để nhận thông tin chi tiết và quyền lợi hấp dẫn.',
      '🔔 Số lượng có hạn, ưu tiên các bạn chủ động liên hệ sớm!',
      '💎 Cơ hội vàng không nên bỏ lỡ, hãy kết nối ngay với chúng tôi!',
    ];

    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[i % prefixes.length];
      const suffix = suffixes[i % suffixes.length];
      results.push(`${prefix}\n${baseContent}\n${suffix}`);
    }
    return results;
  }

  private createVariantVariation(baseContent: string, index: number): string {
    const prefixes = [
      '🔥 [Cập nhật mới] ',
      '⭐ [Thông tin hấp dẫn] ',
      '📢 [Thông báo tuyển dụng] ',
      '✨ [Tin nổi bật trong ngày] ',
      '🚀 [Cơ hội hợp tác] ',
    ];
    return `${prefixes[(index - 1) % prefixes.length]}${baseContent}`;
  }
}
