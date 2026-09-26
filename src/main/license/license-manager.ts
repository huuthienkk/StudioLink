import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getAppBaseUserDataDir } from '../../core/paths';
import { DEFAULT_SUPABASE_CONFIG } from './license-config';

export interface LicenseInfo {
  isValid: boolean;
  deviceId: string;
  licenseKey?: string;
  customerName?: string;
  expiresAt?: string;
  tier?: 'trial' | 'standard' | 'pro' | 'enterprise';
  errorMessage?: string;
  isActivated?: boolean;
}

export interface LocalLicenseData {
  licenseKey: string;
  deviceId: string;
  productId?: string;
  customerName?: string;
  tier: string;
  expiresAt?: string;
  activatedAt: string;
}

export class LicenseManager {
  private static cachedInfo: LicenseInfo | null = null;
  private productId = 'studio-link';
  private candidateProductIds = ['studio-link', 'nexalink', 'nexa-link', 'studio-linkedin', 'studio-fb'];

  private getLicenseFilePath(): string {
    return path.join(getAppBaseUserDataDir(), 'license.json');
  }

  private getConfigFilePath(): string {
    return path.join(getAppBaseUserDataDir(), 'supabase-config.json');
  }

  /**
   * Lấy cấu hình Supabase (URL và Anon Key)
   */
  public getSupabaseConfig(): { url: string; key: string } {
    let url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_CONFIG.url || '';
    let key = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_CONFIG.anonKey || '';

    const configPath = this.getConfigFilePath();
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (fileContent.url) url = fileContent.url;
        if (fileContent.key) key = fileContent.key;
      } catch {}
    }

    return { url, key };
  }

  /**
   * Lưu cấu hình Supabase
   */
  public saveSupabaseConfig(url: string, key: string): void {
    const configPath = this.getConfigFilePath();
    fs.writeFileSync(configPath, JSON.stringify({ url, key }, null, 2), 'utf-8');
  }

  /**
   * Tạo Hardware Device ID duy nhất từ thông số phần cứng máy tính (chuẩn STUDIO-XXXX)
   */
  getHardwareId(): string {
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'UnknownCPU';
    const networkInterfaces = os.networkInterfaces();

    let macAddress = '';
    for (const name of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[name];
      if (iface) {
        for (const alias of iface) {
          if (!alias.internal && alias.mac && alias.mac !== '00:00:00:00:00:00') {
            macAddress = alias.mac;
            break;
          }
        }
      }
      if (macAddress) break;
    }

    const rawId = `${os.hostname()}_${os.platform()}_${cpuModel}_${macAddress || 'default_mac'}`;
    const hash = crypto.createHash('sha256').update(rawId).digest('hex').substring(0, 16).toUpperCase();
    return `STUDIO-${hash}`;
  }

  private readLocalLicense(): LocalLicenseData | null {
    const licPath = this.getLicenseFilePath();
    if (!fs.existsSync(licPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(licPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private saveLocalLicense(data: LocalLicenseData): void {
    const licPath = this.getLicenseFilePath();
    const dir = path.dirname(licPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(licPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private clearLocalLicense(): void {
    const licPath = this.getLicenseFilePath();
    if (fs.existsSync(licPath)) {
      try {
        fs.unlinkSync(licPath);
      } catch {}
    }
    LicenseManager.cachedInfo = null;
  }

  /**
   * Lấy thông tin bản quyền hiện tại (từ cache hoặc verify)
   */
  async getOrVerify(): Promise<LicenseInfo> {
    if (LicenseManager.cachedInfo) {
      return LicenseManager.cachedInfo;
    }
    return this.verifyDevice();
  }

  /**
   * Xác thực bản quyền thiết bị (gọi khi khởi động app hoặc kiểm tra định kỳ)
   */
  async verifyDevice(): Promise<LicenseInfo> {
    const deviceId = this.getHardwareId();
    const local = this.readLocalLicense();

    // Nếu chưa có file license lưu trên máy
    if (!local || !local.licenseKey) {
      if (process.env.NODE_ENV === 'development' && !this.getSupabaseConfig().url) {
        const devInfo: LicenseInfo = {
          isValid: true,
          deviceId,
          tier: 'enterprise',
          expiresAt: '2099-12-31',
          isActivated: true,
          customerName: 'Developer Mode',
        };
        LicenseManager.cachedInfo = devInfo;
        return devInfo;
      }

      const noLic: LicenseInfo = {
        isValid: false,
        deviceId,
        isActivated: false,
        errorMessage: 'Chưa kích hoạt bản quyền. Vui lòng nhập mã License Key.',
      };
      LicenseManager.cachedInfo = noLic;
      return noLic;
    }

    // Nếu có license lưu trên máy, xác thực với Supabase qua RPC
    const { url, key } = this.getSupabaseConfig();
    if (!url || !key) {
      // Không có Supabase URL, fallback kiểm tra ngày hết hạn offline
      const isExpired = local.expiresAt ? new Date() > new Date(local.expiresAt) : false;
      const offlineInfo: LicenseInfo = {
        isValid: !isExpired,
        deviceId,
        licenseKey: local.licenseKey,
        customerName: local.customerName,
        expiresAt: local.expiresAt,
        tier: local.tier as any,
        isActivated: true,
        errorMessage: isExpired ? 'Bản quyền đã hết hạn.' : undefined,
      };
      LicenseManager.cachedInfo = offlineInfo;
      return offlineInfo;
    }

    try {
      const candidates = local.productId ? [local.productId] : this.candidateProductIds;
      let verifySuccess = false;
      let verifyData: any = null;

      for (const prodId of candidates) {
        const response = await fetch(`${url}/rest/v1/rpc/verify_license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            p_product_id: prodId,
            p_license_key: local.licenseKey,
            p_hwid: deviceId,
          }),
        });

        const data = await response.json() as any;
        if (data?.success) {
          verifySuccess = true;
          verifyData = data;
          break;
        } else {
          verifyData = data;
          if (data?.code && data.code !== 'NOT_FOUND') {
            break;
          }
        }
      }

      if (verifySuccess && verifyData) {
        const info: LicenseInfo = {
          isValid: true,
          deviceId,
          licenseKey: local.licenseKey,
          customerName: verifyData.customer_name || local.customerName,
          tier: verifyData.tier || 'standard',
          expiresAt: verifyData.expires_at || local.expiresAt,
          isActivated: true,
        };
        LicenseManager.cachedInfo = info;
        return info;
      } else {
        const info: LicenseInfo = {
          isValid: false,
          deviceId,
          licenseKey: local.licenseKey,
          isActivated: true,
          errorMessage: verifyData?.message || 'Bản quyền không hợp lệ.',
        };
        LicenseManager.cachedInfo = info;
        return info;
      }
    } catch (err: any) {
      // Lỗi mạng: cho phép dùng offline dựa trên hạn dùng đã lưu
      const isExpired = local.expiresAt ? new Date() > new Date(local.expiresAt) : false;
      const fallbackInfo: LicenseInfo = {
        isValid: !isExpired,
        deviceId,
        licenseKey: local.licenseKey,
        customerName: local.customerName,
        expiresAt: local.expiresAt,
        tier: local.tier as any,
        isActivated: true,
        errorMessage: isExpired ? 'Bản quyền đã hết hạn.' : undefined,
      };
      LicenseManager.cachedInfo = fallbackInfo;
      return fallbackInfo;
    }
  }

  /**
   * Kích hoạt bản quyền mới từ giao diện người dùng
   */
  async activateLicense(licenseKey: string): Promise<LicenseInfo> {
    const deviceId = this.getHardwareId();
    const cleanKey = licenseKey.trim().toUpperCase();

    if (!cleanKey) {
      return {
        isValid: false,
        deviceId,
        isActivated: false,
        errorMessage: 'Vui lòng nhập mã bản quyền.',
      };
    }

    const { url, key } = this.getSupabaseConfig();
    if (!url || !key) {
      const localData: LocalLicenseData = {
        licenseKey: cleanKey,
        deviceId,
        tier: 'standard',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date().toISOString(),
      };
      this.saveLocalLicense(localData);
      const info: LicenseInfo = {
        isValid: true,
        deviceId,
        licenseKey: cleanKey,
        tier: 'standard',
        expiresAt: localData.expiresAt,
        isActivated: true,
      };
      LicenseManager.cachedInfo = info;
      return info;
    }

    try {
      console.log(`[License] Đang kích hoạt key ${cleanKey} cho thiết bị ${deviceId}...`);
      let successData: any = null;
      let lastErrorMessage = '';
      let matchedProductId = this.productId;

      for (const prodId of this.candidateProductIds) {
        const response = await fetch(`${url}/rest/v1/rpc/activate_license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            p_product_id: prodId,
            p_license_key: cleanKey,
            p_hwid: deviceId,
          }),
        });

        const data = await response.json() as any;
        if (data?.success) {
          successData = data;
          matchedProductId = prodId;
          break;
        } else {
          lastErrorMessage = data?.message || 'Kích hoạt thất bại.';
          if (data?.code && data.code !== 'NOT_FOUND') {
            break;
          }
        }
      }

      if (successData) {
        const localData: LocalLicenseData = {
          licenseKey: cleanKey,
          deviceId,
          productId: matchedProductId,
          customerName: successData.customer_name || '',
          tier: successData.tier || 'standard',
          expiresAt: successData.expires_at,
          activatedAt: new Date().toISOString(),
        };
        this.saveLocalLicense(localData);

        const info: LicenseInfo = {
          isValid: true,
          deviceId,
          licenseKey: cleanKey,
          customerName: successData.customer_name,
          tier: successData.tier || 'standard',
          expiresAt: successData.expires_at,
          isActivated: true,
        };
        LicenseManager.cachedInfo = info;
        return info;
      } else {
        return {
          isValid: false,
          deviceId,
          isActivated: false,
          errorMessage: lastErrorMessage || 'Mã kích hoạt không tồn tại hoặc không hợp lệ.',
        };
      }
    } catch (err: any) {
      return {
        isValid: false,
        deviceId,
        isActivated: false,
        errorMessage: `Không thể kết nối đến máy chủ xác thực: ${err.message}`,
      };
    }
  }

  /**
   * Hủy kích hoạt trên máy này (Unbind HWID) để người dùng chuyển sang máy khác
   */
  async deactivateLicense(): Promise<{ success: boolean; message: string }> {
    const local = this.readLocalLicense();
    const deviceId = this.getHardwareId();

    if (!local || !local.licenseKey) {
      return { success: true, message: 'Chưa có bản quyền nào trên máy này.' };
    }

    const { url, key } = this.getSupabaseConfig();
    if (url && key) {
      try {
        const candidates = local.productId ? [local.productId] : this.candidateProductIds;
        for (const prodId of candidates) {
          await fetch(`${url}/rest/v1/rpc/unbind_license`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key,
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
              p_product_id: prodId,
              p_license_key: local.licenseKey,
              p_hwid: deviceId,
            }),
          });
        }
      } catch {}
    }

    this.clearLocalLicense();
    return { success: true, message: 'Đã hủy liên kết máy thành công! Bạn có thể kích hoạt key trên máy tính khác.' };
  }
}
