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

interface AdvancedStats {
  name: string;
  wins: number;
  matches: number;
  stability: number; // Standard deviation of score differences
  uncertainty: number; // Inversely related to number of matches
  skill: number; // Based on win rate and average point difference
  rankScore: number; // Combined metric
  winRate: number;
  avgPointDiff: number;
}

interface RankingPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_MEMBERS_KEY = "rankingMembers";
const STORAGE_MATCHES_KEY = "rankingMatches";
const ADJUSTMENT_COEFFICIENT = 0.5; // To balance RankScore formula

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

function calculateAdvancedStats(playerName: string, matches: Match[]): AdvancedStats {
  const playerMatches = matches.filter(
    (m) => m.team1.includes(playerName) || m.team2.includes(playerName)
  );

  const wins = playerMatches.filter((m) => {
    const isInTeam1 = m.team1.includes(playerName);
    return isInTeam1 ? m.score1 > m.score2 : m.score2 > m.score1;
  }).length;

  const matchCount = playerMatches.length;
  const winRate = matchCount > 0 ? wins / matchCount : 0;

  // Calculate point differences and average
  const pointDiffs = playerMatches.map((m) => {
    const isInTeam1 = m.team1.includes(playerName);
    return isInTeam1 ? m.score1 - m.score2 : m.score2 - m.score1;
  });

  const avgPointDiff = pointDiffs.length > 0 ? pointDiffs.reduce((a, b) => a + b, 0) / pointDiffs.length : 0;

  // Stability: Standard Deviation of score differences
  let stability = 0;
  if (pointDiffs.length > 0) {
    const variance = pointDiffs.reduce((sum, diff) => {
      const deviation = (diff - avgPointDiff) ** 2;
      return sum + deviation;
    }, 0) / pointDiffs.length;
    stability = Math.sqrt(variance) / 10; // Normalize to 0-1 range
  }

  // Uncertainty: Inversely related to number of matches
  let uncertainty = Math.max(0.3, 1.5 - matchCount * 0.1);

  // Skill: Based on win rate and average point difference
  const skill = Math.max(0, winRate + Math.max(0, avgPointDiff) / 10);

  // RankScore: Skill - (Stability * Uncertainty * adjustment_coefficient)
  const rankScore = skill - stability * uncertainty * ADJUSTMENT_COEFFICIENT;

  return {
    name: playerName,
    wins,
    matches: matchCount,
    stability: parseFloat(stability.toFixed(3)),
    uncertainty: parseFloat(uncertainty.toFixed(3)),
    skill: parseFloat(skill.toFixed(3)),
    rankScore: parseFloat(rankScore.toFixed(3)),
    winRate: parseFloat((winRate * 100).toFixed(1)),
    avgPointDiff: parseFloat(avgPointDiff.toFixed(1)),
  };
}

function getStabilityLabel(stability: number): { text: string; color: string } {
  if (stability <= 0.05) return { text: "Rất ổn định", color: "bg-emerald-100 text-emerald-800" };
  if (stability <= 0.06) return { text: "Bình thường", color: "bg-blue-100 text-blue-800" };
  if (stability <= 0.08) return { text: "Không ổn định", color: "bg-amber-100 text-amber-800" };
  return { text: "Khó dự đoán", color: "bg-red-100 text-red-800" };
}

function getUncertaintyLabel(uncertainty: number): { text: string; color: string } {
  if (uncertainty > 1.2) return { text: "Rất ít dữ liệu", color: "bg-red-100 text-red-800" };
  if (uncertainty > 1.0) return { text: "Biết sơ bộ", color: "bg-amber-100 text-amber-800" };
  if (uncertainty > 0.7) return { text: "Bắt đầu tin được", color: "bg-yellow-100 text-yellow-800" };
  if (uncertainty > 0.4) return { text: "Khá chắc", color: "bg-green-100 text-green-800" };
  return { text: "Rất chắc", color: "bg-emerald-100 text-emerald-800" };
}

