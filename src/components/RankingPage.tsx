import { useMemo, useState, useEffect } from "react";
import {
  createMatch,
  deleteMatch,
  getMatches,
  getRankingMembers,
  isFirebaseReady,
  saveRankingMembers,
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
import { Award, BarChart2, Settings } from "react-feather";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

function isRankingView(value: string | null): value is RankingView {
  return value === "member" || value === "match-form" || value === "ranking";
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const matchedRoute = matchPath("/dashboard/:tab", location.pathname);
  const tab = matchedRoute?.params.tab ?? null;
  const view: RankingView = isRankingView(tab) ? tab : "ranking";
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

  const setViewWithRoute = (
    nextView: RankingView,
    mode: "push" | "replace" = "push",
  ) => {
    if (!isOpen) return;
    navigate(`/dashboard/${nextView}`, { replace: mode === "replace" });
  };

  useEffect(() => {
    if (!isOpen) return;
    if (tab == null || isRankingView(tab)) return;
    navigate("/dashboard/ranking", { replace: true });
  }, [isOpen, navigate, tab]);

  useEffect(() => {
    let mounted = true;

    const hydrateRankingData = async () => {
      if (!isFirebaseReady()) {
        if (mounted) setIsRemoteHydrated(true);
        return;
      }

      try {
        const [remoteMembers, remoteMatchRecords] = await Promise.all([
          getRankingMembers(),
          getMatches(),
        ]);

        if (!mounted) return;

        const remoteMatches = remoteMatchRecords.map(
          mapMatchRecordToRankingMatch,
        );

        const hasRemoteMembers = remoteMembers.length > 0;
        const fallbackMembers = hasRemoteMembers
          ? remoteMembers
          : buildMembersFromMatches(remoteMatches);

        // Use DB as the source of truth when Firestore is reachable.
        setMembers(fallbackMembers);
        setMatches(remoteMatches);

        // Auto-repair missing members document based on DB matches.
        if (!hasRemoteMembers && fallbackMembers.length > 0) {
          void saveRankingMembers(fallbackMembers).catch((error) => {
            console.error(
              "Failed to backfill ranking members from match history",
              error,
            );
          });
        }
      } catch (error) {
        console.error("Failed to load ranking data from Firestore", error);
      } finally {
        if (mounted) setIsRemoteHydrated(true);
      }
    };

    void hydrateRankingData();

    return () => {
      mounted = false;
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

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa toàn bộ lịch sử trận đấu?",
    );
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

    const confirmed = window.confirm("Bạn có chắc muốn xóa trận này?");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/40 flex">
      <div className="flex flex-col md:flex-row min-h-screen w-full text-slate-900 font-sans bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50">
        {/* Sidebar */}
        <RankingSidebar
          currentView={view}
          onSetView={setViewWithRoute}
          onGoHome={onClose}
          isAdmin={isAdmin}
          onGoUsers={() => navigate("/users")}
        />

        {/* Main Content */}
        <main className="flex-1 px-4 pb-24 pt-4 md:p-8 md:pb-8 overflow-auto relative">
          <div className="max-w-7xl mx-auto">
            <header className="mb-5 rounded-2xl border border-white/80 bg-white/85 backdrop-blur px-4 py-4 shadow-sm md:px-6 md:py-5">
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
                matches={matches}
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
  };
}

function formatDateTime(value?: string): string {
  if (!value) return "--/--/---- --:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
