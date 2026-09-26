import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityLock } from '../../src/core/ai/entity-lock';

describe('EntityLock Unit Test', () => {
  it('phải trích xuất và bảo vệ đúng SĐT, giá và link liên kết', () => {
    const original = 'Liên hệ ngay 0912345678 giá chỉ 200k tại https://example.com';
    const validVariant = 'Inbox ngay 0912345678 giá chỉ 200k xem chi tiết tại https://example.com nhé!';

    const validation = EntityLock.validate(original, validVariant);
    assert.equal(validation.isValid, true);
    assert.equal(validation.missingPhones.length, 0);
    assert.equal(validation.missingPrices.length, 0);
    assert.equal(validation.missingLinks.length, 0);
  });

  it('phải phát hiện khi biến thể AI làm mất số điện thoại', () => {
    const original = 'Liên hệ hotline 0987654321 giá 500.000đ tại https://shop.vn';
    const badVariant = 'Inbox page ngay để nhận giá 500.000đ tại https://shop.vn!';

    const validation = EntityLock.validate(original, badVariant);
    assert.equal(validation.isValid, false);
    assert.deepEqual(validation.missingPhones, ['0987654321']);
  });

  it('phải phát hiện khi biến thể AI làm mất giá tiền', () => {
    const original = 'Ưu đãi chỉ 350k duy nhất hôm nay tại https://shop.vn';
    const badVariant = 'Ưu đãi siêu hời duy nhất hôm nay tại https://shop.vn';

    const validation = EntityLock.validate(original, badVariant);
    assert.equal(validation.isValid, false);
    assert.equal(validation.missingPrices.length, 1);
  });
});
