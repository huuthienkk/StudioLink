import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Scheduler } from '../../src/core/engine/scheduler';

describe('Scheduler Unit Test', () => {
  it('chặn thực thi khi đã đạt giới hạn trong ngày', () => {
    const scheduler = new Scheduler({
      dailyLimit: 2,
      allowedTimeWindows: [],
      intervalDelaySeconds: { min: 1, max: 2 },
    });

    assert.equal(scheduler.canExecuteNow(), true);
    scheduler.recordExecution();
    assert.equal(scheduler.canExecuteNow(), true);
    scheduler.recordExecution();
    assert.equal(scheduler.canExecuteNow(), false);
  });

  it('khởi tạo với số lượng đã thực thi từ trước (khôi phục từ CSDL)', () => {
    // Giả lập tài khoản hôm nay đã gửi 25/30 kết nối
    const scheduler = new Scheduler({
      dailyLimit: 30,
      allowedTimeWindows: [],
      intervalDelaySeconds: { min: 1, max: 2 },
    }, 25);

    assert.equal(scheduler.getActionsExecutedToday(), 25);
    assert.equal(scheduler.getRemainingQuotaToday(), 5);
    assert.equal(scheduler.canExecuteNow(), true);

    // Gửi thêm 5 kết nối
    for (let i = 0; i < 5; i++) {
      scheduler.recordExecution();
    }

    assert.equal(scheduler.getRemainingQuotaToday(), 0);
    assert.equal(scheduler.canExecuteNow(), false);
  });

  it('tính toán delay ngẫu nhiên nằm trong khoảng cho phép', () => {
    const scheduler = new Scheduler({
      dailyLimit: 10,
      allowedTimeWindows: [],
      intervalDelaySeconds: { min: 3, max: 5 },
    });

    for (let i = 0; i < 5; i++) {
      const delayMs = scheduler.getNextDelayMs();
      assert.ok(delayMs >= 3000 && delayMs <= 5000);
    }
  });

  it('phải sinh các khung giờ nhịp sinh học (Circadian Windows) hợp lệ và rải rác', () => {
    const windows = Scheduler.generateCircadianWindows('acc_user_123');
    assert.equal(windows.length, 2);
    assert.ok(windows[0].start && windows[0].end);
    assert.ok(windows[1].start && windows[1].end);
  });
});
