import type { AppConfig } from "../types";

const CONFIG_KEY = "badguyConfig";
const VISIT_DAY_KEY = "badguyVisitNotifiedDate";
const INPUT_DRAFT_KEY = "badguyInputDraft";

type InputDraft = {
  courtFeeInput: string;
  shuttleCountInput: string;
  courtCountInput: string;
  bulkInput: string;
};

const DEFAULT_INPUT_DRAFT: InputDraft = {
  courtFeeInput: "",
  shuttleCountInput: "",
  courtCountInput: "",
  bulkInput: "",
};

export function loadStoredConfig(defaultConfig: AppConfig): AppConfig {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return defaultConfig;

  try {
    const stored = JSON.parse(raw) as Partial<AppConfig>;
    return {
      femaleMax: Number(stored.femaleMax) || defaultConfig.femaleMax,
      tubePrice: Number(stored.tubePrice) || defaultConfig.tubePrice,
      setPrice: Number(stored.setPrice) || defaultConfig.setPrice,
      shuttlesPerTube: defaultConfig.shuttlesPerTube,
      roundResult:
        typeof stored.roundResult === "boolean"
          ? stored.roundResult
          : defaultConfig.roundResult,
      enableCourtCount:
        typeof stored.enableCourtCount === "boolean"
          ? stored.enableCourtCount
          : defaultConfig.enableCourtCount,
    };
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadStoredInputDraft(): InputDraft {
  const raw = localStorage.getItem(INPUT_DRAFT_KEY);
  if (!raw) return DEFAULT_INPUT_DRAFT;

  try {
    const stored = JSON.parse(raw) as Partial<InputDraft>;
    return {
      courtFeeInput:
        typeof stored.courtFeeInput === "string"
          ? stored.courtFeeInput
          : DEFAULT_INPUT_DRAFT.courtFeeInput,
      shuttleCountInput:
        typeof stored.shuttleCountInput === "string"
          ? stored.shuttleCountInput
          : DEFAULT_INPUT_DRAFT.shuttleCountInput,
      courtCountInput:
        typeof stored.courtCountInput === "string"
          ? stored.courtCountInput
          : DEFAULT_INPUT_DRAFT.courtCountInput,
      bulkInput:
        typeof stored.bulkInput === "string"
          ? stored.bulkInput
          : DEFAULT_INPUT_DRAFT.bulkInput,
    };
  } catch {
    return DEFAULT_INPUT_DRAFT;
  }
}

export function saveInputDraft(draft: InputDraft): void {
  localStorage.setItem(INPUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearInputDraft(): void {
  localStorage.removeItem(INPUT_DRAFT_KEY);
}

export function getLocalDateKey(dateValue?: Date): string {
  const current = dateValue || new Date();
  const yyyy = current.getFullYear();
  const mm = String(current.getMonth() + 1).padStart(2, "0");
  const dd = String(current.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatVisitTimestampUTC7(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const utc7Date = new Date(utcMs + 7 * 60 * 60000);
  const dd = String(utc7Date.getDate()).padStart(2, "0");
  const mm = String(utc7Date.getMonth() + 1).padStart(2, "0");
  const yyyy = utc7Date.getFullYear();
  const hh = String(utc7Date.getHours()).padStart(2, "0");
  const min = String(utc7Date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function parseDeviceNameFromUserAgent(userAgent: string): string {
  const ua = String(userAgent || "").toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android device";
  if (ua.includes("windows")) return "Windows device";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "Mac device";
  if (ua.includes("linux")) return "Linux device";
  return "Unknown device";
}

export async function getGuestDeviceName(): Promise<string> {
  try {
    const nav = window.navigator as Navigator & {
      userAgentData?: {
        platform?: string;
        getHighEntropyValues?: (
          hints: string[],
        ) => Promise<{ model?: string; platform?: string }>;
      };
    };

    if (!nav) return "Unknown device";

    const uaData = nav.userAgentData;
    if (uaData && typeof uaData.getHighEntropyValues === "function") {
      const values = await uaData.getHighEntropyValues(["model", "platform"]);
      const model = String(values.model || "").trim();
      const platform = String(values.platform || uaData.platform || "").trim();

      if (model && platform) return `${model} (${platform})`;
      if (model) return model;
      if (platform) return platform;
    }

    const platform = String(nav.platform || "").trim();
    if (platform) {
      const parsed = parseDeviceNameFromUserAgent(nav.userAgent);
      if (parsed === "Unknown device") return platform;
      return `${parsed} (${platform})`;
    }

    return parseDeviceNameFromUserAgent(nav.userAgent);
  } catch {
    return "Unknown device";
  }
}

export function shouldSendVisitNotificationToday(): boolean {
  const todayKey = getLocalDateKey();
  return localStorage.getItem(VISIT_DAY_KEY) !== todayKey;
}

export function markVisitNotifiedToday(): void {
  localStorage.setItem(VISIT_DAY_KEY, getLocalDateKey());
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}