function getSkillLabel(skill: number): { text: string; color: string } {
  if (skill < 0.3) return { text: "Không phân biệt", color: "bg-slate-100 text-slate-800" };
  if (skill < 0.7) return { text: "Nhỉnh hơn nhẹ", color: "bg-cyan-100 text-cyan-800" };
  if (skill < 1.0) return { text: "Hơn rõ", color: "bg-indigo-100 text-indigo-800" };
  return { text: "Khác đẳng cấp", color: "bg-purple-100 text-purple-800" };
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

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function PlayerStatsModal({ stats, onClose }: { stats: AdvancedStats; onClose: () => void }) {
  const stabLabel = getStabilityLabel(stats.stability);
  const uncertLabel = getUncertaintyLabel(stats.uncertainty);
  const skillLabel = getSkillLabel(stats.skill);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
            <p className="text-sm text-gray-500">RankScore: {stats.rankScore.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Tỷ lệ thắng</p>
            <p className="text-2xl font-bold text-blue-900">{stats.winRate}%</p>
            <p className="text-xs text-blue-700 mt-1">{stats.wins}/{stats.matches} trận</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase">Điểm trung bình</p>
            <p className="text-2xl font-bold text-amber-900">{stats.avgPointDiff > 0 ? '+' : ''}{stats.avgPointDiff}</p>
            <p className="text-xs text-amber-700 mt-1">hiệu điểm mỗi trận</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Phong độ (Stability)</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stabLabel.color}`}>
                {stabLabel.text}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Standard Deviation: {stats.stability.toFixed(3)}
            </div>
            <ProgressBar value={Math.max(0, 0.15 - stats.stability)} max={0.15} color="bg-emerald-500" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Độ chắc chắn (Uncertainty)</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${uncertLabel.color}`}>
                {uncertLabel.text}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Độ không chắc: {stats.uncertainty.toFixed(3)}
            </div>
            <ProgressBar value={Math.max(0, 1.5 - stats.uncertainty)} max={1.5} color="bg-indigo-500" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Kỹ năng (Skill)</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${skillLabel.color}`}>
                {skillLabel.text}
              </span>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Chỉ số kỹ năng: {stats.skill.toFixed(3)}
            </div>
            <ProgressBar value={Math.min(stats.skill, 1.5)} max={1.5} color="bg-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">RankScore Cuối cùng</p>
          <p className="text-3xl font-bold text-indigo-900">{stats.rankScore.toFixed(2)}</p>
          <p className="text-xs text-indigo-700 mt-2">
            = {stats.skill.toFixed(2)} (Skill) - {(stats.stability * stats.uncertainty * ADJUSTMENT_COEFFICIENT).toFixed(3)} (Điều chỉnh)
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
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
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
        currentView === id
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          : "hover:bg-gray-100 text-gray-600"
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
    score1: 0,
    score2: 0,
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

  // Advanced Rankings with Stats
  const rankings = useMemo(() => {
    const stats = members.map((m) => calculateAdvancedStats(m.name, matches));
    return stats.sort((a, b) => b.rankScore - a.rankScore);
  }, [members, matches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex">
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900 font-sans w-full">
        {/* Sidebar */}
        <aside className="w-64 bg-white/95 backdrop-blur border-r border-gray-200 p-6 hidden md:flex flex-col shadow-lg">
          <div className="flex items-center space-x-2 mb-10">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
              <IconTrophy className="text-white h-6 w-6" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BADMINTON PRO
            </span>
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
        <main className="flex-1 p-4 md:p-10 overflow-auto relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-10 md:right-10 z-10 h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center hover:scale-110"
            aria-label="Đóng"
          >
            <IconClose />
          </button>

          <header className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {view === "dashboard" && "⚙️ Quản lý thành viên"}
              {view === "match-form" && "📊 Ghi nhận kết quả"}
              {view === "ranking" && "🏆 Bảng xếp hạng câu lạc bộ"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Hệ thống theo dõi trình độ và kết quả thi đấu với phân tích nâng cao
            </p>
          </header>

          {/* View: Dashboard (Members) */}
          {view === "dashboard" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-4">
                  {isEditing ? "✏️ Cập nhật thành viên" : "➕ Thêm thành viên mới"}
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Họ và tên..."
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  />
                  <select
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500"
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
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isEditing ? <IconCheck className="h-4 w-4" /> : <IconUserPlus className="h-4 w-4" />}
                    {isEditing ? "Lưu" : "Thêm"}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase">Thành viên</th>
                      <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase">Trình độ</th>
                      <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{member.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                            {member.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <IconEdit />
                            </button>
                            <button
                              onClick={() => deleteMember(member.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
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
            <div className="max-w-3xl bg-white p-8 rounded-2xl border border-gray-100 shadow-md">
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setMatchType("singles")}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all ${
                    matchType === "singles"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600"
                      : "border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  🎾 Đánh Đơn
                </button>
                <button
                  onClick={() => setMatchType("doubles")}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all ${
                    matchType === "doubles"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600"
                      : "border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  👥 Đánh Đôi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 font-bold text-4xl italic hidden md:block">
                  VS
                </div>

                {/* Team 1 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-center text-lg">🔵 Đội A</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
                      <select
                        key={i}
                        className="w-full p-3 rounded-xl border border-gray-200 bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  <input
                    type="number"
                    placeholder="Điểm số"
                    className="w-full text-center text-4xl font-bold py-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50"
                    value={matchData.score1}
                    onChange={(e) => setMatchData({ ...matchData, score1: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* Team 2 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-center text-lg">🔴 Đội B</h3>
                  <div className="space-y-2">
                    {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
                      <select
                        key={i}
                        className="w-full p-3 rounded-xl border border-gray-200 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  <input
                    type="number"
                    placeholder="Điểm số"
                    className="w-full text-center text-4xl font-bold py-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50"
                    value={matchData.score2}
                    onChange={(e) => setMatchData({ ...matchData, score2: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMatch}
                className="w-full mt-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all active:scale-[0.98]"
              >
                ✅ HOÀN TẤT & LƯU KẾT QUẢ
              </button>
            </div>
          )}

          {/* View: Rankings */}
          {view === "ranking" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Table */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase">Hạng</th>
                        <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase">Vận động viên</th>
                        <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase text-center">Trận</th>
                        <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase text-center">Thắng</th>
                        <th className="px-6 py-4 text-xs font-semibold text-indigo-600 uppercase text-right">RankScore</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rankings.map((player, index) => (
                        <tr
                          key={player.name}
                          onClick={() => setSelectedPlayer(player)}
                          className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                        >
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
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                              </div>
                            ) : (
                              <span className="px-3 text-gray-400 font-medium">#{index + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900 group-hover:text-indigo-600">
                            {player.name}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600">{player.matches}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                              {player.wins}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-indigo-600">
                            {player.rankScore.toFixed(2)}
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
                  <h3 className="font-bold flex items-center gap-2 text-lg">
                    <IconHistory className="h-5 w-5 text-indigo-600" /> Lịch sử gần đây
                  </h3>
                </div>
                <div className="space-y-3">
                  {matches.length === 0 && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                      <p className="text-gray-400 text-sm">📋 Chưa có trận đấu nào được ghi lại</p>
                    </div>
                  )}
                  {matches.slice(0, 10).map((match) => (
                    <div
                      key={match.id}
                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                          {match.type === "singles" ? "🎾 Đơn" : "👥 Đôi"} • {match.date}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <div className="text-xs flex-1 truncate">
                          <span className={match.score1 > match.score2 ? "font-bold text-gray-900" : "text-gray-500"}>
                            {match.team1.join(" & ")}
                          </span>
                        </div>
                        <div className="flex gap-1 font-mono font-bold bg-indigo-50 px-2 py-1 rounded text-sm">
                          <span className={match.score1 > match.score2 ? "text-indigo-600" : "text-gray-400"}>
                            {match.score1}
                          </span>
                          <span className="text-gray-300">:</span>
                          <span className={match.score2 > match.score1 ? "text-indigo-600" : "text-gray-400"}>
                            {match.score2}
                          </span>
                        </div>
                        <div className="text-xs flex-1 text-right truncate">
                          <span className={match.score2 > match.score1 ? "font-bold text-gray-900" : "text-gray-500"}>
                            {match.team2.join(" & ")}
                          </span>
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

      {/* Player Stats Modal */}
      {selectedPlayer && <PlayerStatsModal stats={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}
