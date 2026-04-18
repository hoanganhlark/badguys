import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Trophy, 
  PlusCircle, 
  Trash2, 
  Edit2, 
  History, 
  LayoutDashboard,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

const App = () => {
  // --- State ---
  const [view, setView] = useState('dashboard'); // 'dashboard', 'match-form', 'ranking'
  const [members, setMembers] = useState([
    { id: 1, name: 'Nguyễn Văn A', level: 'Khá' },
    { id: 2, name: 'Trần Thị B', level: 'Trung bình' },
    { id: 3, name: 'Lê Văn C', level: 'Giỏi' }
  ]);
  const [matches, setMatches] = useState([]);
  
  // Member Form State
  const [isEditing, setIsEditing] = useState(null);
  const [newMember, setNewMember] = useState({ name: '', level: 'Trung bình' });

  // Match Form State
  const [matchType, setMatchType] = useState('singles'); // 'singles' or 'doubles'
  const [matchData, setMatchData] = useState({
    team1: [],
    team2: [],
    score1: 0,
    score2: 0
  });

  // --- Logic Thành viên ---
  const handleAddMember = () => {
    if (!newMember.name.trim()) return;
    if (isEditing) {
      setMembers(members.map(m => m.id === isEditing ? { ...newMember, id: isEditing } : m));
      setIsEditing(null);
    } else {
      setMembers([...members, { ...newMember, id: Date.now() }]);
    }
    setNewMember({ name: '', level: 'Trung bình' });
  };

  const deleteMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const startEdit = (member) => {
    setIsEditing(member.id);
    setNewMember({ name: member.name, level: member.level });
  };

  // --- Logic Trận đấu ---
  const handleSaveMatch = () => {
    const { team1, team2, score1, score2 } = matchData;
    if (team1.length === 0 || team2.length === 0) return;
    
    const newMatch = {
      id: Date.now(),
      type: matchType,
      team1: [...team1],
      team2: [...team2],
      score1: parseInt(score1),
      score2: parseInt(score2),
      date: new Date().toLocaleDateString('vi-VN')
    };
    
    setMatches([newMatch, ...matches]);
    setMatchData({ team1: [], team2: [], score1: 0, score2: 0 });
    setView('ranking');
  };

  // --- Logic Xếp hạng (Ranking) ---
  const rankings = useMemo(() => {
    const stats = {};
    members.forEach(m => {
      stats[m.name] = { name: m.name, wins: 0, matches: 0, points: 0 };
    });

    matches.forEach(match => {
      const allPlayers = [...match.team1, ...match.team2];
      allPlayers.forEach(p => { if (stats[p]) stats[p].matches += 1; });

      const winnerTeam = match.score1 > match.score2 ? match.team1 : match.team2;
      winnerTeam.forEach(p => { if (stats[p]) stats[p].wins += 1; });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    });
  }, [members, matches]);

  // --- Components ---
  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button 
      onClick={() => setView(id)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all ${
        view === id ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 hidden md:block">
        <div className="flex items-center space-x-2 mb-10">
          <div className="bg-black p-1.5 rounded-lg">
            <Trophy className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">BADMINTON PRO</span>
        </div>
        
        <nav className="space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" id="dashboard" />
          <SidebarItem icon={PlusCircle} label="Nhập trận đấu" id="match-form" />
          <SidebarItem icon={Trophy} label="Bảng xếp hạng" id="ranking" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold capitalize">
            {view === 'dashboard' && "Quản lý thành viên"}
            {view === 'match-form' && "Ghi nhận kết quả"}
            {view === 'ranking' && "Bảng xếp hạng câu lạc bộ"}
          </h1>
          <p className="text-gray-500 text-sm">Hệ thống theo dõi trình độ và kết quả thi đấu.</p>
        </header>

        {/* View: Dashboard (Members) */}
        {view === 'dashboard' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                {isEditing ? 'Cập nhật thành viên' : 'Thêm thành viên mới'}
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Họ và tên..."
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                />
                <select 
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white"
                  value={newMember.level}
                  onChange={(e) => setNewMember({...newMember, level: e.target.value})}
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
                  {isEditing ? <CheckCircle2 size={18}/> : <UserPlus size={18}/>}
                  {isEditing ? 'Lưu' : 'Thêm'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-bottom border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Thành viên</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Trình độ</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{member.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-xs rounded-full font-medium">
                          {member.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(member)} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                          <button onClick={() => deleteMember(member.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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
        {view === 'match-form' && (
          <div className="max-w-3xl bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setMatchType('singles')}
                className={`flex-1 py-3 rounded-xl border font-medium transition-all ${matchType === 'singles' ? 'bg-black text-white border-black' : 'border-gray-200'}`}
              >Đánh Đơn</button>
              <button 
                onClick={() => setMatchType('doubles')}
                className={`flex-1 py-3 rounded-xl border font-medium transition-all ${matchType === 'doubles' ? 'bg-black text-white border-black' : 'border-gray-200'}`}
              >Đánh Đôi</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-300 font-bold text-4xl italic hidden md:block">VS</div>
              
              {/* Team 1 */}
              <div className="space-y-4">
                <h3 className="font-bold text-center">Đội A</h3>
                <div className="space-y-2">
                  {[...Array(matchType === 'singles' ? 1 : 2)].map((_, i) => (
                    <select 
                      key={i}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50"
                      onChange={(e) => {
                        const newTeam = [...matchData.team1];
                        newTeam[i] = e.target.value;
                        setMatchData({...matchData, team1: newTeam});
                      }}
                    >
                      <option value="">Chọn VĐV...</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  ))}
                </div>
                <input 
                  type="number" 
                  placeholder="Điểm số"
                  className="w-full text-center text-4xl font-bold py-4 rounded-2xl border border-gray-200"
                  value={matchData.score1}
                  onChange={(e) => setMatchData({...matchData, score1: e.target.value})}
                />
              </div>

              {/* Team 2 */}
              <div className="space-y-4">
                <h3 className="font-bold text-center">Đội B</h3>
                <div className="space-y-2">
                  {[...Array(matchType === 'singles' ? 1 : 2)].map((_, i) => (
                    <select 
                      key={i}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50"
                      onChange={(e) => {
                        const newTeam = [...matchData.team2];
                        newTeam[i] = e.target.value;
                        setMatchData({...matchData, team2: newTeam});
                      }}
                    >
                      <option value="">Chọn VĐV...</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  ))}
                </div>
                <input 
                  type="number" 
                  placeholder="Điểm số"
                  className="w-full text-center text-4xl font-bold py-4 rounded-2xl border border-gray-200"
                  value={matchData.score2}
                  onChange={(e) => setMatchData({...matchData, score2: e.target.value})}
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
        {view === 'ranking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Hạng</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vận động viên</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">Số trận</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">Thắng</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rankings.map((player, index) => (
                      <tr key={player.name} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          {index < 3 ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              index === 1 ? 'bg-gray-100 text-gray-700' : 
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="px-3 text-gray-400 font-medium">{index + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold">{player.name}</td>
                        <td className="px-6 py-4 text-center">{player.matches}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">{player.wins}</td>
                        <td className="px-6 py-4 text-right font-mono">
                          {player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0}%
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
                  <History size={18} /> Lịch sử gần đây
                </h3>
              </div>
              <div className="space-y-3">
                {matches.length === 0 && <p className="text-gray-400 text-sm italic">Chưa có trận đấu nào được ghi lại.</p>}
                {matches.map(match => (
                  <div key={match.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {match.type === 'singles' ? 'Đánh đơn' : 'Đánh đôi'} • {match.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className={`text-sm ${match.score1 > match.score2 ? 'font-bold' : 'text-gray-500'}`}>
                        {match.team1.join(' - ')}
                      </div>
                      <div className="flex gap-2 font-mono font-bold bg-gray-50 px-2 py-1 rounded">
                        <span>{match.score1}</span>
                        <span className="text-gray-300">:</span>
                        <span>{match.score2}</span>
                      </div>
                      <div className={`text-sm text-right ${match.score2 > match.score1 ? 'font-bold' : 'text-gray-500'}`}>
                        {match.team2.join(' - ')}
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
  );
};

export default App;