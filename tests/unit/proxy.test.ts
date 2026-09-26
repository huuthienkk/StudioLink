import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProxyManager } from '../../src/core/browser/proxy';

describe('ProxyManager Unit Test', () => {
  const manager = new ProxyManager();

  it('phải parse đúng định dạng host:port:username:password', () => {
    const res = manager.parseProxy('1.2.3.4:8080:user:pass');
    assert.equal(res.host, '1.2.3.4');
    assert.equal(res.port, 8080);
    assert.equal(res.username, 'user');
    assert.equal(res.password, 'pass');
    assert.equal(res.protocol, 'http');
  });

  it('phải parse đúng định dạng username:password@host:port', () => {
    const res = manager.parseProxy('user:pass@192.168.1.1:9090');
    assert.equal(res.host, '192.168.1.1');
    assert.equal(res.port, 9090);
    assert.equal(res.username, 'user');
    assert.equal(res.password, 'pass');
  });

  it('phải parse đúng định dạng protocol://user:pass@host:port', () => {
    const res = manager.parseProxy('socks5://admin:secret@10.0.0.5:1080');
    assert.equal(res.protocol, 'socks5');
    assert.equal(res.host, '10.0.0.5');
    assert.equal(res.port, 1080);
    assert.equal(res.username, 'admin');
    assert.equal(res.password, 'secret');
  });

  it('phải phát hiện trùng lặp IP', () => {
    const ip = '114.119.1.5';
    assert.equal(manager.checkDuplicateIp(ip), false);
    assert.equal(manager.checkDuplicateIp(ip), true); // lần 2 trùng
    manager.releaseIp(ip);
    assert.equal(manager.checkDuplicateIp(ip), false); // giải phóng xong lại ok
  });

  it('phải tự động giải quyết vân tay địa lý an toàn (GeoFingerprint fallback)', async () => {
    const geo = await manager.resolveGeoFingerprint('127.0.0.1');
    assert.equal(geo.timezoneId, 'Asia/Ho_Chi_Minh');
    assert.equal(geo.locale, 'vi-VN');
  });

  it('phải kiểm tra hạn mức tài khoản trên cùng 1 IP (checkIpQuota)', () => {
    const quota = manager.checkIpQuota('1.2.3.4', 2);
    assert.equal(quota.isAllowed, true);
  });
});
