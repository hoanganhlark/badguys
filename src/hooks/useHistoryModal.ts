import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Hook for managing navigation between config, sessions, and ranking modals.
 * Tracks which modal should be open based on current route pathname.
 * Provides navigation handlers for opening/closing each modal section.
 *
 * @returns Object containing:
 *   - configOpen: Boolean indicating if config modal is visible
 *   - sessionsOpen: Boolean indicating if sessions modal is visible
 *   - rankingOpen: Boolean indicating if ranking modal is visible
 *   - openConfig: Navigate to /config
 *   - closeConfig: Close config (returns to root or sessions)
 *   - openSessions: Navigate to /config/sessions
 *   - closeSessions: Close sessions (returns to /config)
 *   - openRanking: Navigate to /ranking
 *   - closeRanking: Close ranking (returns to root /)
 *
 * @example
 * const { configOpen, openConfig, closeConfig } = useHistoryModal();
 * if (configOpen) return <ConfigModal onClose={closeConfig} />;
 */
export function useHistoryModal() {
  const location = useLocation();
  const navigate = useNavigate();

  const { configOpen, sessionsOpen, rankingOpen } = useMemo(() => {
    const path = location.pathname;
    const nextSessionsOpen = path === "/config/sessions";
    const nextConfigOpen = path === "/config" || nextSessionsOpen;
    const nextRankingOpen =
      path === "/dashboard" || path.startsWith("/dashboard/");

    return {
      configOpen: nextConfigOpen,
      sessionsOpen: nextSessionsOpen,
      rankingOpen: nextRankingOpen,
    };
  }, [location.pathname]);

  function openConfig() {
    navigate("/config");
  }

  function closeConfig() {
    if (sessionsOpen) {
      navigate("/config");
      return;
    }
    navigate("/");
  }

  function openSessions() {
    navigate("/config/sessions");
  }

  function closeSessions() {
    navigate("/config");
  }

  function openRanking() {
    navigate("/ranking");
  }

  function closeRanking() {
    navigate("/");
  }

  return {
    configOpen,
    sessionsOpen,
    rankingOpen,
    openConfig,
    closeConfig,
    openSessions,
    closeSessions,
    openRanking,
    closeRanking,
  };
}
