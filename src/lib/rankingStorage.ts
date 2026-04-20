import type { Match, Member } from "../components/ranking/types";
import type { RankingSettings } from "../types";
import { normalizeRankingLevel } from "./rankingLevel";

const STORAGE_MEMBERS_KEY = "rankingMembers";
const STORAGE_MATCHES_KEY = "rankingMatches";
const STORAGE_RANKING_SETTINGS_KEY = "rankingSettings";

function normalizeStorageScope(scopeKey?: string): string {
  const normalized = String(scopeKey || "").trim();
  return normalized || "guest";
}

function getScopedRankingSettingsKey(scopeKey?: string): string {
  return `${STORAGE_RANKING_SETTINGS_KEY}:${normalizeStorageScope(scopeKey)}`;
}

const DEFAULT_MEMBERS: Member[] = [
  { id: 1, name: "Nguyễn Văn A", level: "Yo" },
  { id: 2, name: "Trần Thị B", level: "Lo" },
  { id: 3, name: "Lê Văn C", level: "Yo" },
];

export const DEFAULT_RANKING_SETTINGS: RankingSettings = {
  tau: 0.5,
  penaltyCoefficient: 0.3,
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    motivation: true,
    winRate: true,
  },
};

export function loadMembersFromStorage(): Member[] {
  try {
    const stored = localStorage.getItem(STORAGE_MEMBERS_KEY);
    const parsed: Member[] = stored ? JSON.parse(stored) : DEFAULT_MEMBERS;

    return parsed.map((member) => ({
      ...member,
      level: normalizeRankingLevel(member.level),
    }));
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function loadMatchesFromStorage(): Match[] {
  try {
    const stored = localStorage.getItem(STORAGE_MATCHES_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    // Migrate old format (score1/score2) to new format (sets).
    return parsed.map((match: unknown) => {
      const m = match as Record<string, unknown>;
      if (m.sets && Array.isArray(m.sets)) {
        return m as Match;
      }
      if (typeof m.score1 === "number" && typeof m.score2 === "number") {
        return {
          ...m,
          sets: [`${m.score1}-${m.score2}`],
        } as Match;
      }
      return m as Match;
    });
  } catch {
    return [];
  }
}

export function saveMembersToStorage(members: Member[]) {
  localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));
}

export function saveMatchesToStorage(matches: Match[]) {
  localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches));
}

export function loadRankingSettingsFromStorage(
  scopeKey?: string,
): RankingSettings {
  try {
    const stored =
      localStorage.getItem(getScopedRankingSettingsKey(scopeKey)) ||
      localStorage.getItem(STORAGE_RANKING_SETTINGS_KEY);
    if (!stored) return DEFAULT_RANKING_SETTINGS;

    const parsed = JSON.parse(stored);
    return {
      tau:
        Number.isFinite(parsed?.tau) && parsed.tau >= 0.3 && parsed.tau <= 1.2
          ? parsed.tau
          : DEFAULT_RANKING_SETTINGS.tau,
      penaltyCoefficient:
        Number.isFinite(parsed?.penaltyCoefficient) &&
        parsed.penaltyCoefficient >= 0
          ? parsed.penaltyCoefficient
          : DEFAULT_RANKING_SETTINGS.penaltyCoefficient,
      metricVisibility: {
        skill:
          typeof parsed?.metricVisibility?.skill === "boolean"
            ? parsed.metricVisibility.skill
            : DEFAULT_RANKING_SETTINGS.metricVisibility.skill,
        stability:
          typeof parsed?.metricVisibility?.stability === "boolean"
            ? parsed.metricVisibility.stability
            : DEFAULT_RANKING_SETTINGS.metricVisibility.stability,
        uncertainty:
          typeof parsed?.metricVisibility?.uncertainty === "boolean"
            ? parsed.metricVisibility.uncertainty
            : DEFAULT_RANKING_SETTINGS.metricVisibility.uncertainty,
        motivation:
          typeof parsed?.metricVisibility?.motivation === "boolean"
            ? parsed.metricVisibility.motivation
            : DEFAULT_RANKING_SETTINGS.metricVisibility.motivation,
        winRate:
          typeof parsed?.metricVisibility?.winRate === "boolean"
            ? parsed.metricVisibility.winRate
            : DEFAULT_RANKING_SETTINGS.metricVisibility.winRate,
      },
    };
  } catch {
    return DEFAULT_RANKING_SETTINGS;
  }
}

export function saveRankingSettingsToStorage(
  settings: RankingSettings,
  scopeKey?: string,
) {
  localStorage.setItem(
    getScopedRankingSettingsKey(scopeKey),
    JSON.stringify(settings),
  );
}

export function buildMembersFromMatches(matches: Match[]): Member[] {
  const uniqueNames = new Set<string>();

  for (const match of matches) {
    for (const name of [...match.team1, ...match.team2]) {
      const normalized = String(name || "").trim();
      if (normalized) uniqueNames.add(normalized);
    }
  }

  return [...uniqueNames]
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((name, index) => ({
      id: Date.now() + index,
      name,
      level: "Lo",
    }));
}
