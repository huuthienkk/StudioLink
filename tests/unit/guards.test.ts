import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationGuards } from '../../src/core/engine/guards';
import { StealthManager } from '../../src/core/browser/stealth';

describe('Automation Guards & Stealth Unit Test', () => {
  it('ngắt tiến trình khẩn cấp khi phát hiện Checkpoint', () => {
    assert.equal(AutomationGuards.shouldAbortOnCheckpoint(false), false);
    assert.equal(AutomationGuards.shouldAbortOnCheckpoint(true), true);
  });

  it('ngắt tiến trình khi Proxy bị chết', () => {
    assert.equal(AutomationGuards.shouldAbortOnDeadProxy(true), false);
    assert.equal(AutomationGuards.shouldAbortOnDeadProxy(false), true);
  });

  it('ngắt tiến trình khi gặp 3 lỗi liên tiếp để chống đánh dấu Spam', () => {
    assert.equal(AutomationGuards.shouldAbortOnConsecutiveFailures(0, 3), false);
    assert.equal(AutomationGuards.shouldAbortOnConsecutiveFailures(1, 3), false);
    assert.equal(AutomationGuards.shouldAbortOnConsecutiveFailures(2, 3), false);
    assert.equal(AutomationGuards.shouldAbortOnConsecutiveFailures(3, 3), true);
    assert.equal(AutomationGuards.shouldAbortOnConsecutiveFailures(5, 3), true);
  });

  it('StealthManager sinh tham số Chromium chứa cờ chống lộ IP WebRTC khi dùng proxy', () => {
    const argsNoProxy = StealthManager.getChromiumArgs(false);
    assert.ok(argsNoProxy.includes('--disable-blink-features=AutomationControlled'));
    assert.ok(!argsNoProxy.includes('--enforce-webrtc-ip-permission-check'));

    const argsProxy = StealthManager.getChromiumArgs(true);
    assert.ok(argsProxy.includes('--disable-blink-features=AutomationControlled'));
    assert.ok(argsProxy.includes('--enforce-webrtc-ip-permission-check'));
    assert.ok(argsProxy.includes('--force-webrtc-ip-handling-policy=disable_non_proxied_udp'));
  });

  it('Humanize sinh Persona sinh trắc học riêng biệt và xác định theo từng accountId', async () => {
    const { Humanize } = await import('../../src/core/browser/humanize');
    const p1 = Humanize.getPersonaForAccount('acc_user_1');
    const p2 = Humanize.getPersonaForAccount('acc_user_2');
    assert.ok(p1.typingSpeedMultiplier > 0);
    assert.ok(p2.typingSpeedMultiplier > 0);
    // 2 account khác nhau sẽ có đặc tính khác nhau
    assert.notDeepEqual(p1, p2);
  });
});
