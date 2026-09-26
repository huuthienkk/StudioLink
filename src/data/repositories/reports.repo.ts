import { getDatabase } from '../db';
import { ReportRecord } from '../../shared/types';

export class ReportsRepository {
  private get db() {
    return getDatabase();
  }

  getAll(): ReportRecord[] {
    return this.db.prepare(`
      SELECT id, campaign_id as campaignId, platform, account_id as accountId,
             target_identifier as targetIdentifier, status, message, timestamp
      FROM reports
      ORDER BY timestamp DESC
    `).all() as unknown as ReportRecord[];
  }

  getReportsByCampaign(campaignId: string): ReportRecord[] {
    return this.db.prepare(`
      SELECT id, campaign_id as campaignId, platform, account_id as accountId,
             target_identifier as targetIdentifier, status, message, timestamp
      FROM reports
      WHERE campaign_id = ?
      ORDER BY timestamp DESC
    `).all(campaignId) as unknown as ReportRecord[];
  }

  insert(record: ReportRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO reports (id, campaign_id, platform, account_id, target_identifier, status, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.campaignId,
      record.platform,
      record.accountId,
      record.targetIdentifier,
      record.status,
      record.message || null,
      record.timestamp || new Date().toISOString()
    );
  }

  getStatsByCampaign(campaignId: string): { total: number; success: number; failed: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM reports
      WHERE campaign_id = ?
    `).get(campaignId) as any;

    return {
      total: Number(row?.total || 0),
      success: Number(row?.success || 0),
      failed: Number(row?.failed || 0),
    };
  }

  /**
   * Lấy số lượng hành động thành công trong ngày hôm nay của tài khoản từ CSDL
   * Đảm bảo tính toán độc lập với RAM, không bị mất trạng thái khi khởi động lại app
   */
  getTodayCountByAccount(accountId: string): number {
    const todayStr = new Date().toISOString().slice(0, 10);
    const row = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE account_id = ?
        AND status = 'success'
        AND (DATE(timestamp) = DATE('now') OR timestamp LIKE ?)
    `).get(accountId, `${todayStr}%`) as any;

    return Number(row?.count || 0);
  }

  /**
   * Lấy số lượng hành động thành công trong ngày hôm nay của chiến dịch từ CSDL
   */
  getTodayCountByCampaign(campaignId: string): number {
    const todayStr = new Date().toISOString().slice(0, 10);
    const row = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE campaign_id = ?
        AND status = 'success'
        AND (DATE(timestamp) = DATE('now') OR timestamp LIKE ?)
    `).get(campaignId, `${todayStr}%`) as any;

    return Number(row?.count || 0);
  }
}
