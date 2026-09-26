import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';

export type UpdateState = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateProgressPayload {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateStatusPayload {
  state: UpdateState;
  version?: string;
  releaseNotes?: string;
  message?: string;
  progress?: UpdateProgressPayload;
}

export class UpdateManager {
  private static instance: UpdateManager;
  private mainWindow: BrowserWindow | null = null;
  private currentState: UpdateStatusPayload = {
    state: 'idle',
    version: app?.getVersion ? app.getVersion() : '1.0.0',
  };

  private constructor() {
    this.setupAutoUpdater();
  }

  public static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager();
    }
    return UpdateManager.instance;
  }

  public setWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private updateState(payload: Partial<UpdateStatusPayload>): void {
    this.currentState = { ...this.currentState, ...payload };
    this.sendToRenderer('updater:status', this.currentState);
  }

  private setupAutoUpdater(): void {
    if (!app?.getVersion) {
      console.log('[AutoUpdater] Môi trường ngoài Electron: Bỏ qua nạp autoUpdater.');
      return;
    }

    // Ghi nhật ký tiến trình cập nhật
    autoUpdater.logger = console;

    // Tự động tải ngầm khi phát hiện phiên bản mới
    autoUpdater.autoDownload = true;

    // Tự động cài đặt khi người dùng thoát ứng dụng nếu chưa khởi động lại ngay
    autoUpdater.autoInstallOnAppQuit = true;

    // Bắt các sự kiện vòng đời cập nhật
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Đang kiểm tra bản cập nhật mới trên GitHub Releases...');
      this.updateState({ state: 'checking', message: 'Đang kiểm tra bản cập nhật mới...' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log(`[AutoUpdater] Phát hiện phiên bản mới: v${info.version}. Bắt đầu tự động tải ngầm...`);
      this.updateState({
        state: 'available',
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
        message: `Phát hiện phiên bản mới v${info.version}! Hệ thống đang tự động tải ngầm...`,
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log(`[AutoUpdater] Ứng dụng đang ở phiên bản mới nhất: v${info.version}`);
      this.updateState({
        state: 'not-available',
        version: info.version,
        message: 'Bạn đang sử dụng phiên bản mới nhất.',
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      console.log(`[AutoUpdater] Tiến độ tải: ${percent}% (${(progressObj.bytesPerSecond / 1024).toFixed(1)} KB/s)`);
      this.updateState({
        state: 'downloading',
        progress: {
          percent: percent,
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
        },
        message: `Đang tải bản cập nhật: ${percent}%...`,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log(`[AutoUpdater] Đã tải xong phiên bản v${info.version}! Sẵn sàng cài đặt.`);
      this.updateState({
        state: 'downloaded',
        version: info.version,
        message: `Đã tải xong bản cập nhật v${info.version}! Bấm 'Khởi động lại ngay' để áp dụng.`,
      });
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Lỗi cập nhật:', err?.message || err);
      this.updateState({
        state: 'error',
        message: `Lỗi cập nhật: ${err?.message || 'Không thể kết nối đến máy chủ phát hành.'}`,
      });
    });
  }

  /**
   * Kích hoạt kiểm tra cập nhật
   */
  public async checkForUpdates(): Promise<UpdateStatusPayload> {
    if (!app?.isPackaged) {
      console.log('[AutoUpdater] Môi trường Development: Bỏ qua kiểm tra thực tế.');
      this.updateState({
        state: 'not-available',
        message: 'Môi trường phát triển (Development): Bạn đang dùng mã nguồn mới nhất.',
      });
      return this.currentState;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (err: any) {
      console.error('[AutoUpdater] checkForUpdates exception:', err);
      this.updateState({
        state: 'error',
        message: `Không thể kiểm tra cập nhật: ${err?.message || 'Lỗi mạng'}`,
      });
    }

    return this.currentState;
  }

  /**
   * Khởi động lại và cài đặt bản cập nhật ngay lập tức
   */
  public restartAndInstall(): void {
    if (!app?.getVersion) return;
    console.log('[AutoUpdater] Đang đóng ứng dụng và tiến hành cập nhật...');
    autoUpdater.quitAndInstall(false, true);
  }

  public getCurrentStatus(): UpdateStatusPayload {
    return this.currentState;
  }
}

/**
 * Đăng ký các IPC channels xử lý Auto Update
 */
export function registerUpdaterIpc(mainWindow: BrowserWindow): void {
  const updater = UpdateManager.getInstance();
  updater.setWindow(mainWindow);

  // Lấy phiên bản hiện tại
  ipcMain.handle('updater:getVersion', () => {
    return app.getVersion();
  });

  // Lấy trạng thái hiện tại
  ipcMain.handle('updater:getStatus', () => {
    return updater.getCurrentStatus();
  });

  // Người dùng chủ động bấm nút "Kiểm tra cập nhật"
  ipcMain.handle('updater:check', async () => {
    return await updater.checkForUpdates();
  });

  // Người dùng bấm nút "Khởi động lại ngay"
  ipcMain.handle('updater:restartAndInstall', () => {
    updater.restartAndInstall();
  });
}
