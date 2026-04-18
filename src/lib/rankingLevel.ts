import type { RankingLevel, RankingMember } from "../types";

const LEGACY_TO_LEVEL: Record<string, RankingLevel> = {
  khá: "Yo",
  kha: "Yo",
  "trung bình": "Lo",
  "trung binh": "Lo",
  yếu: "Nè",
  yeu: "Nè",
  giỏi: "Yo",
  gioi: "Yo",
};

const LEVEL_ORDER: Record<RankingLevel, number> = {
  Yo: 0,
  Lo: 1,
  Nè: 2,
};

export function normalizeRankingLevel(
  level: string | null | undefined,
): RankingLevel {
  const value = String(level || "").trim();
  if (value === "Yo" || value === "Lo" || value === "Nè") return value;

  const normalized = value.toLocaleLowerCase("vi");
  return LEGACY_TO_LEVEL[normalized] || "Lo";
}

export function getRankingLevelDisplay(level: RankingLevel): string {
  if (level === "Yo") return "Yo";
  if (level === "Lo") return "Lo";
  return "Nè";
}

export function getRankingLevelBadgeClassName(level: RankingLevel): string {
  if (level === "Yo") {
    return "border border-green-200 bg-green-100 text-green-800";
  }
  if (level === "Lo") {
    return "border border-blue-200 bg-blue-100 text-blue-800";
  }
  return "border border-yellow-200 bg-yellow-100 text-yellow-800";
}

export function sortMembersByLevelAndName<
  T extends Pick<RankingMember, "name" | "level">,
>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
  });
}
