import { useMemo, useState, useEffect, useRef } from "react";
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
import { calculateAdvancedStats } from "../lib/rankingStats";
import {
  buildMembersFromMatches,
  loadMatchesFromStorage,
  loadMembersFromStorage,
  saveMatchesToStorage,
  saveMembersToStorage,
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
import type { MatchRecord, RankingLevel } from "../types";
import { Award, BarChart2, LogIn, LogOut, Menu, Settings } from "react-feather";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

function isRankingView(value: string | null): value is RankingView {
  return value === "member" || value === "match-form" || value === "ranking";
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const { currentUser, isAdmin, logout } = useAuth();
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const guestMenuRef = useRef<HTMLDivElement | null>(null);
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
    sets: [{ team1Score: "", team2Score: "" }] as MatchSetInput[],
  });

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
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!guestMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!guestMenuRef.current) return;
      if (guestMenuRef.current.contains(event.target as Node)) return;
      setGuestMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [guestMenuOpen]);

  useEffect(() => {
    if (currentUser) return;
    setUserMenuOpen(false);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser || !isPublicRankingRoute) {
      setGuestMenuOpen(false);
    }
  }, [currentUser, isPublicRankingRoute]);

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
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
    if (!confirmed) return;
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

    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
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
      window.alert("Bạn chỉ có thể xóa trận do chính bạn tạo.");
      return;
    }

    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
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

        if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return null;
        if (scoreA < 0 || scoreB < 0) return null;
        return `${scoreA}-${scoreB}`;
      })
      .filter((score): score is string => score !== null);

    if (parsedSets.length === 0) return;

    try {
      const created = await createMatch({
        playerA: selectedTeam1.join(" / "),
        playerB: selectedTeam2.join(" / "),
        score: parsedSets.join(","),
        createdBy: currentUser.userId,
        createdByUsername: currentUser.username,
      });

      const newMatch = mapMatchRecordToRankingMatch(created);
      setMatches((prev) => [newMatch, ...prev]);
      setMatchData({
        team1: [],
        team2: [],
        sets: [{ team1Score: "", team2Score: "" }],
      });
      setViewWithRoute("ranking", "push");
    } catch (error) {
      console.error("Failed to save match", error);
      window.alert("Không thể lưu trận đấu. Vui lòng thử lại.");
    }
  };

  // Advanced Rankings with Stats
  const rankings = useMemo(() => {
    const stats = members.map((m) => calculateAdvancedStats(m.name, matches));
    return stats.sort((a, b) => b.rankScore - a.rankScore);
  }, [members, matches]);

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

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    setUserMenuOpen(false);
    setGuestMenuOpen(false);
  }, [mobileSidebarOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/40 flex">
      <div className="dashboard-surface flex flex-col md:flex-row min-h-screen w-full text-slate-900 font-sans">
        {!mobileSidebarOpen ? (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden fixed top-5 left-5 z-[70] h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm inline-flex items-center justify-center hover:bg-slate-50"
            aria-label="Mở menu dashboard"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        {currentUser && !hideFloatingHeaderActions ? (
          <div
            ref={userMenuRef}
            className="fixed top-5 right-5 md:top-8 md:right-8 z-[70]"
          >
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm inline-flex items-center justify-center text-sm font-bold uppercase hover:bg-slate-50"
              title={`Đăng nhập: ${currentUser.username}`}
              aria-label={`Đăng nhập: ${currentUser.username}`}
            >
              {currentUserInitial}
            </button>

            {userMenuOpen ? (
              <div className="fixed top-16 right-5 md:top-20 md:right-8 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500 truncate">
                  {currentUser.username}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/");
                  }}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                >
                  <Award className="h-4 w-4" />
                  Về trang chủ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/");
                    logout();
                  }}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {isPublicRankingRoute && !currentUser && !hideFloatingHeaderActions ? (
          <div
            ref={guestMenuRef}
            className="fixed top-5 right-5 md:top-8 md:right-8 z-[70]"
          >
            <button
              type="button"
              onClick={() => setGuestMenuOpen((prev) => !prev)}
              aria-label="Mở menu đăng nhập"
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              <LogIn className="h-5 w-5" />
            </button>

            {guestMenuOpen ? (
              <div className="fixed top-16 right-5 md:top-20 md:right-8 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setGuestMenuOpen(false);
                    navigate("/");
                  }}
                  className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Về trang chủ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuestMenuOpen(false);
                    navigate("/ranking/login", {
                      state: { from: `${location.pathname}${location.search}` },
                    });
                  }}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Đăng nhập
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Sidebar */}
        <RankingSidebar
          currentView={view}
          onSetView={setViewWithRoute}
          onGoHome={onClose}
          isAdmin={isAdmin}
          onGoUsers={() => navigate("/users")}
          showMatchForm={!isPublicRankingRoute}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <main
          ref={mainContentRef}
          className="dashboard-main-scroll flex-1 px-4 pt-4 md:p-8 overflow-auto relative"
        >
          <div className="max-w-7xl mx-auto">
            <header className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:px-6 md:py-5">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                {view === "member" && (
                  <>
                    <Settings className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />{" "}
                    Quản lý thành viên
                  </>
                )}
                {view === "match-form" && (
                  <>
                    <BarChart2 className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                    Ghi nhận kết quả
                  </>
                )}
                {view === "ranking" && (
                  <>
                    <Award className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />{" "}
                    Bảng xếp hạng câu lạc bộ
                  </>
                )}
              </h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1.5">
                Hệ thống theo dõi trình độ và kết quả thi đấu
              </p>
            </header>

            <section className="grid grid-cols-3 gap-2 mb-4 md:mb-6 md:max-w-2xl">
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Thành viên</p>
                <p className="text-lg font-bold text-slate-900">
                  {members.length}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Trận đấu</p>
                <p className="text-lg font-bold text-slate-900">
                  {matches.length}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Top rank</p>
                <p className="text-sm md:text-base font-bold text-slate-900 truncate">
                  {rankings[0]?.name ?? "-"}
                </p>
              </div>
            </section>

            {/* View: Dashboard (Members) */}
            {view === "member" && (
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
      </div>

      {/* Player Stats Modal */}
      {selectedPlayer && (
        <PlayerStatsModal
          stats={selectedPlayer}
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
    date: formatDateTime(record.createdAt),
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
