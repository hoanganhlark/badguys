import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useHistoryModal } from "../hooks/useHistoryModal";
import { useSessions } from "../hooks/queries/useSessions";
import { useSessionHandlers } from "../hooks/useSessionHandlers";
import { SESSIONS_FETCH_LIMIT } from "../lib/constants";

type SessionContextValue = {
  sessions: any[];
  sessionsLoading: boolean;
  sessionsError: string;
  sessionsOpen: boolean;
  openSessionsModal: () => void;
  closeSessions: () => void;
  handleRemoveSession: (sessionId: string) => Promise<void>;
  handleCopySessionNote: (summaryText: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
  showToast: (message: string) => void;
}

export function SessionProvider({ children, showToast }: SessionProviderProps) {
  const [sessionsFetched, setSessionsFetched] = useState(false);
  const { sessionsOpen, closeSessions, openSessions } = useHistoryModal();

  // Query hook for sessions data
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsQueryError,
    refetch: refetchSessions,
    removeSessionAsync,
  } = useSessions(SESSIONS_FETCH_LIMIT, sessionsFetched);

  const sessionsError =
    sessionsQueryError instanceof Error ? sessionsQueryError.message : "";

  // Handlers
  const { handleRemoveSession, handleCopySessionNote } = useSessionHandlers({
    showToast,
    removeSessions: removeSessionAsync,
  });

  function openSessionsModal() {
    if (!sessionsFetched) {
      setSessionsFetched(true);
    }
    openSessions();
    refetchSessions();
  }

  const value: SessionContextValue = {
    sessions,
    sessionsLoading,
    sessionsError,
    sessionsOpen,
    openSessionsModal,
    closeSessions,
    handleRemoveSession,
    handleCopySessionNote,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return context;
}
