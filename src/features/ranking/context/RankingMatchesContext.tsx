import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRankingMatches, useMatchForm } from "../hooks";
import { getLatestRankingSnapshot, saveRankingSnapshot } from "../../../lib/api";
import { calculateRankingStats } from "../../../lib/rankingStats";
import type { AdvancedStats, Match, MatchSetInput, Member } from "../../../components/ranking/types";
import type { RankingSnapshot } from "../../../types";

const DEFAULT_RANKING_CONFIG = {
  tau: 0.6,
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    motivation: true,
    winRate: true,
  },
} as const;

function normalizeMemberNameKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase();
}

type RankingMatchesContextValue = {
  // From useRankingMatches
  matches: Match[];
  isLoading: boolean;
  historyMatches: Match[];
  isHistoryLoading: boolean;
  historyPage: number;
  historyPageSize: number;
  // From useMatchForm
  matchType: "singles" | "doubles";
  team1: string[];
  team2: string[];
  sets: MatchSetInput[];
  playedAt: string;
  setMatchType: (type: "singles" | "doubles") => void;
  setTeam1: (team: string[]) => void;
  setTeam2: (team: string[]) => void;
  setSets: (sets: MatchSetInput[]) => void;
  setPlayedAt: (date: string) => void;
  updateTeam1: (index: number, value: string) => void;
  updateTeam2: (index: number, value: string) => void;
  updateSet: (index: number, field: keyof MatchSetInput, value: string) => void;
  addSet: () => void;
  removeSet: (index: number) => void;
  resetForm: () => void;
  getValidationError: () => string | null;
  // Derived
  rankings: AdvancedStats[];
  rankTrends: Record<number, number | "NEW">;
  memberLevelById: Record<number, string>;
  showRankTrend: boolean;
  latestSnapshot: RankingSnapshot | null;
  pagedHistoryMatches: Match[];
  historyMatchesForDisplay: Match[];
  // Handlers
  handleSaveMatch: () => Promise<void>;
  handleDeleteMatch: (matchId: number | string) => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleToggleHistory: (expanded: boolean) => Promise<void>;
  handleHistoryPaginationChange: (page: number, pageSize: number) => void;
  setHistoryPage: (page: number) => void;
  setHistoryPageSize: (size: number) => void;
};

const RankingMatchesContext = createContext<
  RankingMatchesContextValue | undefined
>(undefined);

interface RankingMatchesProviderProps {
  members: Member[];
  currentUserId: string;
  currentUsername: string;
  isAdmin: boolean;
  usernamesById: Record<string, string>;
  children: ReactNode;
}

