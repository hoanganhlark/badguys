import type { RankingLevel, RankingMember } from "../types";

const LEGACY_TO_LEVEL: Record<string, RankingLevel> = {
  "khá": "Yo",
  "kha": "Yo",
  "trung bình": "Lo",
  "trung binh": "Lo",
  "yếu": "Nè",
  "yeu": "Nè",
  "giỏi": "Yo",
  "gioi": "Yo",
};

const LEVEL_ORDER: Record<RankingLevel, number> = {
  Yo: 0,
  Lo: 1,
  "Nè": 2,
};

export function normalizeRankingLevel(level: string | null | undefined): RankingLevel {
  const value = String(level || "").trim();
  if (value === "Yo" || value === "Lo" || value === "Nè") return value;

  const normalized = value.toLocaleLowerCase("vi");
  return LEGACY_TO_LEVEL[normalized] || "Lo";
}

export function getRankingLevelDisplay(level: RankingLevel): string {
  if (level === "Yo") return "Yo (Khá)";
  if (level === "Lo") return "Lo (Trung Bình)";
  return "Nè (Yếu)";
}

export function sortMembersByLevelAndName<T extends Pick<RankingMember, "name" | "level">>(
  members: T[],
): T[] {
  return [...members].sort((a, b) => {
    const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
  });
}
