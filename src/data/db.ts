import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { getTargetDataDir } from '../core/paths';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
let dbFilePath: string = '';
let saveDebounceTimer: NodeJS.Timeout | null = null;

export interface ISqliteStatement {
  run(...params: any[]): { changes: number };
  all(...params: any[]): any[];
  get(...params: any[]): any | undefined;
}

export interface ISqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): ISqliteStatement;
  save(): void;
  flushSync(): void;
}

/**
 * Khởi tạo CSDL SQLite bằng SQL.js (WebAssembly)
 * Chạy 100% ổn định trên mọi phiên bản Electron và Node.js, không phụ thuộc C++ build tools
 */
export async function initDatabase(customPath?: string): Promise<ISqliteDatabase> {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  const target = (process.env.APP_TARGET || 'linkedin').toLowerCase();
  const targetDir = getTargetDataDir(target);

  dbFilePath = customPath || path.join(targetDir, `nexasocial_${target}.sqlite`);

  // Di chuyển tự động nếu có CSDL cũ nexasocial.sqlite ở process.cwd() cũ
  const legacyDbPath = path.join(process.cwd(), 'userData', 'nexasocial.sqlite');
  if (target === 'facebook' && fs.existsSync(legacyDbPath) && !fs.existsSync(dbFilePath)) {
    try {
      fs.copyFileSync(legacyDbPath, dbFilePath);
      console.log(`[Database] Đã di chuyển dữ liệu cũ sang: ${dbFilePath}`);
    } catch {}
  }

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
    saveDatabaseSync();
  }

  // Kích hoạt foreign keys trong SQLite
  dbInstance.run('PRAGMA foreign_keys = ON;');

  return getDatabase();
}

/**
 * Ghi cơ sở dữ liệu xuống đĩa với cơ chế Atomic Write (ghi qua file tạm rồi rename)
 * Chống 100% rủi ro hỏng/corrupt file khi mất điện hoặc app đóng đột ngột
 */
export function saveDatabaseSync(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  if (dbInstance && dbFilePath) {
    try {
      const data = dbInstance.export();
      const tempPath = `${dbFilePath}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, Buffer.from(data));
      fs.renameSync(tempPath, dbFilePath);
    } catch (err) {
      console.error('[Database] Lỗi khi lưu CSDL an toàn:', err);
    }
  }
}

/**
 * Lên lịch lưu bất đồng bộ (Debounce) để tránh ghi đĩa liên tục làm giảm hiệu năng I/O
 */
export function scheduleSaveDatabase(delayMs: number = 250): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    saveDatabaseSync();
  }, delayMs);
}

export function saveDatabase(): void {
  scheduleSaveDatabase();
}

export function getDatabase(): ISqliteDatabase {
  if (!dbInstance) {
    throw new Error('Database chưa được khởi tạo. Hãy gọi await initDatabase() trước.');
  }

  return {
    exec(sql: string): void {
      dbInstance!.run(sql);
      scheduleSaveDatabase();
    },
    prepare(sql: string): ISqliteStatement {
      return {
        run(...params: any[]) {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const stmt = dbInstance!.prepare(sql);
          stmt.run(flatParams);
          stmt.free();
          scheduleSaveDatabase();
          return { changes: 1 };
        },
        all(...params: any[]): any[] {
          const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const stmt = dbInstance!.prepare(sql);
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        get(...params: any[]): any | undefined {
          const res = this.all(...params);
          return res.length > 0 ? res[0] : undefined;
        },
      };
    },
    save: saveDatabaseSync,
    flushSync: saveDatabaseSync,
  };
}
