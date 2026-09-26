import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LicenseManager } from '../../src/main/license/license-manager';

describe('License Manager Unit Test', () => {
  const licenseManager = new LicenseManager();

  it('sinh mã phần cứng (Hardware ID) chuẩn định dạng STUDIO-XXXX', () => {
    const hwid = licenseManager.getHardwareId();
    assert.ok(hwid);
    assert.ok(hwid.startsWith('STUDIO-'));
    assert.equal(hwid.length, 23); // 'STUDIO-' (7) + 16 hex chars
  });

  it('từ chối kích hoạt khi mã bản quyền để trống', async () => {
    const res = await licenseManager.activateLicense('');
    assert.equal(res.isValid, false);
    assert.ok(res.errorMessage?.includes('Vui lòng nhập mã bản quyền'));
  });

  it('đọc được cấu hình Supabase Cloud mặc định', () => {
    const config = licenseManager.getSupabaseConfig();
    assert.ok(config.url);
    assert.ok(config.key);
    assert.ok(config.url.includes('supabase.co'));
  });
});
