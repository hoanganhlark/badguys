import { useMemo, useState, useEffect, useRef } from "react";
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
  createMatch,
  deleteMatch,
  getRankingMembers,
  isFirebaseReady,
  saveRankingMembers,
  subscribeMatches,
  subscribeUsers,
} from "../lib/firebase";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { calculateRankingStats } from "../lib/rankingStats";
import {
  AnalyticsEventName,
  AnalyticsParamKey,
  trackEvent,
} from "../lib/analytics";
import {
  buildMembersFromMatches,
  loadMatchesFromStorage,
  loadMembersFromStorage,
  loadRankingSettingsFromStorage,
  saveMatchesToStorage,
  saveMembersToStorage,
  saveRankingSettingsToStorage,
} from "../lib/rankingStorage";
import MatchFormPanel from "./ranking/MatchFormPanel";
import MembersPanel from "./ranking/MembersPanel";
import PlayerStatsModal from "./ranking/PlayerStatsModal";
import RankingPanel from "./ranking/RankingPanel";
import RankingSidebar from "./ranking/RankingSidebar";
import type {
  AdvancedStats,
  Match,
  MatchSetInput,
  Member,
  RankingView,
} from "./ranking/types";
import type { MatchRecord, RankingLevel, RankingSettings } from "../types";
import { Award, BarChart2, Settings } from "react-feather";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

