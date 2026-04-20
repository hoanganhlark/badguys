import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRankingMatches,
  saveRankingMatches,
} from "../../lib/api";
import type { RankingMatch } from "../../types";
import { queryDefaults } from "./config";

/**
 * Query key factory for ranking matches
 */
export const rankingMatchesKeys = {
  all: ["ranking-matches"] as const,
  list: () => [...rankingMatchesKeys.all, "list"] as const,
};

/**
 * Fetch ranking matches from Supabase
 * Uses realtime defaults (fast updates, frequent refetch)
 */
export function useRankingMatchesQuery() {
  return useQuery({
    queryKey: rankingMatchesKeys.list(),
    queryFn: getRankingMatches,
    ...queryDefaults.realtime,
  });
}

/**
 * Save ranking matches to Supabase
 * Automatically invalidates cache on success
 */
export function useRankingMatchesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matches: RankingMatch[]) => saveRankingMatches(matches),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rankingMatchesKeys.all,
      });
    },
    onError: (error) => {
      console.error("Failed to save ranking matches:", error);
    },
  });
}

/**
 * Combined hook: fetch + mutate ranking matches
 */
export function useRankingMatches() {
  const query = useRankingMatchesQuery();
  const mutation = useRankingMatchesMutation();

  return {
    // Query state
    matches: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Mutation methods
    saveMatchesAsync: mutation.mutateAsync,
    saveMatches: mutation.mutate,
    isSaving: mutation.isPending,

    // Cache control
    refetch: query.refetch,
  };
}
