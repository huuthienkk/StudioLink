import { getDatabase } from '../db';
import { Campaign, CampaignStatus } from '../../shared/types';

export class CampaignsRepository {
  private get db() {
    return getDatabase();
  }

  private mapRow(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      platform: row.platform,
      accountId: row.account_id,
      status: row.status as CampaignStatus,
      scheduleConfig: JSON.parse(row.schedule_config || '{}'),
      targetKeywords: JSON.parse(row.target_keywords || '[]'),
      targetGroups: row.target_groups ? JSON.parse(row.target_groups) : undefined,
      templateContent: row.template_content,
      mediaPaths: row.media_paths ? JSON.parse(row.media_paths) : undefined,
      generatedVariants: JSON.parse(row.generated_variants || '[]'),
      targetLocation: row.target_location || undefined,
      maxConnections: row.max_connections ? Number(row.max_connections) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getAll(): Campaign[] {
    const rows = this.db.prepare(`
      SELECT c.*,
        COALESCE((
          SELECT json_group_array(content)
          FROM variants
          WHERE campaign_id = c.id
        ), '[]') as generated_variants
      FROM campaigns c
      ORDER BY c.created_at DESC
    `).all() as any[];

    return rows.map(r => this.mapRow(r));
  }

  getById(id: string): Campaign | null {
    const row = this.db.prepare(`
      SELECT c.*,
        COALESCE((
          SELECT json_group_array(content)
          FROM variants
          WHERE campaign_id = c.id
        ), '[]') as generated_variants
      FROM campaigns c
      WHERE c.id = ?
    `).get(id) as any;

    return row ? this.mapRow(row) : null;
  }

  insert(campaign: Campaign): void {
    const insertCampaign = this.db.prepare(`
      INSERT INTO campaigns (id, name, platform, account_id, status, schedule_config, target_keywords, target_groups, template_content, media_paths, target_location, max_connections, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVariant = this.db.prepare(`
      INSERT INTO variants (id, campaign_id, content)
      VALUES (?, ?, ?)
    `);

    insertCampaign.run(
      campaign.id,
      campaign.name,
      campaign.platform,
      campaign.accountId,
      campaign.status || 'draft',
      JSON.stringify(campaign.scheduleConfig),
      JSON.stringify(campaign.targetKeywords || []),
      campaign.targetGroups ? JSON.stringify(campaign.targetGroups) : null,
      campaign.templateContent,
      campaign.mediaPaths ? JSON.stringify(campaign.mediaPaths) : null,
      campaign.targetLocation || null,
      campaign.maxConnections || null,
      campaign.createdAt || new Date().toISOString()
    );

    if (campaign.generatedVariants && campaign.generatedVariants.length > 0) {
      for (let i = 0; i < campaign.generatedVariants.length; i++) {
        insertVariant.run(
          `${campaign.id}_v${i + 1}`,
          campaign.id,
          campaign.generatedVariants[i]
        );
      }
    }
  }

  update(campaign: Campaign): void {
    const updateCampaign = this.db.prepare(`
      UPDATE campaigns
      SET name = ?,
          account_id = ?,
          schedule_config = ?,
          target_keywords = ?,
          target_groups = ?,
          template_content = ?,
          media_paths = ?,
          target_location = ?,
          max_connections = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateCampaign.run(
      campaign.name,
      campaign.accountId,
      JSON.stringify(campaign.scheduleConfig),
      JSON.stringify(campaign.targetKeywords || []),
      campaign.targetGroups ? JSON.stringify(campaign.targetGroups) : null,
      campaign.templateContent,
      campaign.mediaPaths ? JSON.stringify(campaign.mediaPaths) : null,
      campaign.targetLocation || null,
      campaign.maxConnections || null,
      campaign.id
    );

    if (campaign.generatedVariants && campaign.generatedVariants.length > 0) {
      this.db.prepare('DELETE FROM variants WHERE campaign_id = ?').run(campaign.id);
      const insertVariant = this.db.prepare(`
        INSERT INTO variants (id, campaign_id, content)
        VALUES (?, ?, ?)
      `);
      for (let i = 0; i < campaign.generatedVariants.length; i++) {
        insertVariant.run(
          `${campaign.id}_v${Date.now()}_${i + 1}`,
          campaign.id,
          campaign.generatedVariants[i]
        );
      }
    }
  }

  updateStatus(id: string, status: CampaignStatus): void {
    this.db.prepare(`
      UPDATE campaigns
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  }
}
