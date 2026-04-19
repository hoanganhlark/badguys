import ReactGA from "react-ga4";
import { envConfig } from "../env";

export enum AnalyticsEventName {
  CalculateSession = "calculate_session",
  SaveSession = "save_session",
  RecordMatch = "record_match",
  SendTelegramNotification = "send_telegram_notification",
}

export enum AnalyticsParamKey {
  PlayersCount = "players_count",
  MaleCount = "male_count",
  FemaleCount = "female_count",
  TotalFeeK = "total_fee_k",
  NotificationType = "notification_type",
  Status = "status",
  MatchType = "match_type",
  SetCount = "set_count",
  DurationMinutes = "duration_minutes",
}

export enum AnalyticsStatus {
  Success = "success",
  Failed = "failed",
}

export enum AnalyticsNotificationType {
  GuestVisit = "guest_visit",
  CopyClicked = "copy_clicked",
}

export enum AnalyticsUserPropertyKey {
  Username = "username",
  Role = "role",
  IsAuthenticated = "is_authenticated",
}

type AnalyticsScalar = string | number | boolean | null | undefined;
type AnalyticsEventParams =
  | Record<AnalyticsParamKey | string, AnalyticsScalar>
  | undefined;

type UserProperties = Record<
  AnalyticsUserPropertyKey | string,
  AnalyticsScalar
>;

let initialized = false;
const GA_MEASUREMENT_ID = envConfig.gaMeasurementId;

function canTrack(): boolean {
  return !!GA_MEASUREMENT_ID;
}

export function initAnalytics(): void {
  if (initialized || !canTrack()) return;

  ReactGA.initialize(GA_MEASUREMENT_ID, {
    gaOptions: {
      debug_mode: import.meta.env.MODE === "development",
    },
  });
  initialized = true;
}

export function trackPageView(path: string): void {
  if (!initialized || !path) return;

  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
}

export function trackEvent(
  eventName: string,
  params?: AnalyticsEventParams,
): void {
  if (!initialized || !eventName) return;

  ReactGA.event(eventName, params);
}

export function setUserProperties(properties: UserProperties): void {
  if (!initialized) return;

  const entries = Object.entries(properties).filter(([, value]) => {
    return value !== undefined && value !== null;
  });

  if (entries.length === 0) return;

  ReactGA.set(Object.fromEntries(entries));
}
