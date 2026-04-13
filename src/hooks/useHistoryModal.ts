import { useEffect, useRef, useState } from "react";

export function useHistoryModal() {
  const [configOpen, setConfigOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const sidebarHistoryActiveRef = useRef(false);
  const modalHistoryActiveRef = useRef(false);

  useEffect(() => {
    const syncFromHistory = () => {
      const modal = history.state?.modal;
      const nextSessionsOpen = modal === "sessions";
      const nextConfigOpen = modal === "sidebar" || modal === "sessions";

      setSessionsOpen(nextSessionsOpen);
      setConfigOpen(nextConfigOpen);
      modalHistoryActiveRef.current = nextSessionsOpen;
      sidebarHistoryActiveRef.current = nextConfigOpen;
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

  return { configOpen, sessionsOpen, openConfig, closeConfig, openSessions, closeSessions };
}
