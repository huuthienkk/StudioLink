import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase } from '../data/db';
import { runMigrations } from '../data/migrations';
import { registerAccountsIpc } from './ipc/accounts.ipc';
import { registerCampaignsIpc } from './ipc/campaigns.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { LicenseManager } from './license/license-manager';
import { registerUpdaterIpc, UpdateManager } from './updater/update-manager';

let mainWindow: BrowserWindow | null = null;

const appTarget: 'facebook' | 'linkedin' = 'linkedin';
const appTitle = 'NexaLink - LinkedIn Recruiter Automation Hub';


async function loadApp(window: BrowserWindow) {
  const devUrl = `http://localhost:5173?target=${appTarget}`;
  const prodPath = path.join(__dirname, '../renderer/index.html');

  // Thử kết nối tới dev server Vite (nếu đang chạy dev)
  let connected = false;
  for (let i = 0; i < 10; i++) {
    try {
      await window.loadURL(devUrl);
      connected = true;
      console.log(`[Electron] Đã kết nối thành công với Vite Dev Server (${devUrl})`);
      break;
    } catch {
      // Đợi 500ms để Vite sẵn sàng
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Nếu không kết nối được Vite, nạp file tĩnh đã build
  if (!connected) {
    console.log('[Electron] Nạp giao diện từ bundle tĩnh:', prodPath);
    await window.loadFile(prodPath).catch((err) => {
      console.error('[Electron] Lỗi khi nạp giao diện tĩnh:', err);
    });
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: appTitle,
    backgroundColor: '#140a0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Ẩn thanh menu mặc định (File, Edit, View...) để giao diện chuẩn ứng dụng hiện đại
  mainWindow.removeMenu();

  await loadApp(mainWindow);
}

app.whenReady().then(async () => {
  try {
    console.log(`[Electron] Khởi động ứng dụng với Target: ${appTarget.toUpperCase()}`);

    // 1. Khởi chạy CSDL SQLite (WebAssembly) & Migrations theo target
    await initDatabase();
    runMigrations();
    console.log(`[Electron] Database migrations hoàn tất cho ${appTarget}.`);

    // 2. Kiểm tra bản quyền thiết bị
    const license = new LicenseManager();
    const licenseInfo = await license.verifyDevice();
    console.log(`[Electron] Xác thực bản quyền: Thiết bị ${licenseInfo.deviceId}, Hợp lệ: ${licenseInfo.isValid}, Hạng: ${licenseInfo.tier || 'standard'}`);

    // 3. Đăng ký IPC handler nhận diện target & bản quyền
    ipcMain.handle('app:getTarget', () => appTarget);
    ipcMain.handle('license:getInfo', async () => license.getOrVerify());
    ipcMain.handle('license:activate', async (_, key: string) => license.activateLicense(key));
    ipcMain.handle('license:verify', async () => license.verifyDevice());
    ipcMain.handle('license:deactivate', async () => license.deactivateLicense());

    // 4. Đăng ký các nhóm IPC nghiệp vụ
    registerAccountsIpc();
    registerCampaignsIpc();
    registerReportsIpc();
    console.log('[Electron] Toàn bộ IPC channels đã đăng ký.');

    // 5. Tạo cửa sổ chính
    await createWindow();

    if (mainWindow) {
      // 6. Đăng ký dịch vụ Auto-Updater
      registerUpdaterIpc(mainWindow);

      // Tự động kiểm tra bản cập nhật mới sau khi cửa sổ sẵn sàng
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          UpdateManager.getInstance().checkForUpdates().catch(() => {});
        }, 3000);
      });
    }
  } catch (err) {
    console.error('[Electron] Lỗi khởi động ứng dụng:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
