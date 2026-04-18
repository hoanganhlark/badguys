import { useMemo, useState, useEffect } from "react";
import {
  getRankingMatches,
  getRankingMembers,
  isFirebaseReady,
  saveRankingMatches,
  saveRankingMembers,
} from "../lib/firebase";
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
import { Award, BarChart2, Settings, X } from "react-feather";

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const RANKING_TAB_PARAM = "rankingTab";

function isRankingView(value: string | null): value is RankingView {
  return value === "dashboard" || value === "match-form" || value === "ranking";
}

function readRankingViewFromUrl(): RankingView {
  const current = new URL(window.location.href).searchParams.get(
    RANKING_TAB_PARAM,
  );
  return isRankingView(current) ? current : "ranking";
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const [view, setView] = useState<RankingView>(() => readRankingViewFromUrl());
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
  const [newMember, setNewMember] = useState({ name: "", level: "Trung bình" });

  // Match Form State
  const [matchType, setMatchType] = useState<"singles" | "doubles">("doubles");
  const [matchData, setMatchData] = useState({
    team1: [] as string[],
    team2: [] as string[],
    sets: [{ team1Score: "", team2Score: "" }] as MatchSetInput[],
  });

  const updateViewRoute = (
    nextView: RankingView,
    mode: "push" | "replace" = "push",
  ) => {
    const url = new URL(window.location.href);
    url.searchParams.set(RANKING_TAB_PARAM, nextView);

    const nextState = {
      ...(window.history.state ?? {}),
      modal: "ranking",
      rankingTab: nextView,
    };

    if (mode === "push") {
      window.history.pushState(nextState, "", url);
      return;
    }

    window.history.replaceState(nextState, "", url);
  };

  const setViewWithRoute = (
    nextView: RankingView,
    mode: "push" | "replace" = "push",
  ) => {
    setView(nextView);
    if (!isOpen) return;
    updateViewRoute(nextView, mode);
  };

  useEffect(() => {
    let mounted = true;

    const hydrateRankingData = async () => {
      if (!isFirebaseReady()) {
        if (mounted) setIsRemoteHydrated(true);
        return;
      }

      try {
        const [remoteMembers, remoteMatches] = await Promise.all([
          getRankingMembers(),
          getRankingMatches(),
        ]);

        if (!mounted) return;

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

  useEffect(() => {
    const onPopState = () => {
      setView(readRankingViewFromUrl());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateViewRoute(view, "replace");
  }, [isOpen, view]);

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

    if (!isRemoteHydrated || !isFirebaseReady()) return;

    void saveRankingMatches(matches).catch((error) => {
      console.error("Failed to save ranking matches to Firestore", error);
    });
  }, [matches, isRemoteHydrated]);

  // Logic: Thành viên
  const handleAddMember = () => {
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
    setNewMember({ name: "", level: "Trung bình" });
  };

  const deleteMember = (id: number) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const startEdit = (member: Member) => {
    setIsEditing(member.id);
    setNewMember({ name: member.name, level: member.level });
  };

  // Logic: Trận đấu
  const handleSaveMatch = () => {
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

    const newMatch: Match = {
      id: Date.now(),
      type: matchType,
      team1: selectedTeam1,
      team2: selectedTeam2,
      sets: parsedSets,
      date: new Date().toLocaleDateString("vi-VN"),
    };

    setMatches([newMatch, ...matches]);
    setMatchData({
      team1: [],
      team2: [],
      sets: [{ team1Score: "", team2Score: "" }],
    });
    setViewWithRoute("ranking", "push");
  };

  // Advanced Rankings with Stats
  const rankings = useMemo(() => {
    const stats = members.map((m) => calculateAdvancedStats(m.name, matches));
    return stats.sort((a, b) => b.rankScore - a.rankScore);
  }, [members, matches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex">
      <div className="flex min-h-screen bg-white text-gray-900 font-sans w-full">
        {/* Sidebar */}
        <RankingSidebar currentView={view} onSetView={setViewWithRoute} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-8 md:right-8 z-10 h-8 w-8 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {view === "dashboard" && (
                <>
                  <Settings className="h-8 w-8" /> Quản lý thành viên
                </>
              )}
              {view === "match-form" && (
                <>
                  <BarChart2 className="h-8 w-8" /> Ghi nhận kết quả
                </>
              )}
              {view === "ranking" && (
                <>
                  <Award className="h-8 w-8" /> Bảng xếp hạng câu lạc bộ
                </>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Hệ thống theo dõi trình độ và kết quả thi đấu
            </p>
          </header>

          {/* View: Dashboard (Members) */}
          {view === "dashboard" && (
            <MembersPanel
              isEditing={isEditing}
              newMember={newMember}
              members={members}
              onSetNewMember={setNewMember}
              onAddOrUpdateMember={handleAddMember}
              onStartEdit={startEdit}
              onDeleteMember={deleteMember}
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
            />
          )}
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
