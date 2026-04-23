import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  useState,
} from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import type { AdvancedStats, RankingView } from "../../../components/ranking/types";

type StoredSimulationConfig = {
  realtimeMode: boolean;
  isRankingBySet: boolean;
};

const DEFAULT_SIMULATION_CONFIG: StoredSimulationConfig = {
  realtimeMode: false,
  isRankingBySet: false,
};

const RANKING_SIMULATION_CONFIG_STORAGE_KEY = "rankingSimulationConfig";

function getSimulationConfigStorageKey(scopeKey?: string): string {
  const normalizedScope = String(scopeKey || "").trim() || "guest";
  return `${RANKING_SIMULATION_CONFIG_STORAGE_KEY}:${normalizedScope}`;
}

function loadStoredSimulationConfig(scopeKey?: string): StoredSimulationConfig {
  try {
    const key = getSimulationConfigStorageKey(scopeKey);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_SIMULATION_CONFIG;

    const parsed = JSON.parse(raw) as Partial<StoredSimulationConfig>;
    return {
      realtimeMode:
        typeof parsed.realtimeMode === "boolean" ? parsed.realtimeMode : false,
      isRankingBySet:
        typeof parsed.isRankingBySet === "boolean" ? parsed.isRankingBySet : false,
    };
  } catch {
    return DEFAULT_SIMULATION_CONFIG;
  }
}

type RankingUIContextValue = {
  view: RankingView;
  selectedCategoryId: string;
  selectedPlayer: AdvancedStats | null;
  mobileSidebarOpen: boolean;
  usernamesById: Record<string, string>;
  realtimeMode: boolean;
  isRankingBySet: boolean;
  setViewWithRoute: (view: RankingView, mode?: "push" | "replace") => void;
  setSelectedCategoryId: (id: string) => void;
  setSelectedPlayer: (player: AdvancedStats | null) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setRealtimeMode: (enabled: boolean) => void;
  setIsRankingBySet: (enabled: boolean) => void;
  isPublicRankingRoute: boolean;
  mainContentRef: React.RefObject<HTMLElement | null>;
};

const RankingUIContext = createContext<RankingUIContextValue | undefined>(
  undefined,
);

interface RankingUIProviderProps {
  isOpen: boolean;
  onClose: () => void;
  isPublicRankingRoute: boolean;
  children: ReactNode;
}

function isRankingView(value: string | null): value is RankingView {
  return (
    value === "member" ||
    value === "match-form" ||
    value === "ranking"
  );
}

export function RankingUIProvider({
  isOpen,
  onClose,
  isPublicRankingRoute,
  children,
}: RankingUIProviderProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement | null>(null);
  const currentUserId = currentUser?.userId || "";

  // Determine current route
  const routeBase = isPublicRankingRoute ? "/ranking" : "/dashboard";
  const dashboardRoute = matchPath("/dashboard/:tab", location.pathname);
  const publicRoute = matchPath("/ranking/:tab", location.pathname);
  const tab = dashboardRoute?.params.tab ?? publicRoute?.params.tab ?? null;
  const parsedView: RankingView = isRankingView(tab) ? tab : "ranking";
  const view: RankingView =
    isPublicRankingRoute && parsedView === "match-form"
      ? "ranking"
      : parsedView;

  // Local state via useState (mimicking the original component)
  const [selectedPlayer, setSelectedPlayer] =
    useState<AdvancedStats | null>(null);
  const [usernamesById] = useState<Record<string, string>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [realtimeMode, setRealtimeMode] = useState(
    () => loadStoredSimulationConfig(currentUserId).realtimeMode,
  );
  const [isRankingBySet, setIsRankingBySet] = useState(
    () => loadStoredSimulationConfig(currentUserId).isRankingBySet,
  );

  useEffect(() => {
    const stored = loadStoredSimulationConfig(currentUserId);
    setRealtimeMode(stored.realtimeMode);
    setIsRankingBySet(stored.isRankingBySet);
  }, [currentUserId]);

  useEffect(() => {
    const key = getSimulationConfigStorageKey(currentUserId);
    localStorage.setItem(key, JSON.stringify({ realtimeMode, isRankingBySet }));
  }, [currentUserId, realtimeMode, isRankingBySet]);

  // Handler for setting view with route
  const setViewWithRoute = useCallback(
    (nextView: RankingView, mode: "push" | "replace" = "push") => {
      if (!isOpen) return;
      const safeView =
        isPublicRankingRoute && nextView === "match-form" ? "ranking" : nextView;
      navigate(`${routeBase}/${safeView}`, { replace: mode === "replace" });
    },
    [isOpen, isPublicRankingRoute, navigate, routeBase],
  );

  // Escape key handler - closes player modal or calls onClose
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (selectedPlayer) {
        setSelectedPlayer(null);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectedPlayer]);

  // Route validation - redirect invalid routes
  useEffect(() => {
    if (!isOpen) return;
    if (isPublicRankingRoute && tab === "login") {
      return;
    }
    if (isPublicRankingRoute && tab === "match-form") {
      navigate(`${routeBase}/ranking`, { replace: true });
      return;
    }
    if (tab == null || isRankingView(tab)) return;
    navigate(`${routeBase}/ranking`, { replace: true });
  }, [isOpen, isPublicRankingRoute, navigate, routeBase, tab]);

  // Mobile sidebar auto-close on view change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [view, location.pathname]);

  // Focus scroll-into-view for input fields
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 220);
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, []);

  // Visual viewport keyboard inset CSS variable
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const keyboardInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        `${keyboardInset}px`,
      );
    };

    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        "0px",
      );
    };
  }, []);

  const value = useMemo<RankingUIContextValue>(
    () => ({
      view,
      selectedCategoryId,
      selectedPlayer,
      mobileSidebarOpen,
      usernamesById,
      realtimeMode,
      isRankingBySet,
      setViewWithRoute,
      setSelectedCategoryId,
      setSelectedPlayer,
      setMobileSidebarOpen,
      setRealtimeMode,
      setIsRankingBySet,
      isPublicRankingRoute,
      mainContentRef,
    }),
    [
      view,
      selectedCategoryId,
      selectedPlayer,
      mobileSidebarOpen,
      usernamesById,
      realtimeMode,
      isRankingBySet,
      setViewWithRoute,
      isPublicRankingRoute,
    ],
  );

  return (
    <RankingUIContext.Provider value={value}>
      {children}
    </RankingUIContext.Provider>
  );
}

export function useRankingUIContext(): RankingUIContextValue {
  const context = useContext(RankingUIContext);
  if (context === undefined) {
    throw new Error(
      "useRankingUIContext must be used within a RankingUIProvider",
    );
  }
  return context;
}

export function useOptionalRankingUIContext(): RankingUIContextValue | null {
  return useContext(RankingUIContext) ?? null;
}
