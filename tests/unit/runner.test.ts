import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignRunner } from '../../src/core/engine/runner';

describe('CampaignRunner Concurrency Queue Unit Test', () => {
  it('phải khởi tạo singleton CampaignRunner với maxConcurrency mặc định là 3', () => {
    const runner = CampaignRunner.getInstance();
    assert.ok(runner);
    assert.equal(runner.getMaxConcurrency(), 3);
  });

  it('phải thay đổi và giới hạn được maxConcurrency an toàn trong khoảng 1-10', () => {
    const runner = CampaignRunner.getInstance();
    runner.setMaxConcurrency(5);
    assert.equal(runner.getMaxConcurrency(), 5);

    // Thử đặt số âm hoặc quá lớn
    runner.setMaxConcurrency(0);
    assert.equal(runner.getMaxConcurrency(), 1);

    runner.setMaxConcurrency(15);
    assert.equal(runner.getMaxConcurrency(), 10);

    // Trả về mặc định 3 luồng
    runner.setMaxConcurrency(3);
    assert.equal(runner.getMaxConcurrency(), 3);
  });

  it('phải theo dõi chính xác số lượng luồng đang chạy và độ dài hàng đợi ban đầu', () => {
    const runner = CampaignRunner.getInstance();
    assert.equal(runner.getActiveRunningCount(), 0);
    assert.equal(runner.getQueueLength(), 0);
  });
});
