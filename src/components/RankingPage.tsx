import { useMemo, useState, useEffect } from "react";

interface Member {
  id: number;
  name: string;
  level: string;
}

interface Match {
  id: number;
  type: "singles" | "doubles";
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  date: string;
}

interface RankingStats {
  name: string;
  wins: number;
  matches: number;
}

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_MEMBERS_KEY = "rankingMembers";
const STORAGE_MATCHES_KEY = "rankingMatches";

function loadMembersFromStorage(): Member[] {
  try {
    const stored = localStorage.getItem(STORAGE_MEMBERS_KEY);
    return stored
      ? JSON.parse(stored)
      : [
          { id: 1, name: "Nguyễn Văn A", level: "Khá" },
          { id: 2, name: "Trần Thị B", level: "Trung bình" },
          { id: 3, name: "Lê Văn C", level: "Giỏi" },
        ];
  } catch {
    return [
      { id: 1, name: "Nguyễn Văn A", level: "Khá" },
      { id: 2, name: "Trần Thị B", level: "Trung bình" },
      { id: 3, name: "Lê Văn C", level: "Giỏi" },
    ];
  }
}

function loadMatchesFromStorage(): Match[] {
  try {
    const stored = localStorage.getItem(STORAGE_MATCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMembersToStorage(members: Member[]) {
  localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));
}

function saveMatchesToStorage(matches: Match[]) {
  localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches));
}

// SVG Icons - all inline
function IconTrophy({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M6 9H3v6h3m0 0h12m0 0h3v-6h-3m0 0V5h-2V3m0 0h-6v2m-2 4h0M5 15a1 1 0 001 1h12a1 1 0 001-1v-2H5v2z" />
    </svg>
  );
}

