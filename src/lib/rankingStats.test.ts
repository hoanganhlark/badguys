import { describe, expect, it } from "vitest";
import type { Match, Member } from "../components/ranking/types";
import { calculateRankingStats } from "./rankingStats";

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
      penaltyCoefficient: 0.3,
    });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("An");
    expect(result[0].rating).toBeGreaterThan(result[1].rating);
    expect(result[0].winRate).toBeGreaterThan(result[1].winRate);
  });

  it("he so penalty cao hon se lam rankScore giam manh hon", () => {
    const now = new Date();
    const recentDate = new Date(now);
    recentDate.setDate(now.getDate() - 2);

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
      createMatch({
        id: "m3",
        team1: ["An"],
        team2: ["Binh"],
        sets: ["21-10@35"],
        playedAt: recentDate.toISOString(),
      }),
    ];

    const lowPenalty = calculateRankingStats(members, matches, {
      tau: 0.5,
      penaltyCoefficient: 0.1,
    }).find((item) => item.name === "An");

    const highPenalty = calculateRankingStats(members, matches, {
      tau: 0.5,
      penaltyCoefficient: 0.8,
    }).find((item) => item.name === "An");

    expect(lowPenalty).toBeDefined();
    expect(highPenalty).toBeDefined();
    expect((highPenalty?.rankScore || 0) < (lowPenalty?.rankScore || 0)).toBe(
      true,
    );
  });
});
