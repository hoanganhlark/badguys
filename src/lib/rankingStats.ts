import type { AdvancedStats, Match } from "../components/ranking/types";

function parseScore(score: string): [number, number] | null {
  const parts = score.trim().split("-");
  if (parts.length !== 2) return null;
  const pointFor = parseInt(parts[0], 10);
  const pointAgainst = parseInt(parts[1], 10);
  if (Number.isNaN(pointFor) || Number.isNaN(pointAgainst)) return null;
  return [pointFor, pointAgainst];
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateAdvancedStats(
  playerName: string,
  matches: Match[],
): AdvancedStats {
  const playerMatches = matches.filter(
    (m) => m.team1.includes(playerName) || m.team2.includes(playerName),
  );

  const matchCount = playerMatches.length;

  const performances: number[] = playerMatches.map((m) => {
    const isInTeam1 = m.team1.includes(playerName);
    let totalPointFor = 0;
    let totalPointAgainst = 0;

    for (const set of m.sets) {
      const parsed = parseScore(set);
      if (!parsed) continue;
      if (isInTeam1) {
        totalPointFor += parsed[0];
        totalPointAgainst += parsed[1];
      } else {
        totalPointFor += parsed[1];
        totalPointAgainst += parsed[0];
      }
    }

    const total = totalPointFor + totalPointAgainst;
    if (total === 0) return 0;
    return (totalPointFor - totalPointAgainst) / total;
  });

  const wins = performances.filter((p) => p > 0).length;

  let totalPointFor = 0;
  let totalPointAgainst = 0;
  for (const match of playerMatches) {
    const isInTeam1 = match.team1.includes(playerName);
    for (const set of match.sets) {
      const parsed = parseScore(set);
      if (!parsed) continue;
      if (isInTeam1) {
        totalPointFor += parsed[0];
        totalPointAgainst += parsed[1];
      } else {
        totalPointFor += parsed[1];
        totalPointAgainst += parsed[0];
      }
    }
  }

  const total = totalPointFor + totalPointAgainst;
  const skill = total === 0 ? 0 : (totalPointFor - totalPointAgainst) / total;

  const stdDevPerf = calculateStdDev(performances);
  const stability = Math.max(0, 1 - stdDevPerf);
  const uncertainty =
    stdDevPerf + (matchCount > 0 ? 1 / Math.sqrt(matchCount) : 1);

  const avgAll =
    performances.length > 0
      ? performances.reduce((a, b) => a + b, 0) / performances.length
      : 0;
  const recentPerfs = performances.slice(-5);
  const avgRecent =
    recentPerfs.length > 0
      ? recentPerfs.reduce((a, b) => a + b, 0) / recentPerfs.length
      : 0;
  const momentum = avgRecent - avgAll;

  const rankScore = skill - 2 * uncertainty * 0.5 * stability * 0.3 * momentum;

  return {
    name: playerName,
    skill: parseFloat(skill.toFixed(3)),
    stability: parseFloat(stability.toFixed(3)),
    uncertainty: parseFloat(uncertainty.toFixed(3)),
    momentum: parseFloat(momentum.toFixed(3)),
    rankScore: parseFloat(rankScore.toFixed(3)),
    wins,
    matches: matchCount,
  };
}
