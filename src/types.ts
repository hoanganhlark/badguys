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

export type RankingLevel = "Yo" | "Lo" | "Nè";

export type RankingMember = {
  id: number;
  name: string;
  level: RankingLevel;
};

export type RankingMatch = {
  id: number;
  type: "singles" | "doubles";
  team1: string[];
  team2: string[];
  sets: string[];
  date: string;
};

export type EnvConfig = {
  telegramBotToken: string;
  telegramGroupChatId: string;
  enableTelegramNotification: boolean;
  firebaseApiKey: string;
  firebaseProjectId: string;
  appVersion: string;
  defaultConfig: AppConfig;
};
