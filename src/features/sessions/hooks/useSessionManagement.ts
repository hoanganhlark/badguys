import { useState, useCallback } from "react";
import {
  getRecentSessions,
  isSupabaseReady,
  removeSession,
} from "../../../lib/api";
import { copyText } from "../../../lib/platform";
import type { SessionRecord } from "../../../types";
import { SESSIONS_FETCH_LIMIT } from "../../../lib/constants";

export interface UseSessionManagementReturn {
  sessions: SessionRecord[];
  isLoading: boolean;
  error: string;
  loadSessions: () => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  copySummary: (text: string) => Promise<void>;
}

/**
 * Hook for managing session history operations (load, delete, copy).
 *
 * @returns Object with sessions, loading state, error, and action functions
 */
export function useSessionManagement(): UseSessionManagementReturn {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!isSupabaseReady()) {
        setError("Supabase is not ready");
        return;
      }

      const items = await getRecentSessions(SESSIONS_FETCH_LIMIT);
      setSessions(items);
    } catch (err) {
      console.warn("Load recent sessions failed", err);
      setError("Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId) {
        setError("Missing session ID");
        return;
      }

      if (!isSupabaseReady()) {
        setError("Supabase is not ready");
        return;
      }

      try {
        await removeSession(sessionId);
        await loadSessions();
      } catch (err) {
        console.warn("Remove session failed", err);
        setError("Failed to delete session");
      }
    },
    [loadSessions],
  );

  const copySummary = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await copyText(text);
    } catch (err) {
      console.warn("Copy failed", err);
      setError("Failed to copy");
    }
  }, []);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    removeSession: deleteSession,
    copySummary,
  };
}
