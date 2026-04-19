import { Glicko2 } from "glicko2";
import type { AdvancedStats, Match, Member } from "../components/ranking/types";

const DEFAULT_TAU = 0.5;
const DEFAULT_PENALTY_COEFFICIENT = 0.3;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOL = 0.06;
const SCALE = 173.7178;

type ParsedSet = {
  score1: number;
  score2: number;
  minutes: number | null;
};

export type RankingComputationSettings = {
  tau?: number;
  penaltyCoefficient?: number;
};

type PlayerStatsAccumulator = {
  id: number;
  name: string;
  wins: number;
  totalMatches: number;
  recentMatchCount: number;
  monthlyActivity: Map<string, number>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, diff: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + diff, 1);
}

function parsePlayedAt(match: Match): Date {
  const raw = match.playedAt || match.date;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const legacy =
    /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})\s+([0-9]{2}):([0-9]{2})$/.exec(raw);
  if (!legacy) return new Date();

  const dd = Number.parseInt(legacy[1], 10);
  const mm = Number.parseInt(legacy[2], 10);
  const yyyy = Number.parseInt(legacy[3], 10);
  const hh = Number.parseInt(legacy[4], 10);
  const min = Number.parseInt(legacy[5], 10);
  return new Date(yyyy, mm - 1, dd, hh, min);
}

function parseSet(setValue: string): ParsedSet | null {
  const trimmed = String(setValue || "").trim();
  if (!trimmed) return null;

  const [scorePart, minutesPart] = trimmed.split("@");
  const scoreBits = scorePart.split("-");
  if (scoreBits.length !== 2) return null;

  const score1 = Number.parseInt(scoreBits[0], 10);
  const score2 = Number.parseInt(scoreBits[1], 10);
  if (!Number.isFinite(score1) || !Number.isFinite(score2)) return null;

  const normalizedMinutes = String(minutesPart || "")
    .replace(/m(in)?$/i, "")
    .trim();
  const minutes = normalizedMinutes
    ? Number.parseInt(normalizedMinutes, 10)
    : null;

  return {
    score1,
    score2,
    minutes: Number.isFinite(minutes) && (minutes || 0) > 0 ? minutes : null,
  };
}

function calculateMatchOutcome(match: Match): {
  score1: number;
  score2: number;
  minutes: number;
} {
  const parsedSets = match.sets
    .map(parseSet)
    .filter((item): item is ParsedSet => !!item);
  const score1 = parsedSets.reduce((sum, set) => sum + set.score1, 0);
  const score2 = parsedSets.reduce((sum, set) => sum + set.score2, 0);
  const setMinutes = parsedSets.reduce(
    (sum, set) => sum + (set.minutes || 0),
    0,
  );
  const fallbackMinutes = Number.isFinite(match.durationMinutes)
    ? Math.max(0, Number(match.durationMinutes))
    : 0;

  return {
    score1,
    score2,
    minutes: setMinutes > 0 ? setMinutes : fallbackMinutes,
  };
}

function buildMonthlyPeriods(matches: Match[]): string[] {
  if (matches.length === 0) return [];
  const sorted = [...matches].sort(
    (a, b) => parsePlayedAt(a).getTime() - parsePlayedAt(b).getTime(),
  );
  const firstDate = getMonthStart(parsePlayedAt(sorted[0]));
  const lastDate = getMonthStart(parsePlayedAt(sorted[sorted.length - 1]));
  const periods: string[] = [];

  let cursor = firstDate;
  while (cursor.getTime() <= lastDate.getTime()) {
    periods.push(toMonthKey(cursor));
    cursor = addMonths(cursor, 1);
  }

  return periods;
}

