import type { RankingMatch, RankingMember } from "../../types";

export type Member = RankingMember;
export type Match = RankingMatch;

export interface AdvancedStats {
  id: number;
  name: string;
  rating: number;
  rd: number;
  vol: number;
  winRate: number;
  wins: number;
  totalMatches: number;
}

export type RankingView = "member" | "match-form" | "ranking";

export interface MatchSetInput {
  team1Score: string;
  team2Score: string;
  minutes?: string;
}
