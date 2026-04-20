import { useState, useCallback, useEffect } from "react";
import {
  createMatch,
  deleteMatch as firebaseDeleteMatch,
  getMatches,
  isFirebaseReady,
} from "../../../lib/api";
import {
  loadMatchesFromStorage,
  saveMatchesToStorage,
} from "../../../lib/rankingStorage";
import type { Match, MatchSetInput } from "../../../components/ranking/types";
import type { MatchRecord } from "../../../types";

export interface UseRankingMatchesReturn {
  matches: Match[];
  historyMatches: Match[];
  isHistoryLoading: boolean;
  historyPage: number;
  historyPageSize: number;
  addMatch: (
    matchType: "singles" | "doubles",
    team1: string[],
    team2: string[],
    sets: MatchSetInput[],
    playedAt: string,
    userId: string,
    username: string,
  ) => Promise<void>;
  deleteMatch: (matchId: number | string, userId: string, isAdmin: boolean) => Promise<void>;
  loadMatchHistory: () => Promise<void>;
  setHistoryPage: (page: number) => void;
  setHistoryPageSize: (size: number) => void;
  resetHistoryPagination: () => void;
  clearAllMatches: (isAdmin: boolean) => Promise<void>;
}

function formatDateTime(value?: string): string {
  if (!value) return "--/--/---- --:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function mapMatchRecordToRankingMatch(record: MatchRecord): Match {
  const team1 = String(record.playerA || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const team2 = String(record.playerB || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const sets = String(record.score || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasDoubleTeams = team1.length > 1 || team2.length > 1;

  return {
    id: record.id,
    type: hasDoubleTeams ? "doubles" : "singles",
    team1,
    team2,
    sets,
    date: formatDateTime(record.playedAt || record.createdAt),
    playedAt: record.playedAt,
    durationMinutes: record.durationMinutes,
    createdBy: record.createdBy,
    createdByUsername: record.createdByUsername,
  };
}

function parseToIsoDate(input: string): string {
  const parsed = new Date(input);
  return parsed.toISOString();
}

/**
 * Hook for managing ranking matches with history pagination.
 * Handles match creation, deletion, and historical match browsing.
 * Persists matches to both localStorage and Firestore.
 *
 * @returns {UseRankingMatchesReturn} Object containing:
 *   - matches: Current list of all matches
 *   - historyMatches: Paginated historical matches
 *   - isHistoryLoading: Loading flag for history
 *   - historyPage: Current page number (1-indexed)
 *   - historyPageSize: Number of matches per page
 *   - addMatch: Create new match (type, teams, sets, timestamp, userId, username)
 *   - deleteMatch: Delete a match (requires userId verification unless admin)
 *   - loadMatchHistory: Fetch history from Firestore
 *   - setHistoryPage: Update current page
 *   - setHistoryPageSize: Update page size
 *   - resetHistoryPagination: Reset to page 1
 *   - clearAllMatches: Clear all matches (admin only)
 *
 * @example
 * const { matches, addMatch, deleteMatch } = useRankingMatches();
 * await addMatch('singles', ['John'], ['Jane'], ['21-19'], '2026-04-20T10:30', userId, username);
 */
export function useRankingMatches(): UseRankingMatchesReturn {
  const [matches, setMatches] = useState<Match[]>(() =>
    loadMatchesFromStorage(),
  );
  const [historyMatches, setHistoryMatches] = useState<Match[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  const addMatch = useCallback(
    async (
      matchType: "singles" | "doubles",
      team1: string[],
      team2: string[],
      sets: MatchSetInput[],
      playedAt: string,
      userId: string,
      username: string,
    ) => {
      const slotCount = matchType === "singles" ? 1 : 2;
      const selectedTeam1 = team1
        .slice(0, slotCount)
        .filter((name) => name?.trim());
      const selectedTeam2 = team2
        .slice(0, slotCount)
        .filter((name) => name?.trim());

      if (
        selectedTeam1.length !== slotCount ||
        selectedTeam2.length !== slotCount
      ) {
        throw new Error("Invalid team composition");
      }

      const parsedSets = sets
        .map((set) => {
          const scoreA = Number.parseInt(set.team1Score, 10);
          const scoreB = Number.parseInt(set.team2Score, 10);
          const minutes = Number.parseInt(String(set.minutes || ""), 10);

          if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return null;
          if (scoreA < 0 || scoreB < 0) return null;
          if (!Number.isNaN(minutes) && minutes < 0) return null;

          return `${scoreA}-${scoreB}${Number.isFinite(minutes) && minutes > 0 ? `@${minutes}` : ""}`;
        })
        .filter((score): score is string => score !== null);

      if (parsedSets.length === 0) {
        throw new Error("No valid sets provided");
      }

      const totalMinutes = sets.reduce((sum, set) => {
        const minutes = Number.parseInt(String(set.minutes || ""), 10);
        if (!Number.isFinite(minutes) || minutes <= 0) return sum;
        return sum + minutes;
      }, 0);

      const playedAtIso = parseToIsoDate(playedAt);

      const created = await createMatch({
        playerA: selectedTeam1.join(" / "),
        playerB: selectedTeam2.join(" / "),
        score: parsedSets.join(","),
        playedAt: playedAtIso,
        durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        createdBy: userId,
        createdByUsername: username,
      });

      const newMatch = mapMatchRecordToRankingMatch(created);
      setMatches((prev) => [newMatch, ...prev]);
      setHistoryMatches((prev) => [newMatch, ...prev]);
    },
    [],
  );

  const deleteMatch = useCallback(
    async (
      matchId: number | string,
      userId: string,
      isAdmin: boolean,
    ) => {
      const target = matches.find(
        (match) => String(match.id) === String(matchId),
      );

      if (!target) {
        throw new Error("Match not found");
      }

      if (!isAdmin && target.createdBy !== userId) {
        throw new Error("Cannot delete match created by another user");
      }

      await firebaseDeleteMatch(String(matchId));
      setMatches((prev) =>
        prev.filter((match) => String(match.id) !== String(matchId)),
      );
      setHistoryMatches((prev) =>
        prev.filter((match) => String(match.id) !== String(matchId)),
      );
    },
    [matches],
  );

  const loadMatchHistory = useCallback(async () => {
    if (isHistoryLoading) return;

    setIsHistoryLoading(true);
    try {
      if (!isFirebaseReady()) {
        setHistoryMatches(matches);
      } else {
        const records = await getMatches();
        setHistoryMatches(records.map(mapMatchRecordToRankingMatch));
      }
    } catch (error) {
      console.error("Failed to load history matches", error);
      setHistoryMatches(matches);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [matches]);

  const resetHistoryPagination = useCallback(() => {
    setHistoryPage(1);
  }, []);

  const clearAllMatches = useCallback(
    async (isAdmin: boolean) => {
      if (!isAdmin) {
        throw new Error("Only admins can clear all matches");
      }

      try {
        await Promise.all(matches.map((match) => firebaseDeleteMatch(String(match.id))));
        setMatches([]);
        setHistoryMatches([]);
        resetHistoryPagination();
      } catch (error) {
        console.error("Failed to clear matches", error);
        throw error;
      }
    },
    [matches, resetHistoryPagination],
  );

  // Persist matches to localStorage
  useEffect(() => {
    saveMatchesToStorage(matches);
  }, [matches]);

  return {
    matches,
    historyMatches,
    isHistoryLoading,
    historyPage,
    historyPageSize,
    addMatch,
    deleteMatch,
    loadMatchHistory,
    setHistoryPage,
    setHistoryPageSize,
    resetHistoryPagination,
    clearAllMatches,
  };
}
