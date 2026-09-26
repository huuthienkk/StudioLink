import path from 'path';
import fs from 'fs';
import { getProfilesDir } from '../paths';

/**
 * Quản lý profile trình duyệt: Mỗi tài khoản một thư mục profile riêng biệt, lưu phiên đăng nhập
 */
export class ProfileManager {
  private baseStorageDir: string;

  constructor(baseDir?: string) {
    const target = (process.env.APP_TARGET || 'linkedin').toLowerCase();
    this.baseStorageDir = baseDir || getProfilesDir(target);
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }

  getProfilePath(accountId: string): string {
    const profilePath = path.join(this.baseStorageDir, `profile_${accountId}`);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    return profilePath;
  }

  clearSession(accountId: string): void {
    const profilePath = this.getProfilePath(accountId);
    if (fs.existsSync(profilePath)) {
      fs.rmSync(profilePath, { recursive: true, force: true });
    }
  }
}
