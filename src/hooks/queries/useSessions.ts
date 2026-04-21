import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecentSessions,
  removeSession,
  saveDailySummary,
} from "../../lib/api";
import type { SessionPayload, SessionRecord } from "../../types";
import { queryDefaults } from "./config";

/**
 * Fetch recent sessions
 * Uses historical defaults (historical data, no auto-refetch)
 */
export function useSessionsQuery(maxItems = 14, enabled = true) {
  return useQuery<SessionRecord[]>({
    queryKey: ["sessions", maxItems],
    queryFn: async (): Promise<SessionRecord[]> => getRecentSessions(maxItems),
    staleTime: queryDefaults.historical.staleTime,
    refetchInterval: queryDefaults.historical.refetchInterval,
    enabled,
  } as any);
}

/**
 * Save daily session summary
 */
export function useSaveSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SessionPayload) => saveDailySummary(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * Remove session
 */
export function useRemoveSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => removeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

/**
 * Combined hook for sessions
 * @param maxItems Maximum number of sessions to fetch
 * @param enabled Whether to enable the query (default: true). Set to false to defer fetching
 */
export function useSessions(maxItems = 14, enabled = true) {
  const query = useSessionsQuery(maxItems, enabled);
  const saveMutation = useSaveSessionMutation();
  const removeMutation = useRemoveSessionMutation();

  return {
    // Query state
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Save session
    saveSession: saveMutation.mutate,
    saveSessionAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,

    // Remove session
    removeSession: removeMutation.mutate,
    removeSessionAsync: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,

    // Cache control
    refetch: query.refetch,
  };
}
