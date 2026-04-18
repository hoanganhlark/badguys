import type { Match, Member } from "../components/ranking/types";

const STORAGE_MEMBERS_KEY = "rankingMembers";
const STORAGE_MATCHES_KEY = "rankingMatches";

const DEFAULT_MEMBERS: Member[] = [
  { id: 1, name: "Nguyễn Văn A", level: "Khá" },
  { id: 2, name: "Trần Thị B", level: "Trung bình" },
  { id: 3, name: "Lê Văn C", level: "Giỏi" },
];

export function loadMembersFromStorage(): Member[] {
  try {
    const stored = localStorage.getItem(STORAGE_MEMBERS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_MEMBERS;
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function loadMatchesFromStorage(): Match[] {
  try {
    const stored = localStorage.getItem(STORAGE_MATCHES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Migrate old format (score1/score2) to new format (sets).
    return parsed.map((match: any) => {
      if (match.sets && Array.isArray(match.sets)) {
        return match as Match;
      }
      if (
        typeof match.score1 === "number" &&
        typeof match.score2 === "number"
      ) {
        return {
          ...match,
          sets: [`${match.score1}-${match.score2}`],
        } as Match;
      }
      return match as Match;
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
      level: "Trung bình",
    }));
}
