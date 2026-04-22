import { Glicko2 } from "glicko2";
import type { AdvancedStats, Match, Member } from "../components/ranking/types";

// Glicko-2 parameters
const DEFAULT_TAU = 0.6;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOL = 0.06;
const SCALE = 173.7178;

// Penalty and motivation scaling
const DEFAULT_PENALTY_COEFFICIENT = 0.3;

// Multiplier parameters (per spec section 5)
const BETA = 0.3; // multiplier amplitude (1.0 → 1+BETA)
const MAX_POINTS = 21; // max points per set
const P_MIN_DEFAULT = 10; // P20 fallback (minutes)
const P_MAX_DEFAULT = 14; // P80 fallback (minutes)
const MIN_SETS_FOR_PERCENTILE = 30; // min recent sets to compute percentiles
const MAX_SETS_IN_WINDOW = 50; // max recent sets in percentile window

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

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, diff: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
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

// ─────────────────────────────────────────────────────────────────
// Multiplier calculation: intensity-weighted rating updates
// ─────────────────────────────────────────────────────────────────

function computePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function collectRecentSetMinutes(
  allSets: ParsedSet[][],
): number[] {
  const minutes: number[] = [];
  for (let i = Math.max(0, allSets.length - MAX_SETS_IN_WINDOW); i < allSets.length; i++) {
    for (const set of allSets[i]) {
      if (set.minutes && set.minutes > 0) {
        minutes.push(set.minutes);
      }
    }
  }
  return minutes.sort((a, b) => a - b);
}

function computeTimePercentiles(recentMinutes: number[]): { P20: number; P80: number } {
  if (recentMinutes.length < MIN_SETS_FOR_PERCENTILE) {
    return { P20: P_MIN_DEFAULT, P80: P_MAX_DEFAULT };
  }
  return {
    P20: computePercentile(recentMinutes, 20),
    P80: computePercentile(recentMinutes, 80),
  };
}

export function computeMultiplier(
  margin: number,
  timeMinutes: number | null,
  P20: number,
  P80: number,
): number {
  if (!timeMinutes || timeMinutes <= 0) return 1.0;
  const m = margin / MAX_POINTS;
  const t = clamp((timeMinutes - P20) / (P80 - P20), 0, 1);
  const T = t * (1 - m);
  return 1 + BETA * T;
}

// ─────────────────────────────────────────────────────────────────
// Virtual opponent: doubles aggregation
// ─────────────────────────────────────────────────────────────────

type GlickoPlayer = ReturnType<Glicko2["makePlayer"]>;

function createVirtualOpponent(p1: GlickoPlayer, p2: GlickoPlayer, ranking: Glicko2): GlickoPlayer {
  const avgRating = (Number(p1.getRating()) + Number(p2.getRating())) / 2;
  const rd1 = Number(p1.getRd());
  const rd2 = Number(p2.getRd());
  const combinedRd = Math.sqrt(rd1 * rd1 + rd2 * rd2);
  return ranking.makePlayer(avgRating, combinedRd, DEFAULT_VOL);
}

// ─────────────────────────────────────────────────────────────────
// Rating match builder: set-level match tuples
// ─────────────────────────────────────────────────────────────────

function buildRatingEntriesForSet(
  set: ParsedSet,
  team1: GlickoPlayer[],
  team2: GlickoPlayer[],
  P20: number,
  P80: number,
  ranking: Glicko2,
): Array<[GlickoPlayer, GlickoPlayer, number, number]> {
  const entries: Array<[GlickoPlayer, GlickoPlayer, number, number]> = [];
  const margin = Math.abs(set.score1 - set.score2);
  const multiplier = computeMultiplier(margin, set.minutes, P20, P80);

  if (set.score1 === set.score2) {
    return []; // no-score draws are skipped
  }

  const team1Won = set.score1 > set.score2;
  const score1 = team1Won ? 1 : 0;
  const score2 = team1Won ? 0 : 1;

  // For doubles: each player vs virtual opponent
  if (team2.length > 1) {
    const vOpp2 = createVirtualOpponent(team2[0], team2[1], ranking);
    for (const p1 of team1) {
      entries.push([p1, vOpp2, score1, multiplier]);
    }
  } else {
    // For singles: real opponent
    for (const p1 of team1) {
      entries.push([p1, team2[0], score1, multiplier]);
    }
  }

  // Symmetric: team2 vs virtual opponent of team1
  if (team1.length > 1) {
    const vOpp1 = createVirtualOpponent(team1[0], team1[1], ranking);
    for (const p2 of team2) {
      entries.push([p2, vOpp1, score2, multiplier]);
    }
  } else {
    // For singles: real opponent
    for (const p2 of team2) {
      entries.push([p2, team1[0], score2, multiplier]);
    }
  }

  return entries;
}