export function RankingMatchesProvider({
  members,
  currentUserId,
  currentUsername,
  isAdmin,
  usernamesById,
  children,
}: RankingMatchesProviderProps) {
  const {
    matches,
    isLoading,
    historyMatches,
    isHistoryLoading,
    historyPage,
    historyPageSize,
    addMatch,
    deleteMatch: deleteMatchFn,
    loadMatchHistory,
    setHistoryPage,
    setHistoryPageSize,
    resetHistoryPagination,
    clearAllMatches,
  } = useRankingMatches();

  const {
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    setMatchType,
    setTeam1,
    setTeam2,
    setSets,
    setPlayedAt,
    updateTeam1,
    updateTeam2,
    updateSet,
    addSet,
    removeSet,
    resetForm,
    getValidationError,
  } = useMatchForm();

  const [latestSnapshot, setLatestSnapshot] = useState<RankingSnapshot | null>(
    null,
  );

  // Load latest snapshot on mount
  useEffect(() => {
    let mounted = true;

    const loadLatestSnapshot = async () => {
      try {
        const snapshot = await getLatestRankingSnapshot();
        if (mounted) {
          setLatestSnapshot(snapshot);
        }
      } catch (error) {
        console.error("Failed to load latest ranking snapshot", error);
      }
    };

    void loadLatestSnapshot();

    return () => {
      mounted = false;
    };
  }, []);

  // Calculate rankings
  const rankings = useMemo(() => {
    return calculateRankingStats(members, matches, {
      tau: DEFAULT_RANKING_CONFIG.tau,
    });
  }, [members, matches]);

  // Build historyMatchesForDisplay with usernames
  const historyMatchesForDisplay = useMemo(
    () =>
      historyMatches.map((match) => ({
        ...match,
        createdByUsername:
          match.createdByUsername || usernamesById[match.createdBy || ""] || "",
      })),
    [historyMatches, usernamesById],
  );

  // Paginate history matches
  const pagedHistoryMatches = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return historyMatchesForDisplay.slice(start, start + historyPageSize);
  }, [historyMatchesForDisplay, historyPage, historyPageSize]);

  // Calculate rank trends
  const rankTrends = useMemo<Record<number, number | "NEW">>(() => {
    if (!latestSnapshot) return {};

    const previousRanksByMemberId = new Map<number, number>();
    const previousRanksByMemberName = new Map<string, number>();
    latestSnapshot.ranks.forEach((entry) => {
      previousRanksByMemberId.set(entry.memberId, entry.rank);
      const memberNameKey = normalizeMemberNameKey(entry.memberName);
      if (memberNameKey && !previousRanksByMemberName.has(memberNameKey)) {
        previousRanksByMemberName.set(memberNameKey, entry.rank);
      }
    });

    return rankings.reduce<Record<number, number | "NEW">>(
      (acc, player, idx) => {
        const currentRank = idx + 1;
        const previousRank =
          previousRanksByMemberId.get(player.id) ??
          previousRanksByMemberName.get(normalizeMemberNameKey(player.name));
        if (previousRank === undefined) {
          acc[player.id] = "NEW";
        } else {
          acc[player.id] = previousRank - currentRank;
        }
        return acc;
      },
      {},
    );
  }, [latestSnapshot, rankings]);

  const showRankTrend = matches.length > 1;

  const memberLevelById = useMemo<Record<number, string>>(
    () =>
      members.reduce<Record<number, string>>((acc, member) => {
        acc[member.id] = member.level;
        return acc;
      }, {}),
    [members],
  );

  // Handlers
  const handleSaveMatch = useCallback(async () => {
    if (!currentUserId || !currentUsername) return;

    const error = getValidationError();
    if (error) {
      throw new Error(error);
    }

    try {
      await addMatch(
        matchType,
        team1,
        team2,
        sets,
        playedAt,
        currentUserId,
        currentUsername,
      );

      // Save ranking snapshot after match
      try {
        if (rankings.length > 0) {
          await saveRankingSnapshot(
            rankings.map((player, index) => ({
              memberId: player.id,
              memberName: player.name,
              rank: index + 1,
              rankScore: player.rankScore,
            })),
          );
          const snapshot = await getLatestRankingSnapshot();
          setLatestSnapshot(snapshot);
        }
      } catch (snapshotError) {
        console.error(
          "Failed to save ranking snapshot after match",
          snapshotError,
        );
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save match", error);
      throw error;
    }
  }, [
    currentUserId,
    currentUsername,
    getValidationError,
    addMatch,
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    rankings,
    resetForm,
  ]);

  const handleDeleteMatch = useCallback(
    async (matchId: number | string) => {
      if (!currentUserId) return;

      try {
        await deleteMatchFn(matchId, currentUserId, isAdmin);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Cannot delete")) {
          throw new Error("Can only delete your own matches");
        }
        throw error;
      }
    },
    [currentUserId, isAdmin, deleteMatchFn],
  );

  const handleToggleHistory = useCallback(
    async (nextExpanded: boolean) => {
      if (!nextExpanded) return;

      resetHistoryPagination();
      await loadMatchHistory();
    },
    [resetHistoryPagination, loadMatchHistory],
  );

  const handleHistoryPaginationChange = useCallback(
    (page: number, pageSize: number) => {
      setHistoryPage(page);
      setHistoryPageSize(pageSize);
    },
    [setHistoryPage, setHistoryPageSize],
  );

  const handleClearHistory = useCallback(async () => {
    if (!isAdmin) return;
    if (matches.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete all matches?",
    );
    if (!confirmed) return;

    try {
      if (rankings.length > 0) {
        try {
          await saveRankingSnapshot(
            rankings.map((player, index) => ({
              memberId: player.id,
              memberName: player.name,
              rank: index + 1,
              rankScore: player.rankScore,
            })),
          );
        } catch (snapshotError) {
          console.error(
            "Failed to save ranking snapshot before clear",
            snapshotError,
          );
        }
      }

      await clearAllMatches(isAdmin);
      resetHistoryPagination();

      try {
        const snapshot = await getLatestRankingSnapshot();
        setLatestSnapshot(snapshot);
      } catch (snapshotError) {
        console.error("Failed to refresh ranking snapshot", snapshotError);
      }
    } catch (error) {
      console.error("Failed to clear matches", error);
      throw error;
    }
  }, [isAdmin, matches.length, rankings, clearAllMatches, resetHistoryPagination]);

  const value = useMemo<RankingMatchesContextValue>(
    () => ({
      matches,
      isLoading,
      historyMatches,
      isHistoryLoading,
      historyPage,
      historyPageSize,
      matchType,
      team1,
      team2,
      sets,
      playedAt,
      setMatchType,
      setTeam1,
      setTeam2,
      setSets,
      setPlayedAt,
      updateTeam1,
      updateTeam2,
      updateSet,
      addSet,
      removeSet,
      resetForm,
      getValidationError,
      rankings,
      rankTrends,
      memberLevelById,
      showRankTrend,
      latestSnapshot,
      pagedHistoryMatches,
      historyMatchesForDisplay,
      handleSaveMatch,
      handleDeleteMatch,
      handleClearHistory,
      handleToggleHistory,
      handleHistoryPaginationChange,
      setHistoryPage,
      setHistoryPageSize,
    }),
    [
      matches,
      isLoading,
      historyMatches,
      isHistoryLoading,
      historyPage,
      historyPageSize,
      matchType,
      team1,
      team2,
      sets,
      playedAt,
      setMatchType,
      setTeam1,
      setTeam2,
      setSets,
      setPlayedAt,
      updateTeam1,
      updateTeam2,
      updateSet,
      addSet,
      removeSet,
      resetForm,
      getValidationError,
      rankings,
      rankTrends,
      memberLevelById,
      showRankTrend,
      latestSnapshot,
      pagedHistoryMatches,
      historyMatchesForDisplay,
      handleSaveMatch,
      handleDeleteMatch,
      handleClearHistory,
      handleToggleHistory,
      handleHistoryPaginationChange,
      setHistoryPage,
      setHistoryPageSize,
    ],
  );

  return (
    <RankingMatchesContext.Provider value={value}>
      {children}
    </RankingMatchesContext.Provider>
  );
}

export function useRankingMatchesContext(): RankingMatchesContextValue {
  const context = useContext(RankingMatchesContext);
  if (context === undefined) {
    throw new Error(
      "useRankingMatchesContext must be used within a RankingMatchesProvider",
    );
  }
  return context;
}
