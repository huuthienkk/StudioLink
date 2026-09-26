import { Page } from 'playwright-core';
import { Humanize } from '../../core/browser/humanize';
import { LI_SELECTORS } from './selectors';

/**
 * Module mô phỏng hành vi tự nhiên (Organic Behavior) trên LinkedIn:
 * - Ghé thăm và đọc Profile như người thật (chống bẫy "Tunnel Vision")
 * - Lướt Feed ngẫu nhiên giữa các đợt gửi kết nối (Organic Noise)
 */
export class OrganicActions {
  /**
   * Mô phỏng người dùng đọc hồ sơ ứng viên:
   * Cuộn xem phần Giới thiệu (About), Kinh nghiệm (Experience), dừng đọc 8 - 18s
   */
  static async simulateProfileReading(page: Page): Promise<void> {
    try {
      console.log('[Organic] Bắt đầu đọc hồ sơ ứng viên tự nhiên...');
      await Humanize.randomDelay(1800, 3200);

      // Cuộn xuống 400 - 850px để đọc phần About / Experience
      const scrollDistance = Math.floor(Math.random() * 450) + 400;
      await Humanize.smoothScroll(
        async (step) => {
          await page.evaluate((y) => window.scrollBy(0, y), step);
        },
        scrollDistance,
        page
      );

      // Dừng đọc từ 7 - 14 giây mô phỏng mắt người quét nội dung
      const readingTimeMs = Math.floor(Math.random() * 7000) + 7000;
      console.log(`[Organic] Đang dừng đọc tóm tắt và kinh nghiệm (${Math.round(readingTimeMs / 1000)}s)...`);
      
      // Thi thoảng di chuyển chuột nhẹ trong khi đọc
      const midWait = readingTimeMs / 2;
      await Humanize.sleep(midWait);
      const randomX = Math.floor(Math.random() * 400) + 200;
      const randomY = Math.floor(Math.random() * 300) + 250;
      await Humanize.realisticMouseMove(page, randomX, randomY, 12);
      await Humanize.sleep(readingTimeMs - midWait);

      // Cuộn nhẹ trở lại đầu trang hoặc khu vực chứa nút Connect
      await Humanize.smoothScroll(
        async (step) => {
          await page.evaluate((y) => window.scrollBy(0, y), -step);
        },
        Math.floor(scrollDistance * 0.7),
        page
      );
      await Humanize.randomDelay(800, 1600);
    } catch {
      // Bỏ qua lỗi cuộn nếu trang chưa tải xong
    }
  }

  /**
   * Lướt Newsfeed ngẫu nhiên (Organic Feed Wandering):
   * Chạy sau mỗi 3 - 5 lượt kết nối để tạo luồng telemetry đa dạng
   */
  static async wanderFeed(page: Page, durationSeconds: number = 25): Promise<void> {
    console.log(`[Organic] Nghỉ ngơi & lướt Newsfeed LinkedIn tự nhiên (${durationSeconds}s)...`);
    try {
      await page.goto(LI_SELECTORS.nav.feedUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await Humanize.randomDelay(2500, 4000);

      const endTime = Date.now() + durationSeconds * 1000;
      while (Date.now() < endTime) {
        // Cuộn ngẫu nhiên 300 - 600px
        const scrollStep = Math.floor(Math.random() * 300) + 300;
        await Humanize.smoothScroll(
          async (step) => {
            await page.evaluate((y) => window.scrollBy(0, y), step);
          },
          scrollStep,
          page
        );

        // Dừng xem bài viết từ 4 - 8 giây
        const postReadTime = Math.floor(Math.random() * 4000) + 4000;
        await Humanize.sleep(Math.min(postReadTime, Math.max(0, endTime - Date.now())));

        // Rê chuột ngẫu nhiên qua vùng bài viết
        const mouseX = Math.floor(Math.random() * 350) + 250;
        const mouseY = Math.floor(Math.random() * 300) + 200;
        await Humanize.realisticMouseMove(page, mouseX, mouseY, 10);
      }
      console.log('[Organic] Hoàn tất phiên lướt Newsfeed.');
    } catch (err) {
      console.warn('[Organic] Bỏ qua lỗi nhẹ khi lướt feed:', err);
    }
  }
}
