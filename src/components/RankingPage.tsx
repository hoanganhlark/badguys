import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { App as AntApp, Button, Dropdown, Layout, type MenuProps } from "antd";
import {
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  getLatestRankingSnapshot,
  isSupabaseReady,
  saveRankingSnapshot,
} from "../lib/api";
import { useUsers } from "../hooks/queries";
import {
  useRankingMembers,
  useRankingMatches,
  useRankingCategories,
  useMatchForm,
} from "../features/ranking/hooks";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { calculateRankingStats } from "../lib/rankingStats";
import {
  AnalyticsEventName,
  AnalyticsParamKey,
  trackEvent,
} from "../lib/analytics";
import DashboardSectionHeader from "./dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "./dashboard/DashboardSummaryCards";
import MatchFormPanel from "./ranking/MatchFormPanel";
import MembersPanel from "./ranking/MembersPanel";
import PlayerStatsModal from "./ranking/PlayerStatsModal";
import RankingPanel from "./ranking/RankingPanel";
import RankingSidebar from "./ranking/RankingSidebar";
import type { AdvancedStats, Member, RankingView } from "./ranking/types";
import type { RankingSnapshot, RankingLevel } from "../types";
import { Award, BarChart2, Settings } from "react-feather";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const DASHBOARD_APPBAR_STYLE: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 55,
  height: 56,
  lineHeight: "56px",
  padding: "0 16px",
  borderBottom: "1px solid #e2e8f0",
  background: "rgba(250, 250, 250, 0.92)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
};

function isRankingView(value: string | null): value is RankingView {
  return value === "member" || value === "match-form" || value === "ranking";
}

function normalizeMemberNameKey(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase();
}

