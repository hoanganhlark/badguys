import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
