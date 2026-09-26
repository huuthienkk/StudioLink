import { Page, ElementHandle } from 'playwright-core';

export interface AccountPersona {
  typingSpeedMultiplier: number;
  mouseSteps: number;
  jitterMultiplier: number;
  hesitationRange: [number, number];
}

/**
 * Mô phỏng hành vi người thật mức cao nhất:
 * - Quỹ đạo chuột Bezier ngẫu nhiên (Realistic Mouse Curve)
 * - Click tự nhiên (Move -> Hover -> Pause -> Click)
 * - Gõ phím biến thiên tự nhiên, an toàn với Unicode / tiếng Việt
 * - Cuộn trang bằng bánh xe chuột thực (Mouse Wheel Event)
 * - Persona sinh trắc học riêng biệt cho từng tài khoản (Chống chữ ký trùng lặp)
 */
export class Humanize {
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sinh hồ sơ sinh trắc học riêng biệt (Persona) cho từng tài khoản:
   * Đảm bảo 100 tài khoản có phong cách thao tác chuột, tốc độ gõ và độ ngập ngừng hoàn toàn khác nhau.
   */
  static getPersonaForAccount(accountId: string): AccountPersona {
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
      hash = (hash << 5) - hash + accountId.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    const speedRatio = 0.85 + ((positiveHash % 40) / 100);
    const steps = 18 + (positiveHash % 9);
    const jitter = 0.7 + (((positiveHash >> 2) % 60) / 100);
    const minHesitation = 100 + (positiveHash % 100);
    const maxHesitation = minHesitation + 150 + ((positiveHash >> 3) % 150);

    return {
      typingSpeedMultiplier: speedRatio,
      mouseSteps: steps,
      jitterMultiplier: jitter,
      hesitationRange: [minHesitation, maxHesitation],
    };
  }

