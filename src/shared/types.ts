export type PlatformType = 'facebook' | 'linkedin';

export type AccountStatus = 'active' | 'checkpoint' | 'proxy_dead' | 'expired' | 'idle';

export type AccountTier = 'tier1_cold' | 'tier2_warming' | 'tier3_mature';

export interface Account {
  id: string;
  platform: PlatformType;
  username: string;
  encryptedPassword?: string;
  profileDir: string;
  proxyUrl?: string;
  status: AccountStatus;
  tier?: AccountTier;
  lastActiveAt?: string;
  createdAt: string;
}

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped' | 'error' | 'queued';

export interface ScheduleConfig {
  dailyLimit: number;
  hourlyLimit?: number;
  allowedTimeWindows: { start: string; end: string }[];
  intervalDelaySeconds: { min: number; max: number };
}

export interface TargetGroupItem {
  id: string;
  name: string;
  url: string;
  memberCount?: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: PlatformType;
  accountId: string;
  status: CampaignStatus;
  scheduleConfig: ScheduleConfig;
  targetKeywords: string[];
  targetGroups?: TargetGroupItem[];
  templateContent: string;
  mediaPaths?: string[];
  generatedVariants: string[];
  targetLocation?: string;
  secondDegreeOnly?: boolean;
  maxConnections?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignProgressEvent {
  campaignId: string;
  current: number;
  total: number;
  percent: number;
  currentGroupName?: string;
  status: 'posting' | 'cooldown' | 'completed' | 'paused' | 'stopped' | 'error';
  cooldownRemainingSeconds?: number;
  logMessage: string;
}

export interface ReportRecord {
  id: string;
  campaignId: string;
  platform: PlatformType;
  accountId: string;
  targetIdentifier: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  timestamp: string;
}
