import type { RankingMatch, RankingMember } from "../../types";

export type Member = RankingMember;
export type Match = RankingMatch;

export interface AdvancedStats {
  name: string;
  skill: number;
  stability: number;
  uncertainty: number;
  momentum: number;
  rankScore: number;
  wins: number;
  matches: number;
}

export type RankingView = "member" | "match-form" | "ranking";

export interface MatchSetInput {
  team1Score: string;
  team2Score: string;
}
