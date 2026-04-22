import { useMemo, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRankingMatches, useMatchForm } from "../hooks";
import {
  getLatestRankingSnapshot,
  saveRankingSnapshot,
} from "../../../lib/api";
import { calculateRankingStats } from "../../../lib/rankingStats";
import MatchFormPanel from "../../../components/ranking/MatchFormPanel";
import RankingPanel from "../../../components/ranking/RankingPanel";
import type { Member } from "../../../components/ranking/types";
import type { RankingCategory, RankingSnapshot } from "../../../types";

const DEFAULT_RANKING_CONFIG = {
  tau: 0.6,
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    winRate: true,
  },
} as const;

function normalizeMemberNameKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase();
}

interface RankingMatchesContainerProps {
  members: Member[];
  categories: RankingCategory[];
  usernamesById: Record<string, string>;
  isLoadingDependencies: boolean;
  view: "match-form" | "ranking";
}

/**
 * RankingMatchesContainer
 *
 * Owns all match-related data fetching and form state management.
 * Replaces RankingMatchesProvider + RankingMatchesContext.
 *
 * Responsibilities:
 * - Fetch matches via useRankingMatches (custom hook with localStorage)
 * - Manage match form state (matchType, team1, team2, sets, playedAt)
 * - Calculate rankings from matches and members
 * - Calculate rank trends from ranking snapshots
 * - Handle save/delete/clear mutations
 * - Render MatchFormPanel and RankingPanel with props (no context injection)
 */
export function RankingMatchesContainer({
  members,
  categories,
  usernamesById,
  isLoadingDependencies,
  view,
}: RankingMatchesContainerProps) {
  const { isAdmin, currentUser } = useAuth();
  const currentUserId = currentUser?.userId || "";
  const currentUsername = currentUser?.username || "";

  // Data fetching via custom hooks
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

  const isRankingLoading = isLoading || isLoadingDependencies;

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

  // Local state for ranking snapshots
  const [latestSnapshot, setLatestSnapshot] = useState<RankingSnapshot | null>(
    null,
  );
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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

  // Extract today's matches
  const todaysMatches = useMemo(() => {
    if (matches.length === 0) return [];
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return matches.filter((match) => {
      const playedAtStr = match.playedAt || match.date;
      if (!playedAtStr) return false;
      const matchDate = new Date(playedAtStr);
      if (Number.isNaN(matchDate.getTime())) return false;
      return matchDate >= todayStart && matchDate < tomorrowStart;
    });
  }, [matches]);

  // Calculate official rankings (exclude today's matches)
  const officialRankings = useMemo(() => {
    const yesterdaysMatches = matches.filter(
      (m) => !todaysMatches.includes(m),
    );
    return calculateRankingStats(members, yesterdaysMatches, {
      tau: DEFAULT_RANKING_CONFIG.tau,
    });
  }, [members, matches, todaysMatches]);

  // Calculate simulated rankings (include today's matches)
  const simulatedRankings = useMemo(() => {
    return calculateRankingStats(members, matches, {
      tau: DEFAULT_RANKING_CONFIG.tau,
    });
  }, [members, matches]);

  // Use official or simulated based on context
  const rankings = officialRankings;

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

  // Helper to calculate trends for a given rankings array
  const calculateTrends = (rankingsToUse: typeof officialRankings) => {
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

    return rankingsToUse.reduce<Record<number, number | "NEW">>(
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
  };

  // Calculate trends for both official and simulated
  const officialTrends = useMemo(
    () => calculateTrends(officialRankings),
    [latestSnapshot, officialRankings],
  );

  const simulatedTrends = useMemo(
    () => calculateTrends(simulatedRankings),
    [latestSnapshot, simulatedRankings],
  );

  const showRankTrend = matches.length > 1;

  const memberLevelById = useMemo<Record<number, string>>(
    () =>
      members.reduce<Record<number, string>>((acc, member) => {
        acc[member.id] = member.level;
        return acc;
      }, {}),
    [members],
  );

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [categories],
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
              rankScore: player.rating,
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
      setIsHistoryExpanded(nextExpanded);
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
              rankScore: player.rating,
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
  }, [
    isAdmin,
    matches.length,
    rankings,
    clearAllMatches,
    resetHistoryPagination,
  ]);

  if (view === "match-form") {
    return (
      <MatchFormPanel
        matchType={matchType}
        team1={team1}
        team2={team2}
        sets={sets}
        playedAt={playedAt}
        members={members}
        categories={sortedCategories}
        isLoading={isRankingLoading}
        onSetMatchType={setMatchType}
        onSetTeam1={setTeam1}
        onSetTeam2={setTeam2}
        onSetSets={setSets}
        onSetPlayedAt={setPlayedAt}
        onUpdateTeam1={updateTeam1}
        onUpdateTeam2={updateTeam2}
        onUpdateSet={updateSet}
        onAddSet={addSet}
        onRemoveSet={removeSet}
        onGetValidationError={getValidationError}
        onSaveMatch={handleSaveMatch}
      />
    );
  }

  return (
    <RankingPanel
      officialRankings={rankings}
      simulatedRankings={simulatedRankings}
      todaysMatches={todaysMatches}
      categories={sortedCategories}
      isLoading={isRankingLoading}
      historyMatches={pagedHistoryMatches}
      historyMatchesForDisplay={historyMatchesForDisplay}
      isHistoryLoading={isHistoryLoading}
      isHistoryExpanded={isHistoryExpanded}
      historyPage={historyPage}
      historyPageSize={historyPageSize}
      officialTrends={officialTrends}
      simulatedTrends={simulatedTrends}
      showRankTrend={showRankTrend}
      memberLevelById={memberLevelById}
      currentUserId={currentUserId}
      onToggleHistory={handleToggleHistory}
      onHistoryPaginationChange={handleHistoryPaginationChange}
      onDeleteMatch={handleDeleteMatch}
      onClearHistory={handleClearHistory}
    />
  );
}

export default RankingMatchesContainer;
