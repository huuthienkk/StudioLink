import crypto from 'crypto';
import os from 'os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Mã hóa mật khẩu và dữ liệu nhạy cảm với khóa gắn liền thiết bị (Machine-bound encryption)
 * Tự động kết hợp entropy phần cứng để khóa không bao giờ bị dùng chung giữa các máy khác nhau
 */
export class SecurityCrypto {
  private secretKey: Buffer;

  constructor(customSecret?: string) {
    const baseSecret = customSecret || process.env.ENCRYPTION_SECRET_KEY || 'nexalink-secure-master-vault-2026';
    // Gắn liền khóa với thông tin phần cứng cục bộ
    const machineEntropy = `${os.hostname()}_${os.platform()}_${os.arch()}_${os.userInfo()?.username || 'user'}`;
    const compositeKey = `${baseSecret}::${machineEntropy}`;
    this.secretKey = crypto.scryptSync(compositeKey, 'nexalink-salt-fixed-salt-v2', 32);
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('hex');
  }

  decrypt(cipherHex: string): string {
    try {
      const buffer = Buffer.from(cipherHex, 'hex');
      const iv = buffer.subarray(0, IV_LENGTH);
      const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.secretKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
      // Fallback thử giải mã bằng khóa phiên bản cũ nếu có
      try {
        const legacyKey = crypto.scryptSync(process.env.ENCRYPTION_SECRET_KEY || 'default-secret-key-32-chars-ok!', 'salt', 32);
        const buffer = Buffer.from(cipherHex, 'hex');
        const iv = buffer.subarray(0, IV_LENGTH);
        const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv);
        decipher.setAuthTag(tag);
        return decipher.update(encrypted) + decipher.final('utf8');
      } catch {
        return '';
      }
    }
  }
}
