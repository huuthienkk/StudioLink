import { getDatabase } from '../db';

export interface VariantEntity {
  id: string;
  campaignId: string;
  content: string;
  createdAt: string;
}

export class VariantsRepository {
  private get db() {
    return getDatabase();
  }

  getByCampaignId(campaignId: string): VariantEntity[] {
    return this.db.prepare(`
      SELECT id, campaign_id as campaignId, content, created_at as createdAt
      FROM variants
      WHERE campaign_id = ?
      ORDER BY id ASC
    `).all(campaignId) as unknown as VariantEntity[];
  }

  insert(variant: VariantEntity): void {
    this.db.prepare(`
      INSERT INTO variants (id, campaign_id, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(variant.id, variant.campaignId, variant.content, variant.createdAt || new Date().toISOString());
  }

  deleteByCampaign(campaignId: string): void {
    this.db.prepare('DELETE FROM variants WHERE campaign_id = ?').run(campaignId);
  }
}
