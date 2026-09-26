import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../../src/data/db';
import { runMigrations } from '../../src/data/migrations';
import { AccountsRepository } from '../../src/data/repositories/accounts.repo';
import { CampaignsRepository } from '../../src/data/repositories/campaigns.repo';
import { ReportsRepository } from '../../src/data/repositories/reports.repo';

describe('Database Repositories Unit Test', () => {
  const accountsRepo = new AccountsRepository();
  const campaignsRepo = new CampaignsRepository();
  const reportsRepo = new ReportsRepository();

  before(async () => {
    await initDatabase();
    runMigrations();
  });

  it('phải thêm và lấy lại được tài khoản LinkedIn', () => {
    const testId = `acc_${Date.now()}`;
    accountsRepo.insert({
      id: testId,
      platform: 'linkedin',
      username: 'test_user_li',
      profileDir: `userData/profiles/profile_${testId}`,
      status: 'idle',
      createdAt: new Date().toISOString(),
    });

    const account = accountsRepo.getById(testId);
    assert.ok(account);
    assert.equal(account.username, 'test_user_li');
    assert.equal(account.platform, 'linkedin');

    accountsRepo.updateStatus(testId, 'active');
    const updated = accountsRepo.getById(testId);
    assert.equal(updated?.status, 'active');

    accountsRepo.delete(testId);
    assert.equal(accountsRepo.getById(testId), null);
  });


  it('phải lưu và lấy lại được chiến dịch LinkedIn kèm vị trí và số lượng kết nối', () => {
    const accId = `acc_li_${Date.now()}`;
    accountsRepo.insert({
      id: accId,
      platform: 'linkedin',
      username: 'test_recruiter',
      profileDir: `userData/profiles/profile_${accId}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const campId = `camp_li_${Date.now()}`;
    campaignsRepo.insert({
      id: campId,
      name: 'Tuyển Dụng CEO HCM',
      platform: 'linkedin',
      accountId: accId,
      status: 'draft',
      scheduleConfig: {
        dailyLimit: 30,
        allowedTimeWindows: [],
        intervalDelaySeconds: { min: 25, max: 60 },
      },
      targetKeywords: ['CEO'],
      targetLocation: 'Ho Chi Minh',
      maxConnections: 50,
      templateContent: 'Chào {name}, kết nối với mình nhé!',
      generatedVariants: ['Chào {name}, kết nối với mình nhé!'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const campaign = campaignsRepo.getById(campId);
    assert.ok(campaign);
    assert.equal(campaign.platform, 'linkedin');
    assert.equal(campaign.targetLocation, 'Ho Chi Minh');
    assert.equal(campaign.maxConnections, 50);
    assert.equal(campaign.targetKeywords[0], 'CEO');

    // Dọn dẹp
    campaignsRepo.delete(campId);
    accountsRepo.delete(accId);
    assert.equal(campaignsRepo.getById(campId), null);
  });

  it('phải tính chính xác số lượng hành động thành công trong ngày hôm nay', () => {
    const accId = `acc_count_${Date.now()}`;
    const campId = `camp_count_${Date.now()}`;

    // Tạo account và campaign cha để thỏa mãn ràng buộc khóa ngoại
    accountsRepo.insert({
      id: accId,
      platform: 'linkedin',
      username: 'test_count_user',
      profileDir: `userData/profiles/profile_${accId}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    campaignsRepo.insert({
      id: campId,
      name: 'Chiến dịch Test Đếm',
      platform: 'linkedin',
      accountId: accId,
      status: 'running',
      scheduleConfig: {
        dailyLimit: 30,
        allowedTimeWindows: [],
        intervalDelaySeconds: { min: 25, max: 60 },
      },
      targetKeywords: ['HR'],
      templateContent: 'Hello',
      generatedVariants: ['Hello'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Ban đầu chưa có report nào
    assert.equal(reportsRepo.getTodayCountByAccount(accId), 0);

    // Ghi nhận 2 bản ghi thành công và 1 thất bại
    reportsRepo.insert({
      id: `rep_${Date.now()}_1`,
      campaignId: campId,
      platform: 'linkedin',
      accountId: accId,
      targetIdentifier: 'https://linkedin.com/in/test1',
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    reportsRepo.insert({
      id: `rep_${Date.now()}_2`,
      campaignId: campId,
      platform: 'linkedin',
      accountId: accId,
      targetIdentifier: 'https://linkedin.com/in/test2',
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    reportsRepo.insert({
      id: `rep_${Date.now()}_3`,
      campaignId: campId,
      platform: 'linkedin',
      accountId: accId,
      targetIdentifier: 'https://linkedin.com/in/test3',
      status: 'failed',
      timestamp: new Date().toISOString(),
    });

    // Chỉ đếm thành công trong ngày
    assert.equal(reportsRepo.getTodayCountByAccount(accId), 2);
    assert.equal(reportsRepo.getTodayCountByCampaign(campId), 2);

    // Dọn dẹp
    campaignsRepo.delete(campId);
    accountsRepo.delete(accId);
  });
});
