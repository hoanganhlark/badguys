import ReactGA from "react-ga4";
import { envConfig } from "../env";

type AnalyticsEventParams =
  | Record<string, string | number | boolean | undefined>
  | undefined;

type UserProperties = Record<
  string,
  string | number | boolean | null | undefined
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