const DEFAULT_RANKING_CONFIG = {
  tau: 0.5,
  penaltyCoefficient: 0.3,
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    motivation: true,
    winRate: true,
  },
} as const;

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { t } = useTranslation();
  const { message: messageApi } = AntApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicRankingRoute = location.pathname.startsWith("/ranking");
  const routeBase = isPublicRankingRoute ? "/ranking" : "/dashboard";
  const dashboardRoute = matchPath("/dashboard/:tab", location.pathname);
  const publicRoute = matchPath("/ranking/:tab", location.pathname);
  const tab = dashboardRoute?.params.tab ?? publicRoute?.params.tab ?? null;
  const parsedView: RankingView = isRankingView(tab) ? tab : "ranking";
  const view: RankingView =
    isPublicRankingRoute && parsedView === "match-form"
      ? "ranking"
      : parsedView;
  const { users } = useUsers();
  const {
    members: hookMembers,
    addMember,
    editMember,
    deleteMember,
  } = useRankingMembers();
  const {
    matches,
    historyMatches,
    isHistoryLoading,
    historyPage,
    historyPageSize,
    addMatch,
    deleteMatch: deleteMatchFn,
    loadMatchHistory,
    setHistoryPage,
    setHistoryPageSize,
    resetHistoryPagination,
    clearAllMatches,
  } = useRankingMatches();
  const { categories, sortedCategories, defaultMemberLevel } =
    useRankingCategories();
  const {
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    setMatchType,
    setTeam1,
    setTeam2,
    setSets,
    setPlayedAt,
    resetForm,
    getValidationError,
  } = useMatchForm();

  // Local state for component-specific UI
  const [selectedPlayer, setSelectedPlayer] = useState<AdvancedStats | null>(
    null,
  );
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>(
    {},
  );
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<RankingSnapshot | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const displayMembers = hookMembers;

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

  const setViewWithRoute = (
    nextView: RankingView,
    mode: "push" | "replace" = "push",
  ) => {
    if (!isOpen) return;
    const safeView =
      isPublicRankingRoute && nextView === "match-form" ? "ranking" : nextView;
    navigate(`${routeBase}/${safeView}`, { replace: mode === "replace" });
  };

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

  useEffect(() => {
    let mounted = true;

    const loadLatestSnapshot = async () => {
      try {
        const snapshot = await getLatestRankingSnapshot();
        if (mounted) {
          setLatestSnapshot(snapshot);
        }
      } catch (error) {
        console.error("Failed to load latest ranking snapshot", error);
      }
    };

    void loadLatestSnapshot();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isSupabaseReady()) return;

    const nextMap = users.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = user.username;
      return acc;
    }, {});
    setUsernamesById(nextMap);
  }, [isOpen, users]);

  // Update selectedCategoryId when categories change
  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId("");
      return;
    }

    setSelectedCategoryId((current) =>
      categories.some((category) => category.id === current)
        ? current
        : (categories[0]?.id ?? ""),
    );
  }, [categories]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [view, location.pathname]);

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

  // Local state for member form editing
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [memberFormName, setMemberFormName] = useState("");
  const [memberFormLevel, setMemberFormLevel] = useState<RankingLevel>("");

  const handleAddOrEditMember = useCallback(() => {
    if (!isAdmin) return;
    if (!sortedCategories.length) return;
    if (!memberFormName.trim()) return;
    if (!memberFormLevel.trim()) return;

    if (isEditing) {
      editMember(isEditing, memberFormName, memberFormLevel);
      setIsEditing(null);
    } else {
      addMember(memberFormName, memberFormLevel);
    }
    setMemberFormName("");
    setMemberFormLevel(defaultMemberLevel);
  }, [
    isAdmin,
    sortedCategories,
    isEditing,
    memberFormName,
    memberFormLevel,
    defaultMemberLevel,
    editMember,
    addMember,
  ]);

  const handleDeleteMember = useCallback(
    (id: number) => {
      if (!isAdmin) return;
      deleteMember(id);
    },
    [isAdmin, deleteMember],
  );

  const handleStartEditMember = useCallback(
    (member: Member) => {
      if (!isAdmin) return;
      setIsEditing(member.id);
      setMemberFormName(member.name);
      setMemberFormLevel(member.level);
    },
    [isAdmin],
  );

  // Calculate rankings before handlers that might use it
  const rankings = useMemo(() => {
    return calculateRankingStats(displayMembers, matches, {
      tau: DEFAULT_RANKING_CONFIG.tau,
      penaltyCoefficient: DEFAULT_RANKING_CONFIG.penaltyCoefficient,
    });
  }, [displayMembers, matches]);

  const handleClearHistory = useCallback(async () => {
    if (!isAdmin) return;
    if (matches.length === 0) return;

    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    try {
      if (rankings.length > 0) {
        try {
          await saveRankingSnapshot(
            rankings.map((player, index) => ({
              memberId: player.id,
              memberName: player.name,
              rank: index + 1,
              rankScore: player.rankScore,
            })),
          );
        } catch (snapshotError) {
          console.error(
            "Failed to save ranking snapshot before clear",
            snapshotError,
          );
        }
      }

      await clearAllMatches(isAdmin);
      resetHistoryPagination();

      try {
        const snapshot = await getLatestRankingSnapshot();
        setLatestSnapshot(snapshot);
      } catch (snapshotError) {
        console.error("Failed to refresh ranking snapshot", snapshotError);
      }
    } catch (error) {
      console.error("Failed to clear matches", error);
    }
  }, [
    isAdmin,
    matches.length,
    rankings,
    t,
    clearAllMatches,
    resetHistoryPagination,
    currentUser?.userId,
  ]);

  const handleDeleteMatch = useCallback(
    async (matchId: number | string) => {
      if (!currentUser) return;

      const confirmed = window.confirm(t("common.confirmDelete"));
      if (!confirmed) return;

      try {
        await deleteMatchFn(matchId, currentUser.userId, isAdmin);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Cannot delete")) {
          window.alert(t("rankingPage.onlyDeleteOwnMatch"));
        } else {
          console.error("Failed to delete match", error);
        }
      }
    },
    [currentUser, isAdmin, deleteMatchFn, t],
  );

  const handleToggleHistory = useCallback(
    async (nextExpanded: boolean) => {
      setIsHistoryExpanded(nextExpanded);
      if (!nextExpanded) return;

      resetHistoryPagination();
      await loadMatchHistory();
    },
    [resetHistoryPagination, loadMatchHistory],
  );

  const handleHistoryPaginationChange = useCallback(
    (page: number, pageSize: number) => {
      setHistoryPage(page);
      setHistoryPageSize(pageSize);
    },
    [setHistoryPage, setHistoryPageSize],
  );

  const handleSaveMatch = useCallback(async () => {
    if (!currentUser) return;

    const error = getValidationError();
    if (error) {
      messageApi.error(error);
      return;
    }

    try {
      await addMatch(
        matchType,
        team1,
        team2,
        sets,
        playedAt,
        currentUser.userId,
        currentUser.username,
      );

      const validSetCount = sets.filter((set) => {
        const scoreA = Number.parseInt(set.team1Score, 10);
        const scoreB = Number.parseInt(set.team2Score, 10);
        return !Number.isNaN(scoreA) && !Number.isNaN(scoreB);
      }).length;

      const totalMinutes = sets.reduce((sum, set) => {
        const minutes = Number.parseInt(String(set.minutes || ""), 10);
        if (!Number.isFinite(minutes) || minutes <= 0) return sum;
        return sum + minutes;
      }, 0);

      // Save ranking snapshot after match to update trends
      try {
        if (rankings.length > 0) {
          await saveRankingSnapshot(
            rankings.map((player, index) => ({
              memberId: player.id,
              memberName: player.name,
              rank: index + 1,
              rankScore: player.rankScore,
            })),
          );
          const snapshot = await getLatestRankingSnapshot();
          setLatestSnapshot(snapshot);
        }
      } catch (snapshotError) {
        console.error(
          "Failed to save ranking snapshot after match",
          snapshotError,
        );
      }

      trackEvent(AnalyticsEventName.RecordMatch, {
        [AnalyticsParamKey.MatchType]: matchType,
        [AnalyticsParamKey.SetCount]: validSetCount,
        [AnalyticsParamKey.DurationMinutes]:
          totalMinutes > 0 ? totalMinutes : 0,
      });
      messageApi.success(t("rankingPage.toastMatchSaved"));
      resetForm();
    } catch (error) {
      console.error("Failed to save match", error);
      messageApi.error(t("rankingPage.cannotSaveMatch"));
    }
  }, [
    currentUser,
    getValidationError,
    addMatch,
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    trackEvent,
    messageApi,
    t,
    resetForm,
    rankings,
  ]);

  const historyMatchesForDisplay = useMemo(
    () =>
      historyMatches.map((match) => ({
        ...match,
        createdByUsername:
          match.createdByUsername || usernamesById[match.createdBy || ""] || "",
      })),
    [historyMatches, usernamesById],
  );

  const pagedHistoryMatches = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return historyMatchesForDisplay.slice(start, start + historyPageSize);
  }, [historyMatchesForDisplay, historyPage, historyPageSize]);

  const rankTrends = useMemo<Record<number, number | "NEW">>(() => {
    if (!latestSnapshot) return {};

    const previousRanksByMemberId = new Map<number, number>();
    const previousRanksByMemberName = new Map<string, number>();
    latestSnapshot.ranks.forEach((entry) => {
      previousRanksByMemberId.set(entry.memberId, entry.rank);
      const memberNameKey = normalizeMemberNameKey(entry.memberName);
      if (memberNameKey && !previousRanksByMemberName.has(memberNameKey)) {
        previousRanksByMemberName.set(memberNameKey, entry.rank);
      }
    });

    return rankings.reduce<Record<number, number | "NEW">>(
      (acc, player, idx) => {
        const currentRank = idx + 1;
        const previousRank =
          previousRanksByMemberId.get(player.id) ??
          previousRanksByMemberName.get(normalizeMemberNameKey(player.name));
        if (previousRank === undefined) {
          acc[player.id] = "NEW";
        } else {
          acc[player.id] = previousRank - currentRank;
        }
        return acc;
      },
      {},
    );
  }, [latestSnapshot, rankings]);

  const showRankTrend = matches.length > 1;

  const memberLevelById = useMemo<Record<number, string>>(
    () =>
      displayMembers.reduce<Record<number, string>>((acc, member) => {
        acc[member.id] = member.level;
        return acc;
      }, {}),
    [displayMembers],
  );

  const currentUserInitial = useMemo(() => {
    if (!currentUser?.username) return "U";
    return currentUser.username.charAt(0).toUpperCase();
  }, [currentUser?.username]);

  const hideFloatingHeaderActions = mobileSidebarOpen;

  const userMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: t("app.home"),
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: t("common.logout"),
        danger: true,
      },
    ],
    [t],
  );

  const guestMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: t("app.home"),
      },
      {
        key: "login",
        icon: <LoginOutlined />,
        label: t("common.login"),
      },
    ],
    [t],
  );

  if (!isOpen) return null;

  return (
    <div className="min-h-screen">
      <Layout
        className="min-h-screen w-full text-slate-900 font-sans"
        style={{ background: "transparent" }}
      >
        <Layout.Header
          className={`z-[55] ${
            mobileSidebarOpen
              ? "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
              : ""
          }`}
          style={DASHBOARD_APPBAR_STYLE}
        >
          <div className="flex h-14 items-center justify-between">
            <div>
              {!mobileSidebarOpen ? (
                <Button
                  type="default"
                  shape="circle"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden"
                  aria-label={t("rankingPage.menu")}
                  icon={<MenuOutlined />}
                ></Button>
              ) : null}
            </div>

            {currentUser && !hideFloatingHeaderActions ? (
              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: ({ key }) => {
                    if (key === "home") {
                      navigate("/");
                      return;
                    }

                    if (key === "logout") {
                      navigate("/");
                      logout();
                    }
                  },
                }}
                trigger={["click"]}
              >
                <Button
                  type="text"
                  shape="circle"
                  title={t("rankingPage.userMenuTitle", {
                    username: currentUser.username,
                  })}
                  aria-label={t("rankingPage.userMenuTitle", {
                    username: currentUser.username,
                  })}
                >
                  {currentUserInitial}
                </Button>
              </Dropdown>
            ) : null}

            {isPublicRankingRoute &&
            !currentUser &&
            !hideFloatingHeaderActions ? (
              <Dropdown
                menu={{
                  items: guestMenuItems,
                  onClick: ({ key }) => {
                    if (key === "home") {
                      navigate("/");
                      return;
                    }

                    if (key === "login") {
                      navigate("/ranking/login", {
                        state: {
                          from: `${location.pathname}${location.search}`,
                        },
                      });
                    }
                  },
                }}
                trigger={["click"]}
              >
                <Button
                  type="text"
                  shape="circle"
                  aria-label={t("rankingPage.guestMenu")}
                  icon={<UserOutlined />}
                />
              </Dropdown>
            ) : null}
          </div>
        </Layout.Header>

        <Layout hasSider style={{ minHeight: 0 }}>
          {/* Sidebar */}
          <RankingSidebar
            currentView={view}
            onSetView={setViewWithRoute}
            onGoHome={onClose}
            isAdmin={isAdmin}
            onGoUsers={() => navigate("/dashboard/users")}
            onGoAudit={() => navigate("/dashboard/audit")}
            onGoCategories={() => navigate("/dashboard/categories")}
            showMatchForm={!isPublicRankingRoute}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
            categoriesActive={location.pathname === "/dashboard/categories"}
          />

          {/* Main Content */}
          <Layout.Content>
            <main
              ref={mainContentRef}
              className="flex-1 overflow-auto px-4 py-4 md:p-8 relative"
              style={{
                paddingBottom: "calc(6rem + var(--mobile-keyboard-inset, 0px))",
              }}
            >
              <div className="max-w-7xl mx-auto">
                <DashboardSectionHeader
                  className="mb-5"
                  icon={
                    view === "member" ? (
                      <Settings className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
                    ) : view === "match-form" ? (
                      <BarChart2 className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
                    ) : (
                      <Award className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
                    )
                  }
                  title={
                    view === "member"
                      ? t("rankingPage.memberManagement")
                      : view === "match-form"
                        ? t("rankingPage.recordResult")
                        : t("rankingPage.clubRanking")
                  }
                  subtitle={t("rankingPage.systemDescription")}
                />

                <DashboardSummaryCards
                  items={[
                    {
                      key: "members",
                      label: t("rankingPage.members"),
                      value: displayMembers.length,
                    },
                    {
                      key: "matches",
                      label: t("rankingPage.matches"),
                      value: matches.length,
                    },
                    {
                      key: "top-rank",
                      label: t("rankingPage.topRank"),
                      value: rankings[0]?.name ?? "-",
                      valueClassName: "text-sm md:text-base truncate",
                    },
                  ]}
                />

                {/* View: Dashboard (Members) */}
                {view === "member" && (
                  <div className="space-y-4">
                    <MembersPanel
                      isEditing={isEditing}
                      newMember={{
                        name: memberFormName,
                        level: memberFormLevel,
                      }}
                      members={displayMembers}
                      categories={sortedCategories}
                      onSetNewMember={(newMember) => {
                        setMemberFormName(newMember.name);
                        setMemberFormLevel(newMember.level);
                      }}
                      onAddOrUpdateMember={handleAddOrEditMember}
                      onStartEdit={handleStartEditMember}
                      onDeleteMember={handleDeleteMember}
                      canManage={isAdmin}
                    />
                  </div>
                )}

                {/* View: Match Form */}
                {view === "match-form" && (
                  <MatchFormPanel
                    members={displayMembers}
                    categories={sortedCategories}
                    matchType={matchType}
                    matchData={{
                      team1,
                      team2,
                      sets,
                      playedAt,
                    }}
                    onSetMatchType={setMatchType}
                    onSetMatchData={(nextData) => {
                      setTeam1(nextData.team1);
                      setTeam2(nextData.team2);
                      setSets(nextData.sets);
                      setPlayedAt(nextData.playedAt);
                    }}
                    onSaveMatch={handleSaveMatch}
                  />
                )}

                {/* View: Rankings */}
                {view === "ranking" && (
                  <RankingPanel
                    rankings={rankings}
                    historyMatches={pagedHistoryMatches}
                    isHistoryExpanded={isHistoryExpanded}
                    isHistoryLoading={isHistoryLoading}
                    onToggleHistory={handleToggleHistory}
                    historyPagination={{
                      current: historyPage,
                      pageSize: historyPageSize,
                      total: isHistoryExpanded
                        ? historyMatchesForDisplay.length
                        : matches.length,
                    }}
                    onHistoryPaginationChange={handleHistoryPaginationChange}
                    rankTrends={rankTrends}
                    showRankTrend={showRankTrend}
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    memberLevelById={memberLevelById}
                    onSelectPlayer={setSelectedPlayer}
                    onClearHistory={handleClearHistory}
                    onDeleteMatch={handleDeleteMatch}
                    isAdmin={isAdmin}
                    currentUserId={currentUser?.userId || ""}
                  />
                )}
              </div>
            </main>
          </Layout.Content>
        </Layout>
      </Layout>

      {/* Player Stats Modal */}
      {selectedPlayer && (
        <PlayerStatsModal
          stats={selectedPlayer}
          penaltyCoefficient={DEFAULT_RANKING_CONFIG.penaltyCoefficient}
          metricVisibility={DEFAULT_RANKING_CONFIG.metricVisibility}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
