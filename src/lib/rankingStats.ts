import { Glicko2 } from "glicko2";
import type { AdvancedStats, Match, Member } from "../components/ranking/types";

// ─────────────────────────────────────────────────────────────────
// Configuration interface for ranking system
// ─────────────────────────────────────────────────────────────────

export interface RankingConfig {
  // Glicko-2 system parameters
  tau: number;
  rating: number;
  rd: number;
  vol: number;
  scale: number;
  // Multiplier intensity parameters
  beta: number;
  maxPoints: number;
  pMinDefault: number;
  pMaxDefault: number;
  minSetsForPercentile: number;
  maxSetsInWindow: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  tau: 0.6,
  rating: 1500,
  rd: 350,
  vol: 0.06,
  scale: 173.7178,
  beta: 0.3,
  maxPoints: 21,
  pMinDefault: 10,
  pMaxDefault: 14,
  minSetsForPercentile: 30,
  maxSetsInWindow: 50,
};

type ParsedSet = {
  score1: number;
  score2: number;
  minutes: number | null;
};

export type RankingComputationSettings = {
  tau?: number;
};

export type SimulationSettings = {
  tau?: number;
};

type PlayerStatsAccumulator = {
  id: number;
  name: string;
  wins: number;
  totalMatches: number;
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
  config: RankingConfig,
): number[] {
  const minutes: number[] = [];
  const startIdx = Math.max(0, allSets.length - config.maxSetsInWindow);
  for (let i = startIdx; i < allSets.length; i++) {
    for (const set of allSets[i]) {
      if (set.minutes && set.minutes > 0) {
        minutes.push(set.minutes);
      }
    }
  }
  return minutes.sort((a, b) => a - b);
}

function computeTimePercentiles(
  recentMinutes: number[],
  config: RankingConfig,
): { P_MIN: number; P_MAX: number } {
  if (recentMinutes.length < config.minSetsForPercentile) {
    return { P_MIN: config.pMinDefault, P_MAX: config.pMaxDefault };
  }
  return {
    P_MIN: computePercentile(recentMinutes, 20),
    P_MAX: computePercentile(recentMinutes, 80),
  };
}

export function computeMultiplier(
  margin: number,
  timeMinutes: number | null,
  P_MIN: number,
  P_MAX: number,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): number {
  // Use default time if not provided (average of P_MIN and P_MAX)
  const effectiveTime =
    timeMinutes && timeMinutes > 0 ? timeMinutes : (P_MIN + P_MAX) / 2;

  const m = margin / config.maxPoints;
  const t = clamp((effectiveTime - P_MIN) / (P_MAX - P_MIN), 0, 1);
  const T = t * (1 - m);
  return 1 + config.beta * T;
}

// ─────────────────────────────────────────────────────────────────
// Virtual opponent: doubles aggregation
// ─────────────────────────────────────────────────────────────────

type GlickoPlayer = ReturnType<Glicko2["makePlayer"]>;

function createVirtualOpponent(
  p1: GlickoPlayer,
  p2: GlickoPlayer,
  ranking: Glicko2,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): GlickoPlayer {
  const avgRating = (Number(p1.getRating()) + Number(p2.getRating())) / 2;
  const rd1 = Number(p1.getRd());
  const rd2 = Number(p2.getRd());
  const combinedRd = Math.sqrt(rd1 * rd1 + rd2 * rd2);
  return ranking.makePlayer(avgRating, combinedRd, config.vol);
}

// ─────────────────────────────────────────────────────────────────
// Rating match builder: set-level match tuples
// ─────────────────────────────────────────────────────────────────

