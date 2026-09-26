import http from 'http';
import https from 'https';

export interface ParsedProxy {
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyVerificationResult {
  isAlive: boolean;
  responseTimeMs?: number;
  ipDetected?: string;
  errorMessage?: string;
}

export interface GeoFingerprint {
  timezoneId: string;
  locale: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Đọc 4 định dạng proxy, kiểm tra trạng thái, cảnh báo trùng lặp IP
 * và tự động đồng bộ vân tay địa lý (Geo-Fingerprint Synchronizer)
 */
export class ProxyManager {
  private activeIps: Set<string> = new Set();
  private geoCache: Map<string, GeoFingerprint> = new Map();

  /**
   * Đọc 4 định dạng proxy:
   * 1. host:port
   * 2. host:port:username:password
   * 3. username:password@host:port
   * 4. protocol://username:password@host:port
   */
  parseProxy(rawProxy: string): ParsedProxy {
    const trimmed = rawProxy.trim();
    let protocol: ParsedProxy['protocol'] = 'http';
    let clean = trimmed;

    if (trimmed.includes('://')) {
      const parts = trimmed.split('://');
      protocol = parts[0].toLowerCase() as ParsedProxy['protocol'];
      clean = parts[1];
    }

    if (clean.includes('@')) {
      const [auth, server] = clean.split('@');
      const [username, password] = auth.split(':');
      const [host, port] = server.split(':');
      return { protocol, host, port: Number(port), username, password };
    }

    const segments = clean.split(':');
    if (segments.length === 2) {
      return { protocol, host: segments[0], port: Number(segments[1]) };
    }

    if (segments.length === 4) {
      return {
        protocol,
        host: segments[0],
        port: Number(segments[1]),
        username: segments[2],
        password: segments[3],
      };
    }

    throw new Error(`Định dạng proxy không hợp lệ: ${rawProxy}`);
  }

  formatProxyString(proxy: ParsedProxy): string {
    if (proxy.username && proxy.password) {
      return `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    }
    return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
  }

  checkDuplicateIp(ip: string): boolean {
    if (this.activeIps.has(ip)) {
      console.warn(`[Cảnh báo] Trùng IP Proxy: ${ip}`);
      return true;
    }
    this.activeIps.add(ip);
    return false;
  }

  releaseIp(ip: string): void {
    this.activeIps.delete(ip);
  }

  /**
   * Kiểm tra tính sẵn sàng của proxy qua HTTP CONNECT hoặc test request
   */
  async verifyProxy(proxy: ParsedProxy, timeoutMs: number = 5000): Promise<ProxyVerificationResult> {
    const startTime = Date.now();

    return new Promise<ProxyVerificationResult>((resolve) => {
      const req = http.request(
        {
          host: proxy.host,
          port: proxy.port,
          method: 'CONNECT',
          path: 'api.ipify.org:443',
          timeout: timeoutMs,
          headers: proxy.username && proxy.password
            ? {
                'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`,
              }
            : {},
        },
        () => {
          resolve({
            isAlive: true,
            responseTimeMs: Date.now() - startTime,
            ipDetected: proxy.host,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          isAlive: false,
          errorMessage: 'Hết thời gian chờ kết nối (Timeout)',
        });
      });

      req.on('error', (err) => {
        resolve({
          isAlive: false,
          errorMessage: err.message,
        });
      });

      req.end();
    });
  }

  /**
   * Tự động tra cứu và đồng bộ múi giờ, ngôn ngữ, tọa độ địa lý khớp với IP Proxy
   */
  async resolveGeoFingerprint(host: string): Promise<GeoFingerprint> {
    if (this.geoCache.has(host)) {
      return this.geoCache.get(host)!;
    }

    const defaultFingerprint: GeoFingerprint = {
      timezoneId: 'Asia/Ho_Chi_Minh',
      locale: 'vi-VN',
      country: 'Vietnam',
    };

    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      this.geoCache.set(host, defaultFingerprint);
      return defaultFingerprint;
    }

    try {
      const geo = await new Promise<GeoFingerprint>((resolve) => {
        const req = http.get(
          `http://ip-api.com/json/${host}?fields=status,country,countryCode,timezone,lat,lon`,
          { timeout: 3500 },
          (res) => {
            let rawData = '';
            res.on('data', (chunk) => {
              rawData += chunk;
            });
            res.on('end', () => {
              try {
                const data = JSON.parse(rawData);
                if (data.status === 'success' && data.timezone) {
                  const locale = data.countryCode === 'VN' ? 'vi-VN' : 'en-US';
                  resolve({
                    timezoneId: data.timezone,
                    locale,
                    country: data.country,
                    latitude: data.lat,
                    longitude: data.lon,
                  });
                  return;
                }
              } catch {}
              resolve(defaultFingerprint);
            });
          }
        );

        req.on('error', () => resolve(defaultFingerprint));
        req.on('timeout', () => {
          req.destroy();
          resolve(defaultFingerprint);
        });
      });

      this.geoCache.set(host, geo);
      return geo;
    } catch {
      this.geoCache.set(host, defaultFingerprint);
      return defaultFingerprint;
    }
  }

  /**
   * Kiểm tra và cưỡng chế quy tắc: Không cho phép vượt quá maxAccounts (mặc định 2) trên cùng 1 IP
   */
  checkIpQuota(ip: string, maxAccounts: number = 2): { isAllowed: boolean; currentCount: number } {
    const current = Array.from(this.activeIps).filter((item) => item === ip).length;
    return {
      isAllowed: current < maxAccounts,
      currentCount: current,
    };
  }
}
