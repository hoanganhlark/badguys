import { useQuery } from "@tanstack/react-query";
import { getRecentAuditEvents } from "../../lib/supabase";
import type { AuditEventRecord } from "../../types";
import { queryDefaults } from "./config";

/**
 * Fetch audit events
 * Uses historical defaults (doesn't change, no auto-refetch)
 */
export function useAuditEventsQuery(maxItems = 100) {
  return useQuery<AuditEventRecord[]>({
    queryKey: ["audit-events", maxItems],
    queryFn: () => getRecentAuditEvents(maxItems),
    staleTime: queryDefaults.historical.staleTime,
    refetchInterval: queryDefaults.historical.refetchInterval,
  } as any);
}

/**
 * Combined hook for audit events
 */
export function useAuditEvents(maxItems = 100) {
  const query = useAuditEventsQuery(maxItems);

  return {
    // Query state
    events: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Cache control
    refetch: query.refetch,
  };
}