  static async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const baseMin = Math.min(minMs, maxMs);
    const baseMax = Math.max(minMs, maxMs);
    const delay = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    await this.sleep(delay);
  }

  /**
   * Thời gian nghỉ ngẫu nhiên mô phỏng người dùng suy nghĩ hoặc đọc nội dung (1.2 - 3.2 giây)
   */
  static async thinkingPause(): Promise<void> {
    await this.randomDelay(1200, 3200);
  }

  /**
   * Di chuyển chuột mô phỏng sinh trắc học người thật (Bio-mimetic Mouse Movement):
   * - Đường cong Bezier ngẫu nhiên
   * - Micro-tremors (rung lắc cơ học tự nhiên của tay người)
   * - Overshoot & Correction (vượt nhẹ đích rồi lướt về)
   */
  static async realisticMouseMove(page: Page, targetX: number, targetY: number, steps: number = 22): Promise<void> {
    try {
      const startX = Math.floor(Math.random() * 250) + 80;
      const startY = Math.floor(Math.random() * 250) + 80;

      // Xác suất 35% xuất hiện overshoot (lướt vượt đích một khoảng ngắn rồi chỉnh lại)
      const hasOvershoot = Math.random() < 0.35;
      const overshootX = hasOvershoot ? targetX + (Math.random() - 0.5) * 24 : targetX;
      const overshootY = hasOvershoot ? targetY + (Math.random() - 0.5) * 20 : targetY;

      // Điểm kiểm soát tạo độ cong tự nhiên
      const controlX = (startX + overshootX) / 2 + (Math.random() - 0.5) * 160;
      const controlY = (startY + overshootY) / 2 + (Math.random() - 0.5) * 160;

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        let x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * overshootX;
        let y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * overshootY;

        // Thêm micro-tremor (rung lắc sinh học ngẫu nhiên 0.5 - 2px)
        if (i < steps) {
          x += (Math.random() - 0.5) * 2.2;
          y += (Math.random() - 0.5) * 2.2;
        }

        await page.mouse.move(Math.round(x), Math.round(y));
        // Tốc độ di chuột chậm dần khi tới gần đích (Deceleration)
        const stepDelay = Math.floor(6 + (i / steps) * 14 + Math.random() * 6);
        await this.sleep(stepDelay);
      }

      // Nếu có overshoot, kéo nhẹ về tọa độ đích thực tế (Correction movement)
      if (hasOvershoot) {
        await this.randomDelay(40, 110);
        await page.mouse.move(Math.round(targetX), Math.round(targetY));
      }
    } catch {
      await page.mouse.move(targetX, targetY).catch(() => {});
    }
  }

  /**
   * Tương tác bấm chuột tự nhiên: Cuộn tới phần tử, di chuột sinh trắc học, ngập ngừng (hesitation) rồi click
   */
  static async clickElementNaturally(page: Page, element: ElementHandle): Promise<void> {
    await element.scrollIntoViewIfNeeded().catch(() => {});
    await this.randomDelay(350, 750);

    const box = await element.boundingBox().catch(() => null);
    if (box) {
      // Chọn điểm rơi ngẫu nhiên bên trong nút (phân phối gần tâm nhưng không cố định)
      const targetX = box.x + box.width * (0.28 + Math.random() * 0.44);
      const targetY = box.y + box.height * (0.28 + Math.random() * 0.44);

      await this.realisticMouseMove(page, targetX, targetY, 18);
      // Thời gian ngập ngừng sinh học trước khi click (Hesitation: 120ms - 320ms)
      await this.randomDelay(120, 320);
      await page.mouse.click(targetX, targetY, { delay: Math.floor(Math.random() * 55) + 45 });
    } else {
      await element.click();
    }
  }

  /**
   * Gõ phím chậm mô phỏng người thật:
   * Tốc độ gõ biến thiên tự nhiên theo nhịp điệu sinh học.
   * Chỉ mô phỏng typo ở ký tự Latin đơn giản, tránh phá vỡ ký tự tiếng Việt Unicode
   */
  static async typeSlowly(
    typeCharFn: (char: string) => Promise<void>,
    pressBackspaceFn: () => Promise<void>,
    text: string
  ): Promise<void> {
    const typoChars = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isAsciiLower = /^[a-z]$/.test(char);

      // Xác suất 4% mô phỏng gõ nhầm và sửa lại (chỉ áp dụng ký tự thường latin)
      if (Math.random() < 0.04 && isAsciiLower) {
        const randomTypo = typoChars[Math.floor(Math.random() * typoChars.length)];
        await typeCharFn(randomTypo);
        await this.randomDelay(180, 320);
        await pressBackspaceFn();
        await this.randomDelay(120, 240);
      }

      await typeCharFn(char);

      // Nếu gặp dấu chấm, phẩy hoặc xuống dòng thì dừng nghỉ tự nhiên
      if (char === '.' || char === ',' || char === '!' || char === '?') {
        await this.randomDelay(350, 750);
      } else if (char === ' ' || char === '\n') {
        await this.randomDelay(120, 280);
      } else {
        // Độ trễ phân phối Gaussian tự nhiên từ 45ms đến 145ms
        await this.randomDelay(45, 145);
      }
    }
  }

  /**
   * Cuộn trang tự nhiên bằng bánh xe chuột (Mouse Wheel) với gia tốc mượt
   */
  static async smoothScroll(
    scrollByFn: (y: number) => Promise<void>,
    totalDistance: number,
    page?: Page
  ): Promise<void> {
    let scrolled = 0;
    while (scrolled < totalDistance) {
      const remaining = totalDistance - scrolled;
      const step = Math.min(Math.floor(Math.random() * 100) + 50, remaining);
      scrolled += step;

      if (page) {
        await page.mouse.wheel(0, step).catch(async () => {
          await scrollByFn(step);
        });
      } else {
        await scrollByFn(step);
      }

      await this.randomDelay(80, 200);
    }
  }
}
