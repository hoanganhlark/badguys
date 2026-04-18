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
  sets: string[]; // e.g., ["21-18", "15-21", "21-10"]
  date: string;
}

interface AdvancedStats {
  name: string;
  skill: number;
  stability: number;
  uncertainty: number;
  momentum: number;
  rankScore: number;
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
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Migrate old format (score1/score2) to new format (sets)
    return parsed.map((match: any) => {
      if (match.sets && Array.isArray(match.sets)) {
        // Already in new format
        return match as Match;
      }
      // Old format - convert score1/score2 to sets
      if (typeof match.score1 === 'number' && typeof match.score2 === 'number') {
        return {
          ...match,
          sets: [`${match.score1}-${match.score2}`],
        } as Match;
      }
      return match as Match;
    });
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

// Parse a single set score (e.g., "21-18" -> [21, 18])
function parseScore(score: string): [number, number] | null {
  const parts = score.trim().split("-");
  if (parts.length !== 2) return null;
  const pointFor = parseInt(parts[0], 10);
  const pointAgainst = parseInt(parts[1], 10);
  if (isNaN(pointFor) || isNaN(pointAgainst)) return null;
  return [pointFor, pointAgainst];
}

// Calculate performance for a single match: (PointFor - PointAgainst) / (PointFor + PointAgainst)
function computeMatchPerformance(sets: string[]): number {
  let totalPointFor = 0;
  let totalPointAgainst = 0;

  for (const set of sets) {
    const parsed = parseScore(set);
    if (!parsed) continue;
    totalPointFor += parsed[0];
    totalPointAgainst += parsed[1];
  }

  const total = totalPointFor + totalPointAgainst;
  if (total === 0) return 0;
  return (totalPointFor - totalPointAgainst) / total;
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateAdvancedStats(playerName: string, matches: Match[]): AdvancedStats {
  const playerMatches = matches.filter(
    (m) => m.team1.includes(playerName) || m.team2.includes(playerName)
  );

  const matchCount = playerMatches.length;

  // Calculate performance for each match
  const performances: number[] = playerMatches.map((m) => {
    const isInTeam1 = m.team1.includes(playerName);
    let totalPointFor = 0;
    let totalPointAgainst = 0;

    for (const set of m.sets) {
      const parsed = parseScore(set);
      if (!parsed) continue;
      if (isInTeam1) {
        totalPointFor += parsed[0];
        totalPointAgainst += parsed[1];
      } else {
        totalPointFor += parsed[1];
        totalPointAgainst += parsed[0];
      }
    }

    const total = totalPointFor + totalPointAgainst;
    if (total === 0) return 0;
    return (totalPointFor - totalPointAgainst) / total;
  });

  // Count wins (positive performance)
  const wins = performances.filter((p) => p > 0).length;

  // 1. Skill: Based on total points
  let totalPointFor = 0;
  let totalPointAgainst = 0;
  for (const match of playerMatches) {
    const isInTeam1 = match.team1.includes(playerName);
    for (const set of match.sets) {
      const parsed = parseScore(set);
      if (!parsed) continue;
      if (isInTeam1) {
        totalPointFor += parsed[0];
        totalPointAgainst += parsed[1];
      } else {
        totalPointFor += parsed[1];
        totalPointAgainst += parsed[0];
      }
    }
  }
  const total = totalPointFor + totalPointAgainst;
  const skill = total === 0 ? 0 : (totalPointFor - totalPointAgainst) / total;

  // 2. Stability: 1 - stddev(Performance_i)
  const stdDevPerf = calculateStdDev(performances);
  const stability = Math.max(0, 1 - stdDevPerf);

  // 3. Uncertainty: stddev(Performance_i) + 1 / sqrt(NumberOfMatches)
  const uncertainty = stdDevPerf + (matchCount > 0 ? 1 / Math.sqrt(matchCount) : 1);

  // 4. Momentum: avg(last 5) - avg(all)
  const avgAll = performances.length > 0 ? performances.reduce((a, b) => a + b, 0) / performances.length : 0;
  const recentPerfs = performances.slice(-5);
  const avgRecent = recentPerfs.length > 0 ? recentPerfs.reduce((a, b) => a + b, 0) / recentPerfs.length : 0;
  const momentum = avgRecent - avgAll;

  // 5. RankScore: Skill - 2 * Uncertainty * 0.5 * Stability * 0.3 * Momentum
  const rankScore = skill - 2 * uncertainty * 0.5 * stability * 0.3 * momentum;

  return {
    name: playerName,
    skill: parseFloat(skill.toFixed(3)),
    stability: parseFloat(stability.toFixed(3)),
    uncertainty: parseFloat(uncertainty.toFixed(3)),
    momentum: parseFloat(momentum.toFixed(3)),
    rankScore: parseFloat(rankScore.toFixed(3)),
    wins,
    matches: matchCount,
  };
}


// SVG Icons
function IconTrophy({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 9H3v6h3m0 0h12m0 0h3v-6h-3m0 0V5h-2V3m0 0h-6v2m-2 4h0M5 15a1 1 0 001 1h12a1 1 0 001-1v-2H5v2z" />
    </svg>
  );
}

function IconPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconTrash({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconEdit({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L21 6.5z" />
    </svg>
  );
}

function IconHistory({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconDashboard({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconUserPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlayerStatsModal({ stats, onClose }: { stats: AdvancedStats; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
            <p className="text-sm text-gray-500 mt-1">RankScore: {stats.rankScore.toFixed(3)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">Skill</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.skill.toFixed(3)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">Stability</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.stability.toFixed(3)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">Uncertainty</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.uncertainty.toFixed(3)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">Momentum</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.momentum.toFixed(3)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">Wins</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.wins}/{stats.matches}</p>
          </div>
        </div>

        <div className="text-xs text-gray-600 pt-2 border-t space-y-1">
          <p><strong>Formula:</strong> RankScore = Skill - 2×Uncertainty×0.5×Stability×0.3×Momentum</p>
          <p className="text-gray-500">{stats.skill.toFixed(3)} - 2×{stats.uncertainty.toFixed(3)}×0.5×{stats.stability.toFixed(3)}×0.3×{stats.momentum.toFixed(3)}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
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
      className={`flex items-center space-x-3 w-full p-2 rounded transition-all ${
        currentView === id
          ? "bg-blue-600 text-white"
          : "hover:bg-gray-200 text-gray-600"
      }`}
    >
      <Icon />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

export default function RankingPage({ isOpen, onClose }: RankingPageProps) {
  const [view, setView] = useState<"dashboard" | "match-form" | "ranking">("ranking");
  const [members, setMembers] = useState<Member[]>(() => loadMembersFromStorage());
  const [matches, setMatches] = useState<Match[]>(() => loadMatchesFromStorage());
  const [selectedPlayer, setSelectedPlayer] = useState<AdvancedStats | null>(null);

  // Member Form State
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [newMember, setNewMember] = useState({ name: "", level: "Trung bình" });

  // Match Form State
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [matchData, setMatchData] = useState({
    team1: [] as string[],
    team2: [] as string[],
    sets: ["", ""] as string[],
  });

  // Persist members
  useEffect(() => {
    saveMembersToStorage(members);
  }, [members]);

  // Persist matches
  useEffect(() => {
    saveMatchesToStorage(matches);
  }, [matches]);

  // Logic: Thành viên
  const handleAddMember = () => {
    if (!newMember.name.trim()) return;
    if (isEditing) {
      setMembers(members.map((m) => (m.id === isEditing ? { ...newMember, id: isEditing } : m)));
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
    if (team1.length === 0 || team2.length === 0) return;
    if (sets.every((s) => !s.trim())) return;

    const newMatch: Match = {
      id: Date.now(),
      type: matchType,
      team1: [...team1],
      team2: [...team2],
      sets: sets.filter((s) => s.trim()),
      date: new Date().toLocaleDateString("vi-VN"),
    };

    setMatches([newMatch, ...matches]);
    setMatchData({ team1: [], team2: [], sets: ["", ""] });
    setView("ranking");
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
        <aside className="w-64 bg-gray-50 border-r border-gray-200 p-6 hidden md:flex flex-col shadow">
          <div className="flex items-center space-x-2 mb-10">
            <IconTrophy className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">BADMINTON PRO</span>
          </div>

          <nav className="space-y-2 flex-1">
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

          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p>© BADMINTON RANKING 2024</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-8 md:right-8 z-10 h-8 w-8 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
            aria-label="Đóng"
          >
            <IconClose className="h-5 w-5" />
          </button>

          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {view === "dashboard" && "⚙️ Quản lý thành viên"}
              {view === "match-form" && "📊 Ghi nhận kết quả"}
              {view === "ranking" && "🏆 Bảng xếp hạng câu lạc bộ"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Hệ thống theo dõi trình độ và kết quả thi đấu
            </p>
          </header>

          {/* View: Dashboard (Members) */}
          {view === "dashboard" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white p-4 rounded border border-gray-200 shadow">
                <h2 className="text-sm font-semibold uppercase text-gray-700 mb-3">
                  {isEditing ? "✏️ Cập nhật thành viên" : "➕ Thêm thành viên mới"}
                </h2>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Họ và tên..."
                    className="flex-1 px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  />
                  <select
                    className="px-3 py-2 rounded border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
                    value={newMember.level}
                    onChange={(e) => setNewMember({ ...newMember, level: e.target.value })}
                  >
                    <option>Yếu</option>
                    <option>Trung bình</option>
                    <option>Khá</option>
                    <option>Giỏi</option>
                  </select>
                  <button
                    onClick={handleAddMember}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    {isEditing ? <IconCheck className="h-4 w-4" /> : <IconUserPlus className="h-4 w-4" />}
                    {isEditing ? "Lưu" : "Thêm"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded border border-gray-200 shadow overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Thành viên</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Trình độ</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{member.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                            {member.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <IconEdit />
                            </button>
                            <button
                              onClick={() => deleteMember(member.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="max-w-3xl bg-white p-6 rounded-lg border border-gray-200 shadow">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setMatchType("singles")}
                  className={`flex-1 py-2 rounded border font-semibold transition-all ${
                    matchType === "singles"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  🎾 Đánh Đơn
                </button>
                <button
                  onClick={() => setMatchType("doubles")}
                  className={`flex-1 py-2 rounded border font-semibold transition-all ${
                    matchType === "doubles"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  👥 Đánh Đôi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Team 1 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-center">Đội A</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
                      <select
                        key={i}
                        className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const newTeam = [...matchData.team1];
                          newTeam[i] = e.target.value;
                          setMatchData({ ...matchData, team1: newTeam });
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
                    ))}
                  </div>
                </div>

                {/* Team 2 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-center">Đội B</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
                      <select
                        key={i}
                        className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const newTeam = [...matchData.team2];
                          newTeam[i] = e.target.value;
                          setMatchData({ ...matchData, team2: newTeam });
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
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t space-y-3">
                <h3 className="font-bold text-center">Kết quả (Điểm mỗi set: VD: 21-18)</h3>
                {matchData.sets.map((set, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Set ${i + 1} (VD: 21-18)`}
                    className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={set}
                    onChange={(e) => {
                      const newSets = [...matchData.sets];
                      newSets[i] = e.target.value;
                      setMatchData({ ...matchData, sets: newSets });
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleSaveMatch}
                className="w-full mt-6 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-all"
              >
                ✅ Lưu kết quả
              </button>
            </div>
          )}

          {/* View: Rankings */}
          {view === "ranking" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded border border-gray-200 shadow overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Hạng</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">Vận động viên</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-center">Trận</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-center">Thắng</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-right">RankScore</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rankings.map((player, index) => (
                        <tr
                          key={player.name}
                          onClick={() => setSelectedPlayer(player)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-semibold">
                            {index < 3 ? (
                              <span className="text-lg">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                              </span>
                            ) : (
                              <span className="text-gray-500">#{index + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{player.name}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{player.matches}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{player.wins}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-600">
                            {player.rankScore.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match History */}
              <div className="space-y-3">
                <h3 className="font-bold flex items-center gap-2">
                  <IconHistory className="h-5 w-5" /> Lịch sử gần đây
                </h3>
                <div className="space-y-2">
                  {matches.length === 0 && (
                    <div className="bg-white p-4 rounded border border-gray-200 text-center">
                      <p className="text-gray-400 text-sm">📋 Chưa có trận đấu</p>
                    </div>
                  )}
                  {matches.slice(0, 10).map((match) => (
                    <div key={match.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm text-xs">
                      <div className="text-gray-500 mb-1">
                        {match.type === "singles" ? "🎾 Đơn" : "👥 Đôi"} • {match.date}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{match.team1.join(" & ")}</div>
                        <div className="text-gray-500">{match.sets.join(", ")}</div>
                        <div className="font-medium text-gray-900">{match.team2.join(" & ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Player Stats Modal */}
      {selectedPlayer && <PlayerStatsModal stats={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}
