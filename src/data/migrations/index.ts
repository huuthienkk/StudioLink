import { getDatabase } from '../db';

/**
 * Hệ thống migration quản lý cấu trúc bảng CSDL SQLite
 */
export function runMigrations(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      encrypted_password TEXT,
      profile_dir TEXT NOT NULL,
      proxy_url TEXT,
      status TEXT DEFAULT 'idle',
      last_active_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      schedule_config TEXT NOT NULL,
      target_keywords TEXT,
      target_groups TEXT,
      template_content TEXT NOT NULL,
      media_paths TEXT,
      target_location TEXT,
      max_connections INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS variants (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      target_keyword TEXT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      member_count INTEGER DEFAULT 0,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_id TEXT NOT NULL,
      target_identifier TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_reports_campaign ON reports(campaign_id);
  `);

  // Nâng cấp cột cho CSDL đã tạo trước đó
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN target_groups TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN media_paths TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN target_location TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN max_connections INTEGER;`);
  } catch {}
}