function buildRatingEntriesForSet(
  set: ParsedSet,
  team1: GlickoPlayer[],
  team2: GlickoPlayer[],
  P_MIN: number,
  P_MAX: number,
  ranking: Glicko2,
  config: RankingConfig = DEFAULT_RANKING_CONFIG,
): Array<[GlickoPlayer, GlickoPlayer, number, number]> {
  const entries: Array<[GlickoPlayer, GlickoPlayer, number, number]> = [];
  const margin = Math.abs(set.score1 - set.score2);
  const multiplier = computeMultiplier(
    margin,
    set.minutes,
    P_MIN,
    P_MAX,
    config,
  );

  if (set.score1 === set.score2) {
    return []; // no-score draws are skipped
  }

  const team1Won = set.score1 > set.score2;
  const score1 = team1Won ? 1 : 0;
  const score2 = team1Won ? 0 : 1;

  // For doubles: each player vs virtual opponent
  if (team2.length > 1) {
    const vOpp2 = createVirtualOpponent(team2[0], team2[1], ranking, config);
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
    const vOpp1 = createVirtualOpponent(team1[0], team1[1], ranking, config);
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
  // Merge settings with defaults to create the working config
  const config: RankingConfig = {
    ...DEFAULT_RANKING_CONFIG,
    tau: Number.isFinite(settings?.tau)
      ? clamp(Number(settings?.tau), 0.3, 1.2)
      : DEFAULT_RANKING_CONFIG.tau,
  };

  const ranking = new Glicko2({
    tau: config.tau,
    rating: config.rating,
    rd: config.rd,
    vol: config.vol,
  });

  const playersByName = new Map<string, ReturnType<Glicko2["makePlayer"]>>();
  const accumulatorByName = new Map<string, PlayerStatsAccumulator>();

  for (const member of members) {
    const normalizedName = String(member.name || "").trim();
    if (!normalizedName) continue;

    playersByName.set(
      normalizedName,
      ranking.makePlayer(config.rating, config.rd, config.vol),
    );
    accumulatorByName.set(normalizedName, {
      id: member.id,
      name: normalizedName,
      wins: 0,
      totalMatches: 0,
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
    const recentMinutes = collectRecentSetMinutes(allParsedSets, config);
    const { P_MIN, P_MAX } = computeTimePercentiles(recentMinutes, config);

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

      // Process each set individually
      for (const set of parsedSets) {
        if (set.score1 === 0 && set.score2 === 0) continue;

        // Update match count for all players in the match
        for (const playerName of [...team1Names, ...team2Names]) {
          const acc = accumulatorByName.get(playerName);
          if (!acc) continue;
          acc.totalMatches += 1;
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
          P_MIN,
          P_MAX,
          ranking,
          config,
        );
        ratingMatches.push(...entries);
      }
    }

    ranking.updateRatings(ratingMatches as never);
  }

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

    results.push({
      id: member.id,
      name: normalizedName,
      rating: Number(rating.toFixed(2)),
      rd: Number(rd.toFixed(2)),
      vol: Number(vol.toFixed(4)),
      winRate: Number(winRate.toFixed(4)),
      wins: acc.wins,
      totalMatches: acc.totalMatches,
    });
  }

  return results.sort((a, b) => b.rating - a.rating);
}

// ─────────────────────────────────────────────────────────────────
// Simulation: Preview rating changes for today's matches
// ─────────────────────────────────────────────────────────────────

export type SimulatedRating = {
  rating: number;
  rd: number;
  delta: number; // new rating - original rating
};

/**
 * Simulate intra-day rating changes without persisting them.
 *
 * Use case: Show players what their rating will be if updated NOW,
 * before the official end-of-day update.
 *
 * @param currentStats - Official ratings from calculateRankingStats
 * @param todaysMatches - Matches played today
 * @param settings - Partial ranking settings (tau, etc.)
 * @returns Map of playerId → { rating, rd, delta }
 */
export function simulateRatings(
  currentStats: AdvancedStats[],
  todaysMatches: Match[],
  settings?: SimulationSettings,
): Record<number, SimulatedRating> {
  const config: RankingConfig = {
    ...DEFAULT_RANKING_CONFIG,
    tau: Number.isFinite(settings?.tau)
      ? clamp(Number(settings?.tau), 0.3, 1.2)
      : DEFAULT_RANKING_CONFIG.tau,
  };

  // Create temp Glicko2 engine
  const tempRanking = new Glicko2({
    tau: config.tau,
    rating: config.rating,
    rd: config.rd,
    vol: config.vol,
  });

  // Clone players from current state
  const clones = new Map<number, ReturnType<Glicko2["makePlayer"]>>();
  const originalRatings = new Map<number, number>();

  for (const stat of currentStats) {
    const clonedPlayer = tempRanking.makePlayer(stat.rating, stat.rd, stat.vol);
    clones.set(stat.id, clonedPlayer);
    originalRatings.set(stat.id, stat.rating);
  }

  if (todaysMatches.length === 0) {
    // No matches today, return current ratings with zero delta
    const result: Record<number, SimulatedRating> = {};
    for (const stat of currentStats) {
      result[stat.id] = {
        rating: stat.rating,
        rd: stat.rd,
        delta: 0,
      };
    }
    return result;
  }

  // Collect recent set times from all matches for percentile
  const allParsedSets: ParsedSet[][] = [];
  for (const match of todaysMatches) {
    const parsedSets = match.sets
      .map(parseSet)
      .filter((item): item is ParsedSet => !!item);
    allParsedSets.push(parsedSets);
  }

  const recentMinutes = collectRecentSetMinutes(allParsedSets, config);
  const { P_MIN, P_MAX } = computeTimePercentiles(recentMinutes, config);

  // Build rating entries from today's matches
  const ratingMatches: Array<
    [
      ReturnType<Glicko2["makePlayer"]>,
      ReturnType<Glicko2["makePlayer"]>,
      number,
      number,
    ]
  > = [];

  const playersByName = new Map<string, ReturnType<Glicko2["makePlayer"]>>();
  for (const stat of currentStats) {
    playersByName.set(String(stat.name || "").trim(), clones.get(stat.id)!);
  }

  for (const match of todaysMatches) {
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
      .filter((p): p is ReturnType<Glicko2["makePlayer"]> => !!p);
    const team2Players = team2Names
      .map((name) => playersByName.get(name))
      .filter((p): p is ReturnType<Glicko2["makePlayer"]> => !!p);

    if (team1Players.length === 0 || team2Players.length === 0) continue;

    // Process each set
    for (const set of parsedSets) {
      if (set.score1 === 0 && set.score2 === 0) continue;

      const entries = buildRatingEntriesForSet(
        set,
        team1Players,
        team2Players,
        P_MIN,
        P_MAX,
        tempRanking,
        config,
      );
      ratingMatches.push(...entries);
    }
  }

  // Update simulated ratings
  if (ratingMatches.length > 0) {
    tempRanking.updateRatings(ratingMatches as never);
  }

  // Build result with deltas
  const result: Record<number, SimulatedRating> = {};
  for (const stat of currentStats) {
    const clonedPlayer = clones.get(stat.id);
    if (!clonedPlayer) continue;

    const simulatedRating = Number(clonedPlayer.getRating());
    const simulatedRd = Number(clonedPlayer.getRd());
    const originalRating = originalRatings.get(stat.id) || stat.rating;

    result[stat.id] = {
      rating: Number(simulatedRating.toFixed(2)),
      rd: Number(simulatedRd.toFixed(2)),
      delta: Number((simulatedRating - originalRating).toFixed(2)),
    };
  }

  return result;
}