function isRankingView(value: string | null): value is RankingView {
  return value === "member" || value === "match-form" || value === "ranking";
}

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
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage(),
  );
  const [matches, setMatches] = useState<Match[]>(() =>
    loadMatchesFromStorage(),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<AdvancedStats | null>(
    null,
  );
  const [isRemoteHydrated, setIsRemoteHydrated] = useState(false);
  const [usernamesById, setUsernamesById] = useState<Record<string, string>>(
    {},
  );
  const mainContentRef = useRef<HTMLElement | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Member Form State
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [newMember, setNewMember] = useState<{
    name: string;
    level: RankingLevel;
  }>({ name: "", level: "Lo" });

  // Match Form State
  const [matchType, setMatchType] = useState<"singles" | "doubles">("doubles");
  const [matchData, setMatchData] = useState({
    team1: [] as string[],
    team2: [] as string[],
    sets: [{ team1Score: "", team2Score: "", minutes: "" }] as MatchSetInput[],
    playedAt: toDateTimeLocal(new Date()),
  });
  const [rankingSettings, setRankingSettings] = useState<RankingSettings>(() =>
    loadRankingSettingsFromStorage(currentUser?.userId || "guest"),
  );
  const rankingSettingsStorageScope = currentUser?.userId || "guest";

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
    let unsubscribeMatches: (() => void) | null = null;

    const hydrateRankingData = async () => {
      if (!isFirebaseReady()) {
        if (mounted) setIsRemoteHydrated(true);
        return;
      }

      try {
        const remoteMembers = await getRankingMembers();

        if (!mounted) return;

        const hasRemoteMembers = remoteMembers.length > 0;
        let shouldDeriveMembersFromMatches = !hasRemoteMembers;

        if (hasRemoteMembers) {
          setMembers(remoteMembers);
        }

        unsubscribeMatches = subscribeMatches(
          (remoteMatchRecords) => {
            if (!mounted) return;

            const remoteMatches = remoteMatchRecords.map(
              mapMatchRecordToRankingMatch,
            );

            setMatches(remoteMatches);

            if (shouldDeriveMembersFromMatches) {
              const fallbackMembers = buildMembersFromMatches(remoteMatches);

              if (fallbackMembers.length > 0) {
                setMembers(fallbackMembers);
                shouldDeriveMembersFromMatches = false;

                void saveRankingMembers(fallbackMembers).catch((error) => {
                  console.error(
                    "Failed to backfill ranking members from match history",
                    error,
                  );
                });
              }
            }

            setIsRemoteHydrated(true);
          },
          (error) => {
            console.error("Failed to subscribe ranking matches", error);
            setIsRemoteHydrated(true);
          },
        );
      } catch (error) {
        console.error("Failed to load ranking data from Firestore", error);
        if (mounted) setIsRemoteHydrated(true);
      }
    };

    void hydrateRankingData();

    return () => {
      mounted = false;
      if (unsubscribeMatches) {
        unsubscribeMatches();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isFirebaseReady()) return;

    const unsubscribe = subscribeUsers(
      (users) => {
        const nextMap = users.reduce<Record<string, string>>((acc, user) => {
          acc[user.id] = user.username;
          return acc;
        }, {});
        setUsernamesById(nextMap);
      },
      () => {
        setUsernamesById({});
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

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

  // Persist members
  useEffect(() => {
    saveMembersToStorage(members);

    if (!isRemoteHydrated || !isFirebaseReady()) return;

    void saveRankingMembers(members).catch((error) => {
      console.error("Failed to save ranking members to Firestore", error);
    });
  }, [members, isRemoteHydrated]);

  // Persist matches
  useEffect(() => {
    saveMatchesToStorage(matches);
  }, [matches, isRemoteHydrated]);

  useEffect(() => {
    saveRankingSettingsToStorage(rankingSettings, rankingSettingsStorageScope);
  }, [rankingSettings, rankingSettingsStorageScope]);

  useEffect(() => {
    setRankingSettings(
      loadRankingSettingsFromStorage(rankingSettingsStorageScope),
    );
  }, [rankingSettingsStorageScope]);

  // Logic: Thành viên
  const handleAddMember = () => {
    if (!isAdmin) return;
    if (!newMember.name.trim()) return;
    if (isEditing) {
      setMembers(
        members.map((m) =>
          m.id === isEditing ? { ...newMember, id: isEditing } : m,
        ),
      );
      setIsEditing(null);
    } else {
      setMembers([...members, { ...newMember, id: Date.now() }]);
    }
    setNewMember({ name: "", level: "Lo" });
  };

  const deleteMember = (id: number) => {
    if (!isAdmin) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const startEdit = (member: Member) => {
    if (!isAdmin) return;
    setIsEditing(member.id);
    setNewMember({ name: member.name, level: member.level });
  };

  const handleClearHistory = async () => {
    if (!isAdmin) return;
    if (matches.length === 0) return;

    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    try {
      await Promise.all(matches.map((match) => deleteMatch(String(match.id))));
      setMatches([]);
    } catch (error) {
      console.error("Failed to clear matches", error);
    }
  };

  const handleDeleteMatch = async (matchId: number | string) => {
    const target = matches.find(
      (match) => String(match.id) === String(matchId),
    );
    if (!target || !currentUser) return;

    if (!isAdmin && target.createdBy !== currentUser.userId) {
      window.alert(t("rankingPage.onlyDeleteOwnMatch"));
      return;
    }

    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    try {
      await deleteMatch(String(matchId));
      setMatches((prev) =>
        prev.filter((match) => String(match.id) !== String(matchId)),
      );
    } catch (error) {
      console.error("Failed to delete match", error);
    }
  };

  // Logic: Trận đấu
  const handleSaveMatch = async () => {
    if (!currentUser) return;

    const { team1, team2, sets } = matchData;

    const slotCount = matchType === "singles" ? 1 : 2;
    const selectedTeam1 = team1
      .slice(0, slotCount)
      .filter((name) => name?.trim());
    const selectedTeam2 = team2
      .slice(0, slotCount)
      .filter((name) => name?.trim());

    if (
      selectedTeam1.length !== slotCount ||
      selectedTeam2.length !== slotCount
    ) {
      return;
    }

    const parsedSets = sets
      .map((set) => {
        const scoreA = Number.parseInt(set.team1Score, 10);
        const scoreB = Number.parseInt(set.team2Score, 10);
        const minutes = Number.parseInt(String(set.minutes || ""), 10);

        if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return null;
        if (scoreA < 0 || scoreB < 0) return null;
        if (!Number.isNaN(minutes) && minutes < 0) return null;

        return `${scoreA}-${scoreB}${Number.isFinite(minutes) && minutes > 0 ? `@${minutes}` : ""}`;
      })
      .filter((score): score is string => score !== null);

    if (parsedSets.length === 0) return;

    const totalMinutes = sets.reduce((sum, set) => {
      const minutes = Number.parseInt(String(set.minutes || ""), 10);
      if (!Number.isFinite(minutes) || minutes <= 0) return sum;
      return sum + minutes;
    }, 0);
    const playedAtIso = parseToIsoDate(matchData.playedAt);

    try {
      const created = await createMatch({
        playerA: selectedTeam1.join(" / "),
        playerB: selectedTeam2.join(" / "),
        score: parsedSets.join(","),
        playedAt: playedAtIso,
        durationMinutes: totalMinutes > 0 ? totalMinutes : undefined,
        createdBy: currentUser.userId,
        createdByUsername: currentUser.username,
      });

      const newMatch = mapMatchRecordToRankingMatch(created);
      setMatches((prev) => [newMatch, ...prev]);
      setMatchData({
        team1: [],
        team2: [],
        sets: [{ team1Score: "", team2Score: "", minutes: "" }],
        playedAt: toDateTimeLocal(new Date()),
      });
      trackEvent(AnalyticsEventName.RecordMatch, {
        [AnalyticsParamKey.MatchType]: matchType,
        [AnalyticsParamKey.SetCount]: parsedSets.length,
        [AnalyticsParamKey.DurationMinutes]:
          totalMinutes > 0 ? totalMinutes : 0,
      });
      messageApi.success(t("rankingPage.toastMatchSaved"));
    } catch (error) {
      console.error("Failed to save match", error);
      window.alert(t("rankingPage.cannotSaveMatch"));
    }
  };

  // Advanced Rankings with Stats
  const rankings = useMemo(() => {
    return calculateRankingStats(members, matches, {
      tau: rankingSettings.tau,
      penaltyCoefficient: rankingSettings.penaltyCoefficient,
    });
  }, [
    members,
    matches,
    rankingSettings.penaltyCoefficient,
    rankingSettings.tau,
  ]);

  const matchesForDisplay = useMemo(
    () =>
      matches.map((match) => ({
        ...match,
        createdByUsername:
          match.createdByUsername || usernamesById[match.createdBy || ""] || "",
      })),
    [matches, usernamesById],
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
    <div className="fixed inset-0 z-[60] bg-slate-950/40 flex">
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
          style={{
            position: "sticky",
            top: 0,
            zIndex: 55,
            height: 56,
            lineHeight: "56px",
            paddingInline: 0,
            borderBottom: "1px solid #e2e8f0",
            background: "rgba(250, 250, 250, 0.92)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div>
              {!mobileSidebarOpen ? (
                <Button
                  type="text"
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
            showMatchForm={!isPublicRankingRoute}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />

          {/* Main Content */}
          <Layout.Content>
            <main
              ref={mainContentRef}
              className="dashboard-main-scroll flex-1 overflow-auto px-4 py-4 md:p-8 relative"
            >
              <div className="max-w-7xl mx-auto">
                <header className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:px-6 md:py-5">
                  <h1 className="text-xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                    {view === "member" && (
                      <>
                        <Settings className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />{" "}
                        {t("rankingPage.memberManagement")}
                      </>
                    )}
                    {view === "match-form" && (
                      <>
                        <BarChart2 className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                        {t("rankingPage.recordResult")}
                      </>
                    )}
                    {view === "ranking" && (
                      <>
                        <Award className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />{" "}
                        {t("rankingPage.clubRanking")}
                      </>
                    )}
                  </h1>
                  <p className="text-slate-500 text-xs md:text-sm mt-1.5">
                    {t("rankingPage.systemDescription")}
                  </p>
                </header>

                <section className="grid grid-cols-3 gap-2 mb-4 md:mb-6 md:max-w-2xl">
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">
                      {t("rankingPage.members")}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {members.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">
                      {t("rankingPage.matches")}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {matches.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                    <p className="text-[11px] text-slate-500">
                      {t("rankingPage.topRank")}
                    </p>
                    <p className="text-sm md:text-base font-bold text-slate-900 truncate">
                      {rankings[0]?.name ?? "-"}
                    </p>
                  </div>
                </section>

                {/* View: Dashboard (Members) */}
                {view === "member" && (
                  <div className="space-y-4">
                    <MembersPanel
                      isEditing={isEditing}
                      newMember={newMember}
                      members={members}
                      onSetNewMember={setNewMember}
                      onAddOrUpdateMember={handleAddMember}
                      onStartEdit={startEdit}
                      onDeleteMember={deleteMember}
                      canManage={isAdmin}
                    />
                    {isAdmin ? (
                      <div className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5 space-y-3">
                        <h3 className="text-sm font-semibold uppercase text-slate-700">
                          {t("rankingPage.rankingConfig")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="text-sm text-slate-700">
                            Tau (0.3 - 1.2)
                            <input
                              type="number"
                              min={0.3}
                              max={1.2}
                              step={0.1}
                              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200"
                              value={rankingSettings.tau}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (!Number.isFinite(value)) return;
                                setRankingSettings((prev) => ({
                                  ...prev,
                                  tau: Math.min(1.2, Math.max(0.3, value)),
                                }));
                              }}
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            {t("rankingPage.penaltyCoefficient")}
                            <input
                              type="number"
                              min={0}
                              max={2}
                              step={0.05}
                              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200"
                              value={rankingSettings.penaltyCoefficient}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                if (!Number.isFinite(value)) return;
                                setRankingSettings((prev) => ({
                                  ...prev,
                                  penaltyCoefficient: Math.min(
                                    2,
                                    Math.max(0, value),
                                  ),
                                }));
                              }}
                            />
                          </label>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            {t("rankingPage.showMetricsInModal")}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {[
                              ["skill", t("rankingPage.skill")],
                              ["stability", t("rankingPage.stability")],
                              ["uncertainty", t("rankingPage.uncertainty")],
                              ["motivation", t("rankingPage.motivation")],
                              ["winRate", t("rankingPage.winRate")],
                            ].map(([key, label]) => (
                              <label
                                key={key}
                                className="inline-flex items-center gap-2 text-xs text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    rankingSettings.metricVisibility[
                                      key as keyof RankingSettings["metricVisibility"]
                                    ]
                                  }
                                  onChange={(e) =>
                                    setRankingSettings((prev) => ({
                                      ...prev,
                                      metricVisibility: {
                                        ...prev.metricVisibility,
                                        [key]: e.target.checked,
                                      },
                                    }))
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* View: Match Form */}
                {view === "match-form" && (
                  <MatchFormPanel
                    members={members}
                    matchType={matchType}
                    matchData={matchData}
                    onSetMatchType={setMatchType}
                    onSetMatchData={setMatchData}
                    onSaveMatch={handleSaveMatch}
                  />
                )}

                {/* View: Rankings */}
                {view === "ranking" && (
                  <RankingPanel
                    rankings={rankings}
                    matches={matchesForDisplay}
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
          penaltyCoefficient={rankingSettings.penaltyCoefficient}
          metricVisibility={rankingSettings.metricVisibility}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function mapMatchRecordToRankingMatch(record: MatchRecord): Match {
  const team1 = String(record.playerA || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const team2 = String(record.playerB || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const sets = String(record.score || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasDoubleTeams = team1.length > 1 || team2.length > 1;

  return {
    id: record.id,
    type: hasDoubleTeams ? "doubles" : "singles",
    team1,
    team2,
    sets,
    date: formatDateTime(record.playedAt || record.createdAt),
    playedAt: record.playedAt,
    durationMinutes: record.durationMinutes,
    createdBy: record.createdBy,
    createdByUsername: record.createdByUsername,
  };
}

function formatDateTime(value?: string): string {
  if (!value) return "--/--/---- --:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function parseToIsoDate(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return new Date().toISOString();
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function toDateTimeLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
