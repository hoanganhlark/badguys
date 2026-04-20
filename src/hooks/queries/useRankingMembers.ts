import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRankingMembers,
  saveRankingMembers,
} from "../../lib/api";
import type { RankingMember } from "../../types";
import { queryDefaults } from "./config";

/**
 * Query key factory for ranking members
 * Enables easy cache invalidation and refetching
 */
export const rankingMembersKeys = {
  all: ["ranking-members"] as const,
  list: () => [...rankingMembersKeys.all, "list"] as const,
};

/**
 * Fetch ranking members from Supabase
 * Uses realtime defaults (fast updates, frequent refetch)
 */
export function useRankingMembersQuery() {
  return useQuery({
    queryKey: rankingMembersKeys.list(),
    queryFn: getRankingMembers,
    ...queryDefaults.realtime,
  });
}

/**
 * Save ranking members to Supabase
 * Automatically invalidates cache on success
 */
export function useRankingMembersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (members: RankingMember[]) => saveRankingMembers(members),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rankingMembersKeys.all,
      });
    },
    onError: (error) => {
      console.error("Failed to save ranking members:", error);
    },
  });
}

/**
 * Combined hook: fetch + mutate ranking members
 * Replaces manual useState + useEffect patterns
 */
export function useRankingMembers() {
  const query = useRankingMembersQuery();
  const mutation = useRankingMembersMutation();

  return {
    // Query state
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Mutation methods
    saveMembersAsync: mutation.mutateAsync,
    saveMembers: mutation.mutate,
    isSaving: mutation.isPending,

    // Cache control
    refetch: query.refetch,
  };
}