export function calculateRankingStats(
  members: Member[],
  matches: Match[],
  settings?: RankingComputationSettings,
): AdvancedStats[] {
  const tau = Number.isFinite(settings?.tau)
    ? clamp(Number(settings?.tau), 0.3, 1.2)
    : DEFAULT_TAU;
  const penaltyCoefficient = Number.isFinite(settings?.penaltyCoefficient)
    ? clamp(Number(settings?.penaltyCoefficient), 0, 2)
    : DEFAULT_PENALTY_COEFFICIENT;

  const ranking = new Glicko2({
    tau,
    rating: DEFAULT_RATING,
    rd: DEFAULT_RD,
    vol: DEFAULT_VOL,
  });

  const playersByName = new Map<string, ReturnType<Glicko2["makePlayer"]>>();
  const accumulatorByName = new Map<string, PlayerStatsAccumulator>();

  for (const member of members) {
    const normalizedName = String(member.name || "").trim();
    if (!normalizedName) continue;

    playersByName.set(
      normalizedName,
      ranking.makePlayer(DEFAULT_RATING, DEFAULT_RD, DEFAULT_VOL),
    );
    accumulatorByName.set(normalizedName, {
      id: member.id,
      name: normalizedName,
      wins: 0,
      totalMatches: 0,
      recentMatchCount: 0,
      monthlyActivity: new Map<string, number>(),
    });
  }

  const sortedMatches = [...matches].sort(
    (a, b) => parsePlayedAt(a).getTime() - parsePlayedAt(b).getTime(),
  );
  const periodKeys = buildMonthlyPeriods(sortedMatches);
  const periodMatches = new Map<string, Match[]>();

  for (const match of sortedMatches) {
    const key = toMonthKey(parsePlayedAt(match));
    const current = periodMatches.get(key) || [];
    current.push(match);
    periodMatches.set(key, current);
  }

  const now = new Date();
  const recentThreshold = new Date(now);
  recentThreshold.setDate(recentThreshold.getDate() - 30);

  for (const periodKey of periodKeys) {
    const matchesInPeriod = periodMatches.get(periodKey) || [];
    const ratingMatches: Array<
      [
        ReturnType<Glicko2["makePlayer"]>,
        ReturnType<Glicko2["makePlayer"]>,
        number,
      ]
    > = [];

    for (const match of matchesInPeriod) {
      const { score1, score2, minutes } = calculateMatchOutcome(match);
      if (score1 === 0 && score2 === 0) continue;

      const team1 = match.team1
        .map((name) => String(name || "").trim())
        .filter(Boolean);
      const team2 = match.team2
        .map((name) => String(name || "").trim())
        .filter(Boolean);
      const playedAt = parsePlayedAt(match);
      const result = score1 === score2 ? 0.5 : score1 > score2 ? 1 : 0;
      const activityValue = minutes > 0 ? minutes : 1;

      for (const playerName of [...team1, ...team2]) {
        const acc = accumulatorByName.get(playerName);
        if (!acc) continue;

        acc.totalMatches += 1;
        if (playedAt.getTime() >= recentThreshold.getTime()) {
          acc.recentMatchCount += 1;
        }
        const currentMonthly = acc.monthlyActivity.get(periodKey) || 0;
        acc.monthlyActivity.set(periodKey, currentMonthly + activityValue);
      }

      if (result === 1) {
        for (const playerName of team1) {
          const acc = accumulatorByName.get(playerName);
          if (acc) acc.wins += 1;
        }
      } else if (result === 0) {
        for (const playerName of team2) {
          const acc = accumulatorByName.get(playerName);
          if (acc) acc.wins += 1;
        }
      }

      for (const name1 of team1) {
        const p1 = playersByName.get(name1);
        if (!p1) continue;
        for (const name2 of team2) {
          const p2 = playersByName.get(name2);
          if (!p2) continue;
          ratingMatches.push([p1, p2, result]);
        }
      }
    }

    ranking.updateRatings(ratingMatches as never);
  }

  const periodCount = Math.max(1, periodKeys.length);
  const results: AdvancedStats[] = [];

  for (const member of members) {
    const normalizedName = String(member.name || "").trim();
    if (!normalizedName) continue;

    const player = playersByName.get(normalizedName);
    const acc = accumulatorByName.get(normalizedName);
    if (!player || !acc) continue;

    const rating = Number(player.getRating());
    const rd = Number(player.getRd());
    const vol = Number(player.getVol());
    const winRate = acc.totalMatches > 0 ? acc.wins / acc.totalMatches : 0;
    const totalActivity = [...acc.monthlyActivity.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const avgMonthlyActivity = totalActivity / periodCount;
    const recentActivity = acc.recentMatchCount;
    const motivation =
      avgMonthlyActivity > 0 ? recentActivity / avgMonthlyActivity : 0;
    const skillNorm = (rating - 1500) / SCALE;
    const uncertaintyNorm = rd / SCALE;
    const rankScore =
      skillNorm - uncertaintyNorm * vol * penaltyCoefficient * motivation;

    results.push({
      id: member.id,
      name: normalizedName,
      rating: Number(rating.toFixed(2)),
      rd: Number(rd.toFixed(2)),
      vol: Number(vol.toFixed(4)),
      skillNorm: Number(skillNorm.toFixed(4)),
      uncertaintyNorm: Number(uncertaintyNorm.toFixed(4)),
      rankScore: Number(rankScore.toFixed(4)),
      winRate: Number(winRate.toFixed(4)),
      motivation: Number(motivation.toFixed(4)),
      wins: acc.wins,
      totalMatches: acc.totalMatches,
    });
  }

  return results.sort((a, b) => b.rankScore - a.rankScore);
}
