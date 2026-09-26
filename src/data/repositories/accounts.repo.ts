import { getDatabase } from '../db';
import { Account, AccountStatus, PlatformType } from '../../shared/types';

export class AccountsRepository {
  private get db() {
    return getDatabase();
  }

  getAll(): Account[] {
    const rows = this.db.prepare(`
      SELECT id, platform, username, encrypted_password as encryptedPassword,
             profile_dir as profileDir, proxy_url as proxyUrl, status,
             last_active_at as lastActiveAt, created_at as createdAt
      FROM accounts
      ORDER BY created_at DESC
    `).all() as unknown as Account[];

    return rows;
  }

  getById(id: string): Account | null {
    const row = this.db.prepare(`
      SELECT id, platform, username, encrypted_password as encryptedPassword,
             profile_dir as profileDir, proxy_url as proxyUrl, status,
             last_active_at as lastActiveAt, created_at as createdAt
      FROM accounts
      WHERE id = ?
    `).get(id) as unknown as Account | undefined;

    return row || null;
  }

  getByPlatform(platform: PlatformType): Account[] {
    return this.db.prepare(`
      SELECT id, platform, username, encrypted_password as encryptedPassword,
             profile_dir as profileDir, proxy_url as proxyUrl, status,
             last_active_at as lastActiveAt, created_at as createdAt
      FROM accounts
      WHERE platform = ?
      ORDER BY created_at DESC
    `).all(platform) as unknown as Account[];
  }

  insert(account: Account): void {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, platform, username, encrypted_password, profile_dir, proxy_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.id,
      account.platform,
      account.username,
      account.encryptedPassword || null,
      account.profileDir,
      account.proxyUrl || null,
      account.status || 'idle',
      account.createdAt || new Date().toISOString()
    );
  }

  updateStatus(id: string, status: AccountStatus): void {
    this.db.prepare(`
      UPDATE accounts
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);
  }

  updateProxy(id: string, proxyUrl?: string): void {
    this.db.prepare(`
      UPDATE accounts
      SET proxy_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(proxyUrl || null, id);
  }

  updateLastActive(id: string): void {
    this.db.prepare(`
      UPDATE accounts
      SET last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }
}
