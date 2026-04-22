import type { AppConfig, EnvConfig } from "./types";

function getEnvNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

const defaultConfig: AppConfig = {
  femaleMax: getEnvNumber(import.meta.env.VITE_BADGUY_FEMALE_MAX, 60),
  tubePrice: getEnvNumber(import.meta.env.VITE_BADGUY_TUBE_PRICE, 290),
  setPrice: getEnvNumber(import.meta.env.VITE_BADGUY_SET_PRICE, 12),
  shuttlesPerTube: getEnvNumber(
    import.meta.env.VITE_BADGUY_SHUTTLES_PER_TUBE,
    12,
  ),
  roundResult: getEnvBoolean(import.meta.env.VITE_BADGUY_ROUND_RESULT, true),
  enableCourtCount: getEnvBoolean(
    import.meta.env.VITE_BADGUY_ENABLE_COURT_COUNT,
    true,
  ),
};

export const envConfig: EnvConfig = {
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || "",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  appVersion: import.meta.env.VITE_APP_VERSION || "v0.0.0",
  mode: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  defaultConfig,
};
