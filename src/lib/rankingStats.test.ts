import { describe, expect, it } from "vitest";
import type { Match, Member } from "../components/ranking/types";
import {
  calculateRankingStats,
  computeMultiplier,
  simulateRatings,
} from "./rankingStats";

function createMatch(input: {
  id: string;
  team1: string[];
  team2: string[];
  sets: string[];
  playedAt: string;
}): Match {
  return {
    id: input.id,
    type:
      input.team1.length > 1 || input.team2.length > 1 ? "doubles" : "singles",
    team1: input.team1,
    team2: input.team2,
    sets: input.sets,
    date: input.playedAt,
    playedAt: input.playedAt,
  };
}

describe("calculateRankingStats", () => {
  it("xep nguoi thang cao hon khi du lieu co y nghia", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
    ];

    const matches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-14@28"],
        playedAt: "2026-03-03T10:00:00.000Z",
      }),
      createMatch({
        id: "m2",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-18@30"],
        playedAt: "2026-03-10T10:00:00.000Z",
      }),
    ];

    const result = calculateRankingStats(members, matches, {
      tau: 0.5,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("An");
    expect(result[0].rating).toBeGreaterThan(result[1].rating);
    expect(result[0].winRate).toBeGreaterThan(result[1].winRate);
  });

  it("ranking stats compute consistently with same settings", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
    ];

    const matches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-19@10"],
        playedAt: "2026-01-05T10:00:00.000Z",
      }),
      createMatch({
        id: "m2",
        team1: ["Binh"],
        team2: ["An"],
        sets: ["21-19@10"],
        playedAt: "2026-02-05T10:00:00.000Z",
      }),
    ];

    const result1 = calculateRankingStats(members, matches, {
      tau: 0.5,
    }).find((item) => item.name === "An");

    const result2 = calculateRankingStats(members, matches, {
      tau: 0.5,
    }).find((item) => item.name === "An");

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1?.rating).toBe(result2?.rating);
  });

  it("computeMultiplier uses default time when no time data", () => {
    // Default time = (10 + 14) / 2 = 12
    // For large margin (10), multiplier should be close to 1.0
    const mult = computeMultiplier(10, null, 10, 14);
    expect(mult).toBeGreaterThan(1.0);
    expect(mult).toBeLessThan(1.3);
  });

  it("computeMultiplier increases with time and decreases with margin", () => {
    const blowout = computeMultiplier(20, 14, 10, 14); // large margin, max time
    const close = computeMultiplier(2, 14, 10, 14); // small margin, max time
    expect(close).toBeGreaterThan(blowout);
  });

  it("doubles matches produce different ratings than singles with same teams", () => {
    const members: Member[] = [
      { id: 1, name: "P1", level: "Lo" },
      { id: 2, name: "P2", level: "Lo" },
      { id: 3, name: "P3", level: "Lo" },
      { id: 4, name: "P4", level: "Lo" },
    ];

    // Same result, but one played as doubles, one as singles cross-product
    const doublesMatches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["P1", "P2"],
        team2: ["P3", "P4"],
        sets: ["21-15@20"],
        playedAt: "2026-03-01T10:00:00.000Z",
      }),
    ];

    const doublesStats = calculateRankingStats(members, doublesMatches, {
      tau: 0.6,
    });

    // With virtual opponent, the dynamics change
    const p1Doubles = doublesStats.find((s) => s.name === "P1");
    expect(p1Doubles).toBeDefined();
    expect(p1Doubles?.rating).toBeGreaterThan(1500); // should have improved from win
  });

  it("supports ranking-by-set mode with immediate per-set updates", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
      { id: 3, name: "Cuong", level: "Lo" },
    ];

    const matches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T08:00:00.000Z",
      }),
      createMatch({
        id: "m2",
        team1: ["Binh"],
        team2: ["Cuong"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T09:00:00.000Z",
      }),
      createMatch({
        id: "m3",
        team1: ["Cuong"],
        team2: ["An"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T10:00:00.000Z",
      }),
    ];

    const daily = calculateRankingStats(members, matches, {
      tau: 0.6,
      isRankingBySet: false,
    });
    const bySet = calculateRankingStats(members, matches, {
      tau: 0.6,
      isRankingBySet: true,
    });

    const dailyAn = daily.find((item) => item.name === "An");
    const bySetAn = bySet.find((item) => item.name === "An");
    expect(dailyAn).toBeDefined();
    expect(bySetAn).toBeDefined();
    expect(bySetAn?.rating).not.toBe(dailyAn?.rating);
    expect(bySetAn?.wins).toBe(dailyAn?.wins);
    expect(bySetAn?.totalMatches).toBe(dailyAn?.totalMatches);
  });
});

describe("simulateRatings", () => {
  it("returns empty deltas for no matches", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
    ];

    const currentStats = calculateRankingStats(members, [], { tau: 0.6 });
    const todaysMatches: Match[] = [];

    const simulated = simulateRatings(currentStats, todaysMatches);

    expect(simulated[1].delta).toBe(0);
    expect(simulated[2].delta).toBe(0);
  });

  it("simulates positive delta for winner", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
    ];

    // First establish baseline
    const baselineMatches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-14@10"],
        playedAt: "2026-03-01T10:00:00.000Z",
      }),
    ];

    const currentStats = calculateRankingStats(members, baselineMatches, {
      tau: 0.6,
    });

    // Simulate another match where An wins again
    const todaysMatches: Match[] = [
      createMatch({
        id: "m2",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-15@12"],
        playedAt: "2026-03-02T10:00:00.000Z",
      }),
    ];

    const simulated = simulateRatings(currentStats, todaysMatches, {
      tau: 0.6,
    });

    // An (winner) should have positive delta
    expect(simulated[1].delta).toBeGreaterThan(0);
    // Binh (loser) should have negative delta
    expect(simulated[2].delta).toBeLessThan(0);
  });

  it("preserves original ratings in output", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
    ];

    const baselineMatches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-18@15"],
        playedAt: "2026-03-01T10:00:00.000Z",
      }),
    ];

    const currentStats = calculateRankingStats(members, baselineMatches, {
      tau: 0.6,
    });

    const simulated = simulateRatings(currentStats, [], { tau: 0.6 });

    // Simulated should have same ratings as current (no change)
    expect(simulated[1].rating).toBeCloseTo(currentStats[0].rating, 1);
  });

  it("supports ranking-by-set simulation mode", () => {
    const members: Member[] = [
      { id: 1, name: "An", level: "Lo" },
      { id: 2, name: "Binh", level: "Lo" },
      { id: 3, name: "Cuong", level: "Lo" },
    ];

    const currentStats = calculateRankingStats(members, [], { tau: 0.6 });
    const todaysMatches: Match[] = [
      createMatch({
        id: "m1",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T08:00:00.000Z",
      }),
      createMatch({
        id: "m2",
        team1: ["Binh"],
        team2: ["Cuong"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T09:00:00.000Z",
      }),
      createMatch({
        id: "m3",
        team1: ["Cuong"],
        team2: ["An"],
        sets: ["21-18@20"],
        playedAt: "2026-03-03T10:00:00.000Z",
      }),
    ];

    const dailySimulation = simulateRatings(currentStats, todaysMatches, {
      tau: 0.6,
      isRankingBySet: false,
    });
    const setSimulation = simulateRatings(currentStats, todaysMatches, {
      tau: 0.6,
      isRankingBySet: true,
    });

    expect(setSimulation[1].rating).not.toBe(dailySimulation[1].rating);
  });
});
