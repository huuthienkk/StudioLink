import { getDatabase } from '../db';
import { PlatformType } from '../../shared/types';

export interface GroupRecord {
  id: string;
  platform: PlatformType;
  targetKeyword?: string;
  name: string;
  url: string;
  memberCount: number;
  scannedAt: string;
}

export class GroupsRepository {
  private get db() {
    return getDatabase();
  }

  getAll(platform?: PlatformType): GroupRecord[] {
    if (platform) {
      return this.db.prepare(`
        SELECT id, platform, target_keyword as targetKeyword, name, url,
               member_count as memberCount, scanned_at as scannedAt
        FROM groups
        WHERE platform = ?
        ORDER BY scanned_at DESC
      `).all(platform) as unknown as GroupRecord[];
    }

    return this.db.prepare(`
      SELECT id, platform, target_keyword as targetKeyword, name, url,
             member_count as memberCount, scanned_at as scannedAt
      FROM groups
      ORDER BY scanned_at DESC
    `).all() as unknown as GroupRecord[];
  }

  insertOrIgnore(group: GroupRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO groups (id, platform, target_keyword, name, url, member_count, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.platform,
      group.targetKeyword || null,
      group.name,
      group.url,
      group.memberCount || 0,
      group.scannedAt || new Date().toISOString()
    );
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  }
}
