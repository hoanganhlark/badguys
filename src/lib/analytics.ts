import { createAuditEvent } from "./supabase";

export enum AnalyticsEventName {
  CalculateSession = "calculate_session",
  SaveSession = "save_session",
  RecordMatch = "record_match",
  SendTelegramNotification = "send_telegram_notification",
  RouteChange = "route_change",
}

export enum AnalyticsEventType {
  Event = "event",
  RouteChange = "route_change",
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
  FromPath = "from_path",
  ToPath = "to_path",
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
let latestUserProperties: Record<string, string | number | boolean | null> = {};
let latestPagePath = "";

function normalizeAnalyticsObject(
  input?: Record<string, AnalyticsScalar>,
): Record<string, string | number | boolean | null> {
  if (!input) return {};

  return Object.entries(input).reduce<
    Record<string, string | number | boolean | null>
  >((acc, [key, value]) => {
    if (value === undefined) return acc;
    if (value === null) {
      acc[key] = null;
      return acc;
    }
    if (typeof value === "string") {
      acc[key] = value;
      return acc;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      acc[key] = value;
      return acc;
    }
    if (typeof value === "boolean") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;
}

export function trackPageView(path: string): void {
  if (!path) return;
  latestPagePath = String(path).trim();
}

export function trackEvent(
  eventName: string,
  params?: AnalyticsEventParams,
): void {
  if (!initialized || !eventName) return;

  const normalizedParams = normalizeAnalyticsObject(
    params as Record<string, AnalyticsScalar> | undefined,
  );
  const pagePath =
    latestPagePath ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "");

  void createAuditEvent({
    eventName,
    eventType: AnalyticsEventType.Event,
    params: normalizedParams,
    userProperties: latestUserProperties,
    pagePath,
    mode: import.meta.env.MODE,
  }).catch((error) => {
    console.warn("Create audit event failed", error);
  });
}

export function trackRouteChange(fromPath: string, toPath: string): void {
  if (!initialized) return;

  const previousPath = String(fromPath || "").trim();
  const nextPath = String(toPath || "").trim();

  if (!nextPath || previousPath === nextPath) return;

  void createAuditEvent({
    eventName: AnalyticsEventName.RouteChange,
    eventType: AnalyticsEventType.RouteChange,
    params: {
      [AnalyticsParamKey.FromPath]: previousPath || null,
      [AnalyticsParamKey.ToPath]: nextPath,
    },
    userProperties: latestUserProperties,
    pagePath: nextPath,
    mode: import.meta.env.MODE,
  }).catch((error) => {
    console.warn("Create route-change audit event failed", error);
  });
}

export function setUserProperties(properties: UserProperties): void {
  const entries = Object.entries(properties).filter(([, value]) => {
    return value !== undefined && value !== null;
  });

  const normalizedProperties = normalizeAnalyticsObject(
    Object.fromEntries(entries) as Record<string, AnalyticsScalar>,
  );

  latestUserProperties = {
    ...latestUserProperties,
    ...normalizedProperties,
  };
}
