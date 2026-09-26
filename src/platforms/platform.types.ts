export interface PlatformSession {
  isLoggedIn: boolean;
  username?: string;
  cookies?: Record<string, any>[];
  checkpointDetected?: boolean;
}

/**
 * Khuôn mẫu giao diện chung cho tất cả các nền tảng tự động hóa
 */
export interface IPlatformDriver {
  platformName: string;
  login(credentials: { username: string; password?: string }): Promise<boolean>;
  checkSession(): Promise<PlatformSession>;
  runCampaign(campaignConfig: any): Promise<void>;
  close(): Promise<void>;
}
