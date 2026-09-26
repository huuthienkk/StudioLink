import path from 'path';
import fs from 'fs';

/**
 * Quản lý tập trung các đường dẫn dữ liệu an toàn cho ứng dụng NexaLink
 * Tự động chuyển đổi giữa Electron Main Process (Production) và môi trường Test / CLI
 */
export function getAppBaseUserDataDir(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron');
    const app = electron.app || electron.remote?.app;
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'NexaLinkData');
    }
  } catch {}

  return path.join(process.cwd(), 'userData');
}

export function getTargetDataDir(target: string = 'linkedin'): string {
  const baseDir = getAppBaseUserDataDir();
  const targetDir = path.join(baseDir, target.toLowerCase());
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

export function getProfilesDir(target: string = 'linkedin'): string {
  const targetDir = getTargetDataDir(target);
  const profilesDir = path.join(targetDir, 'profiles');
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  return profilesDir;
}

export function getExportsDir(): string {
  const baseDir = getAppBaseUserDataDir();
  const exportsDir = path.join(baseDir, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  return exportsDir;
}
