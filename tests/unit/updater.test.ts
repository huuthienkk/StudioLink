import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateManager } from '../../src/main/updater/update-manager';

describe('Auto Updater Unit Test', () => {
  it('phải khởi tạo singleton UpdateManager hợp lệ', () => {
    const updater = UpdateManager.getInstance();
    assert.ok(updater);
    const status = updater.getCurrentStatus();
    assert.equal(status.state, 'idle');
    assert.ok(status.version);
  });

  it('phải xử lý an toàn khi gọi checkForUpdates trong môi trường development', async () => {
    const updater = UpdateManager.getInstance();
    const result = await updater.checkForUpdates();
    assert.equal(result.state, 'not-available');
    assert.ok(result.message?.includes('Môi trường phát triển'));
  });
});
