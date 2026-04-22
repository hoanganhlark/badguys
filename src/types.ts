export type Player = {
  name: string;
  isFemale: boolean;
  sets: number;
  customFee: number | null;
  extraFee: number | null;
};

export type AppConfig = {
  femaleMax: number;
  tubePrice: number;
  setPrice: number;
  shuttlesPerTube: number;
  roundResult: boolean;
  enableCourtCount: boolean;
};

export type CalcResult = {
  fFee: number;
  mFee: number;
  total: number;
  setTotal: number;
  setPlayersCount: number;
  femalesCount: number;
  malesCount: number;
  totalCustomFee: number;
  totalExtraFee: number;
};

export type SessionRecord = {
  id: string;
  dateKey?: string;
  summaryText?: string;
  courtFee?: number;
  courtCount?: number;
  shuttleCount?: number;
  shuttleFee?: number;
  total?: number;
  maleFee?: number;
  femaleFee?: number;
  femalesCount?: number;
  malesCount?: number;
  setPlayersCount?: number;
  players?: Array<{ name: string; isFemale: boolean; sets: number }>;
  clientUpdatedAt?: string;
};

export type SessionPayload = Omit<SessionRecord, "id">;

export type RankingLevel = string;

export type RankingMember = {
  id: number;
  name: string;
  level: RankingLevel;
};

export type RankingMatch = {
  id: number | string;
  type: "singles" | "doubles";
  team1: string[];
  team2: string[];
  sets: string[];
  date: string;
  playedAt?: string;
  durationMinutes?: number;
  createdBy?: string;
  createdByUsername?: string;
};

export type RankingMetricVisibility = {
  skill: boolean;
  consistency: boolean;
  confidence: boolean;
  winRate: boolean;
};

export type RankingSettings = {
  tau: number;
  penaltyCoefficient: number;
  metricVisibility: RankingMetricVisibility;
};

export type RankingCategory = {
  id: string;
  name: string;
  displayName: string;
  order: number;
  createdAt?: string;
};

export type RankingSnapshotEntry = {
  memberId: number;
  memberName: string;
  rank: number;
  rankScore: number;
};

export type RankingSnapshot = {
  id: string;
  createdAt?: string;
  ranks: RankingSnapshotEntry[];
};

export type UserRole = "admin" | "member";

export type AuthUser = {
  userId: string;
  username: string;
  role: UserRole;
};

export type UserRecord = {
  id: string;
  username: string;
  usernameKey: string;
  password: string;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
  isDisabled?: boolean;
};

export type MatchRecord = {
  id: string;
  playerA: string;
  playerB: string;
  score: string;
  playedAt?: string;
  durationMinutes?: number;
  createdBy: string;
  createdByUsername?: string;
  createdAt?: string;
};

export type AuditEventRecord = {
  id: string;
  eventName: string;
  eventType?: "event" | "route_change";
  params?: Record<string, string | number | boolean | null>;
  userProperties?: Record<string, string | number | boolean | null>;
  pagePath?: string;
  mode?: string;
  createdAt?: string;
};

export type EnvConfig = {
  gaMeasurementId: string;
  telegramBotToken: string;
  telegramGroupChatId: string;
  enableTelegramNotification: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  appVersion: string;
  mode: string;
  isDevelopment: boolean;
  isProduction: boolean;
  defaultConfig: AppConfig;
};
