import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized React Query configuration
 * Extend this for new query defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
      refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    },
  },
});

/**
 * Query configuration presets for different data types
 */
export const queryDefaults = {
  /**
   * Real-time data that changes frequently (members, matches)
   * - Short stale time (5s)
   * - Fast refetch (10s)
   */
  realtime: {
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  },

  /**
   * Reference data that changes rarely (categories, users)
   * - Medium stale time (5 min)
   * - Moderate refetch (30s)
   */
  reference: {
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  },

  /**
   * Historical data that doesn't change (sessions, audit logs)
   * - Long stale time (10 min)
   * - No auto-refetch
   */
  historical: {
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  },
};