function buildDailyPeriods(matches: Match[]): string[] {
  if (matches.length === 0) return [];
  const sorted = [...matches].sort(
    (a, b) => parsePlayedAt(a).getTime() - parsePlayedAt(b).getTime(),
  );
  const firstDate = getDayStart(parsePlayedAt(sorted[0]));
  const lastDate = getDayStart(parsePlayedAt(sorted[sorted.length - 1]));
  const periods: string[] = [];

  let cursor = firstDate;
  while (cursor.getTime() <= lastDate.getTime()) {
    periods.push(toDayKey(cursor));
    cursor = addDays(cursor, 1);
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
  const periodKeys = buildDailyPeriods(sortedMatches);
  const periodMatches = new Map<string, Match[]>();

  for (const match of sortedMatches) {
    const key = toDayKey(parsePlayedAt(match));
    const current = periodMatches.get(key) || [];
    current.push(match);
    periodMatches.set(key, current);
  }

  const now = new Date();
  const recentThreshold = new Date(now);
  recentThreshold.setDate(recentThreshold.getDate() - 30);

  // Collect all parsed sets across entire history for percentile computation
  const allParsedSets: ParsedSet[][] = [];
  for (const match of sortedMatches) {
    const parsedSets = match.sets
      .map(parseSet)
      .filter((item): item is ParsedSet => !!item);
    allParsedSets.push(parsedSets);
  }

  for (const periodKey of periodKeys) {
    const matchesInPeriod = periodMatches.get(periodKey) || [];

    // Compute time percentiles once per period from all recent sets
    const recentMinutes = collectRecentSetMinutes(allParsedSets);
    const { P20, P80 } = computeTimePercentiles(recentMinutes);

    const ratingMatches: Array<
      [
        ReturnType<Glicko2["makePlayer"]>,
        ReturnType<Glicko2["makePlayer"]>,
        number,
        number,
      ]
    > = [];

    for (const match of matchesInPeriod) {
      const parsedSets = match.sets
        .map(parseSet)
        .filter((item): item is ParsedSet => !!item);

      if (parsedSets.length === 0) continue;

      const team1Names = match.team1
        .map((name) => String(name || "").trim())
        .filter(Boolean);
      const team2Names = match.team2
        .map((name) => String(name || "").trim())
        .filter(Boolean);

      const team1Players = team1Names
        .map((name) => playersByName.get(name))
        .filter((p): p is GlickoPlayer => !!p);
      const team2Players = team2Names
        .map((name) => playersByName.get(name))
        .filter((p): p is GlickoPlayer => !!p);

      if (team1Players.length === 0 || team2Players.length === 0) continue;

      const playedAt = parsePlayedAt(match);

      // Process each set individually
      for (const set of parsedSets) {
        if (set.score1 === 0 && set.score2 === 0) continue;

        const activityValue = set.minutes && set.minutes > 0 ? set.minutes : 1;

        // Update activity for all players in the match
        for (const playerName of [...team1Names, ...team2Names]) {
          const acc = accumulatorByName.get(playerName);
          if (!acc) continue;
          acc.totalMatches += 1;
          if (playedAt.getTime() >= recentThreshold.getTime()) {
            acc.recentMatchCount += 1;
          }
          const currentDaily = acc.monthlyActivity.get(periodKey) || 0;
          acc.monthlyActivity.set(periodKey, currentDaily + activityValue);
        }

        // Update wins based on set result
        if (set.score1 > set.score2) {
          for (const playerName of team1Names) {
            const acc = accumulatorByName.get(playerName);
            if (acc) acc.wins += 1;
          }
        } else if (set.score2 > set.score1) {
          for (const playerName of team2Names) {
            const acc = accumulatorByName.get(playerName);
            if (acc) acc.wins += 1;
          }
        }

        // Build rating entries with virtual opponent and multiplier
        const entries = buildRatingEntriesForSet(
          set,
          team1Players,
          team2Players,
          P20,
          P80,
          ranking,
        );
        ratingMatches.push(...entries);
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

  return results.sort((a, b) => b.rating - a.rating);
}