function IconUsers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconTrash({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconEdit({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L21 6.5z" />
    </svg>
  );
}

function IconHistory({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconDashboard({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconUserPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  id,
  currentView,
  onSetView,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  id: string;
  currentView: string;
  onSetView: (view: string) => void;
}) {
  return (
    <button
      onClick={() => onSetView(id)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
        currentView === id
          ? "bg-black text-white"
          : "hover:bg-gray-100 text-gray-600"
      }`}
    >
      <Icon />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const [view, setView] = useState<"dashboard" | "match-form" | "ranking">(
    "dashboard"
  );
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage()
  );
  const [matches, setMatches] = useState<Match[]>(() =>
    loadMatchesFromStorage()
  );

  // Member Form State
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [newMember, setNewMember] = useState({ name: "", level: "Trung bình" });

  // Match Form State
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [matchData, setMatchData] = useState({
    team1: [] as string[],
    team2: [] as string[],
    score1: 0,
    score2: 0,
  });

  // Persist members to localStorage
  useEffect(() => {
    saveMembersToStorage(members);
  }, [members]);

  // Persist matches to localStorage
  useEffect(() => {
    saveMatchesToStorage(matches);
  }, [matches]);

  // Logic: Thành viên
  const handleAddMember = () => {
    if (!newMember.name.trim()) return;
    if (isEditing) {
      setMembers(
        members.map((m) =>
          m.id === isEditing ? { ...newMember, id: isEditing } : m
        )
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
    const { team1, team2, score1, score2 } = matchData;
    if (team1.length === 0 || team2.length === 0) return;

    const newMatch: Match = {
      id: Date.now(),
      type: matchType,
      team1: [...team1],
      team2: [...team2],
      score1: parseInt(String(score1)),
      score2: parseInt(String(score2)),
      date: new Date().toLocaleDateString("vi-VN"),
    };

    setMatches([newMatch, ...matches]);
    setMatchData({ team1: [], team2: [], score1: 0, score2: 0 });
    setView("ranking");
  };

  // Logic: Xếp hạng (Ranking)
  const rankings = useMemo(() => {
    const stats: Record<string, RankingStats> = {};
    members.forEach((m) => {
      stats[m.name] = { name: m.name, wins: 0, matches: 0 };
    });

    matches.forEach((match) => {
      const allPlayers = [...match.team1, ...match.team2];
      allPlayers.forEach((p) => {
        if (stats[p]) stats[p].matches += 1;
      });

      const winnerTeam =
        match.score1 > match.score2 ? match.team1 : match.team2;
      winnerTeam.forEach((p) => {
        if (stats[p]) stats[p].wins += 1;
      });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    });
  }, [members, matches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex">
      <div className="flex min-h-screen bg-[#F9FAFB] text-gray-900 font-sans w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block">
          <div className="flex items-center space-x-2 mb-10">
            <div className="bg-black p-1.5 rounded-lg">
              <IconTrophy className="text-white h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              BADMINTON PRO
            </span>
          </div>

          <nav className="space-y-2">
            <SidebarItem
              icon={IconDashboard}
              label="Bảng điều khiển"
              id="dashboard"
              currentView={view}
              onSetView={setView}
            />
            <SidebarItem
              icon={IconPlus}
              label="Nhập trận đấu"
              id="match-form"
              currentView={view}
              onSetView={setView}
            />
            <SidebarItem
              icon={IconTrophy}
              label="Bảng xếp hạng"
              id="ranking"
              currentView={view}
              onSetView={setView}
            />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-10 overflow-auto relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-10 md:right-10 z-10 h-10 w-10 rounded-full
                       border border-slate-200 bg-white text-slate-600 shadow-sm
                       hover:bg-slate-50 transition-colors flex items-center justify-center"
            aria-label="Đóng"
          >
            <IconClose />
          </button>

          <header className="mb-8">
            <h1 className="text-2xl font-bold capitalize">
              {view === "dashboard" && "Quản lý thành viên"}
              {view === "match-form" && "Ghi nhận kết quả"}
              {view === "ranking" && "Bảng xếp hạng câu lạc bộ"}
            </h1>
            <p className="text-gray-500 text-sm">
              Hệ thống theo dõi trình độ và kết quả thi đấu.
            </p>
          </header>

          {/* View: Dashboard (Members) */}
          {view === "dashboard" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                  {isEditing ? "Cập nhật thành viên" : "Thêm thành viên mới"}
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Họ và tên..."
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                  <select
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white"
                    value={newMember.level}
                    onChange={(e) =>
                      setNewMember({ ...newMember, level: e.target.value })
                    }
                  >
                    <option>Yếu</option>
                    <option>Trung bình</option>
                    <option>Khá</option>
                    <option>Giỏi</option>
                  </select>
                  <button
                    onClick={handleAddMember}
                    className="bg-black text-white px-6 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    {isEditing ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <IconUserPlus className="h-4 w-4" />
                    )}
                    {isEditing ? "Lưu" : "Thêm"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                        Thành viên
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                        Trình độ
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium">{member.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-xs rounded-full font-medium">
                            {member.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="p-2 text-gray-400 hover:text-blue-500"
                            >
                              <IconEdit />
                            </button>
                            <button
                              onClick={() => deleteMember(member.id)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View: Match Form */}
          {view === "match-form" && (
            <div className="max-w-3xl bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setMatchType("singles")}
                  className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                    matchType === "singles"
                      ? "bg-black text-white border-black"
                      : "border-gray-200"
                  }`}
                >
                  Đánh Đơn
                </button>
                <button
                  onClick={() => setMatchType("doubles")}
                  className={`flex-1 py-3 rounded-xl border font-medium transition-all ${
                    matchType === "doubles"
                      ? "bg-black text-white border-black"
                      : "border-gray-200"
                  }`}
                >
                  Đánh Đôi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 font-bold text-4xl italic hidden md:block">
                  VS
                </div>

                {/* Team 1 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-center">Đội A</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map(
                      (_, i) => (
                        <select
                          key={i}
                          className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50"
                          onChange={(e) => {
                            const newTeam = [...matchData.team1];
                            newTeam[i] = e.target.value;
                            setMatchData({
                              ...matchData,
                              team1: newTeam,
                            });
                          }}
                          value={matchData.team1[i] || ""}
                        >
                          <option value="">Chọn VĐV...</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      )
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Điểm số"
                    className="w-full text-center text-4xl font-bold py-4 rounded-2xl border border-gray-200"
                    value={matchData.score1}
                    onChange={(e) =>
                      setMatchData({
                        ...matchData,
                        score1: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                {/* Team 2 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-center">Đội B</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map(
                      (_, i) => (
                        <select
                          key={i}
                          className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50"
                          onChange={(e) => {
                            const newTeam = [...matchData.team2];
                            newTeam[i] = e.target.value;
                            setMatchData({
                              ...matchData,
                              team2: newTeam,
                            });
                          }}
                          value={matchData.team2[i] || ""}
                        >
                          <option value="">Chọn VĐV...</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      )
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Điểm số"
                    className="w-full text-center text-4xl font-bold py-4 rounded-2xl border border-gray-200"
                    value={matchData.score2}
                    onChange={(e) =>
                      setMatchData({
                        ...matchData,
                        score2: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMatch}
                className="w-full mt-10 bg-black text-white py-4 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-[0.98]"
              >
                HOÀN TẤT & LƯU KẾT QUẢ
              </button>
            </div>
          )}

          {/* View: Rankings */}
          {view === "ranking" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Table */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                          Hạng
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                          Vận động viên
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">
                          Số trận
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">
                          Thắng
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">
                          Tỷ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rankings.map((player, index) => (
                        <tr key={player.name} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            {index < 3 ? (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : index === 1
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {index + 1}
                              </div>
                            ) : (
                              <span className="px-3 text-gray-400 font-medium">
                                {index + 1}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold">{player.name}</td>
                          <td className="px-6 py-4 text-center">
                            {player.matches}
                          </td>
                          <td className="px-6 py-4 text-center text-green-600 font-medium">
                            {player.wins}
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            {player.matches > 0
                              ? Math.round(
                                  (player.wins / player.matches) * 100
                                )
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <IconHistory className="h-5 w-5" /> Lịch sử gần đây
                  </h3>
                </div>
                <div className="space-y-3">
                  {matches.length === 0 && (
                    <p className="text-gray-400 text-sm italic">
                      Chưa có trận đấu nào được ghi lại.
                    </p>
                  )}
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {match.type === "singles" ? "Đánh đơn" : "Đánh đôi"} •{" "}
                          {match.date}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div
                          className={`text-sm ${
                            match.score1 > match.score2
                              ? "font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {match.team1.join(" - ")}
                        </div>
                        <div className="flex gap-2 font-mono font-bold bg-gray-50 px-2 py-1 rounded">
                          <span>{match.score1}</span>
                          <span className="text-gray-300">:</span>
                          <span>{match.score2}</span>
                        </div>
                        <div
                          className={`text-sm text-right ${
                            match.score2 > match.score1
                              ? "font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {match.team2.join(" - ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
