import { useEffect, useRef, useState } from "react";

export function useHistoryModal() {
  const [configOpen, setConfigOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);

  const sidebarHistoryActiveRef = useRef(false);
  const modalHistoryActiveRef = useRef(false);
  const rankingHistoryActiveRef = useRef(false);

  useEffect(() => {
    const syncFromHistory = () => {
      const modal = history.state?.modal;
      const nextSessionsOpen = modal === "sessions";
      const nextConfigOpen = modal === "sidebar" || modal === "sessions";
      const nextRankingOpen = modal === "ranking";

      setSessionsOpen(nextSessionsOpen);
      setConfigOpen(nextConfigOpen);
      setRankingOpen(nextRankingOpen);
      modalHistoryActiveRef.current = nextSessionsOpen;
      sidebarHistoryActiveRef.current = nextConfigOpen;
      rankingHistoryActiveRef.current = nextRankingOpen;
    };

    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  function openConfig() {
    setConfigOpen(true);
    if (!sidebarHistoryActiveRef.current) {
      history.pushState({ modal: "sidebar" }, "");
      sidebarHistoryActiveRef.current = true;
    }
  }

  function closeConfig() {
    if (history.state?.modal === "sidebar") {
      history.back();
      return;
    }
    setConfigOpen(false);
    sidebarHistoryActiveRef.current = false;
  }

  function openSessions() {
    if (sessionsOpen) return;
    setSessionsOpen(true);
    if (!modalHistoryActiveRef.current) {
      history.pushState({ modal: "sessions" }, "");
      modalHistoryActiveRef.current = true;
    }
  }

  function closeSessions() {
    if (history.state?.modal === "sessions") {
      history.back();
      return;
    }
    setSessionsOpen(false);
    modalHistoryActiveRef.current = false;
  }

  function openRanking() {
    if (rankingOpen) return;
    setRankingOpen(true);
    if (!rankingHistoryActiveRef.current) {
      history.pushState({ modal: "ranking" }, "");
      rankingHistoryActiveRef.current = true;
    }
  }

  function closeRanking() {
    if (history.state?.modal === "ranking") {
      history.back();
      return;
    }
    setRankingOpen(false);
    rankingHistoryActiveRef.current = false;
  }

  return { configOpen, sessionsOpen, rankingOpen, openConfig, closeConfig, openSessions, closeSessions, openRanking, closeRanking };
}
