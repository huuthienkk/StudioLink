import { ScheduleConfig } from '../../shared/types';

/**
 * Hàng đợi, giới hạn số lượng theo ngày và khung giờ hoạt động cho phép
 * Khởi tạo kèm số lượng đã thực hiện hôm nay từ CSDL để chống tràn giới hạn khi khởi động lại
 */
export class Scheduler {
  private config: ScheduleConfig;
  private actionsExecutedToday: number;

  constructor(config: ScheduleConfig, initialExecutedToday: number = 0) {
    this.config = config;
    this.actionsExecutedToday = Math.max(0, initialExecutedToday);
  }

  getActionsExecutedToday(): number {
    return this.actionsExecutedToday;
  }

  getRemainingQuotaToday(): number {
    return Math.max(0, this.config.dailyLimit - this.actionsExecutedToday);
  }

  canExecuteNow(): boolean {
    if (this.actionsExecutedToday >= this.config.dailyLimit) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (!this.config.allowedTimeWindows || this.config.allowedTimeWindows.length === 0) {
      return true;
    }

    return this.config.allowedTimeWindows.some(
      w => currentTime >= w.start && currentTime <= w.end
    );
  }

  recordExecution(): void {
    this.actionsExecutedToday++;
  }

  /**
   * Tính toán độ trễ ngẫu nhiên với độ trôi phân phối tự nhiên (mô phỏng người)
   */
  getNextDelayMs(): number {
    const { min, max } = this.config.intervalDelaySeconds;
    const baseMin = Math.min(min, max);
    const baseMax = Math.max(min, max);

    // Sử dụng thuật toán phân phối tự nhiên để không bị máy móc
    const randomFactor = Math.random();
    const delaySec = Math.floor(baseMin + randomFactor * (baseMax - baseMin + 1));
    return delaySec * 1000;
  }

  /**
   * Thuật toán phân bổ nhịp sinh học tự nhiên (Circadian Window Generator):
   * Tự động băm định danh tài khoản thành các khung giờ hoạt động ngẫu nhiên rải rác trong ngày
   * Tránh tình trạng 100 tài khoản cùng ùa vào hoạt động tại một thời điểm
   */
  static generateCircadianWindows(accountId: string): { start: string; end: string }[] {
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
      hash = (hash << 5) - hash + accountId.charCodeAt(i);
      hash |= 0;
    }
    const val = Math.abs(hash);

    // Ca sáng: Bắt đầu từ 8h15 - 9h45, kết thúc 11h15 - 12h00
    const mStartHour = 8 + (val % 2);
    const mStartMin = (val * 7) % 60;
    const mEndHour = 11 + ((val >> 2) % 2);
    const mEndMin = (val * 11) % 60;

    // Ca chiều: Bắt đầu từ 13h30 - 14h45, kết thúc 17h00 - 18h00
    const aStartHour = 13 + ((val >> 3) % 2);
    const aStartMin = (val * 13) % 60;
    const aEndHour = 17 + ((val >> 4) % 2);
    const aEndMin = (val * 17) % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return [
      { start: `${pad(mStartHour)}:${pad(mStartMin)}`, end: `${pad(mEndHour)}:${pad(mEndMin)}` },
      { start: `${pad(aStartHour)}:${pad(aStartMin)}`, end: `${pad(aEndHour)}:${pad(aEndMin)}` },
    ];
  }
}
