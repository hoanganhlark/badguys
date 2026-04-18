import type { ComponentType } from "react";
import { Award, Grid, Home, PlusCircle, Shield } from "react-feather";
import type { RankingView } from "./types";

interface RankingSidebarProps {
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
  onGoHome: () => void;
  isAdmin: boolean;
  onGoUsers: () => void;
  showMatchForm?: boolean;
}

function SidebarItem({
  icon: Icon,
  label,
  id,
  currentView,
  onSetView,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  id: RankingView;
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
}) {
  return (
    <button
      onClick={() => onSetView(id)}
      className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl border transition-all ${
        currentView === id
          ? "bg-white text-slate-900 border-white shadow-sm"
          : "border-white/15 text-slate-200 hover:bg-white/10"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

export default function RankingSidebar({
  currentView,
  onSetView,
  onGoHome,
  isAdmin,
  onGoUsers,
  showMatchForm = true,
}: RankingSidebarProps) {
  const navItems: Array<{
    icon: ComponentType<{ className?: string }>;
    label: string;
    id: RankingView;
  }> = [
    { icon: Grid, label: "Thành viên", id: "member" },
    { icon: Award, label: "Bảng xếp hạng", id: "ranking" },
  ];

  if (showMatchForm) {
    navItems.splice(1, 0, {
      icon: PlusCircle,
      label: "Nhập trận đấu",
      id: "match-form",
    });
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-20 px-4 py-3 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
              <Award className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">
                BadGuys
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Mobile Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <button
                type="button"
                onClick={onGoUsers}
                className="h-9 px-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" /> Users
              </button>
            ) : null}
            <button
              type="button"
              onClick={onGoHome}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5" /> Trang chủ
            </button>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-30 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSetView(id)}
              className={`rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-all inline-flex flex-col items-center gap-1 ${
                currentView === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 p-7 hidden md:flex flex-col">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center space-x-3 mb-10 text-left"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow">
            <Award className="h-5 w-5" />
          </span>
          <span className="text-2xl font-bold text-white">BadGuys</span>
        </button>

        <nav className="space-y-2.5 flex-1">
          <SidebarItem
            icon={Grid}
            label="Thành viên"
            id="member"
            currentView={currentView}
            onSetView={onSetView}
          />
          {showMatchForm ? (
            <SidebarItem
              icon={PlusCircle}
              label="Nhập trận đấu"
              id="match-form"
              currentView={currentView}
              onSetView={onSetView}
            />
          ) : null}
          <SidebarItem
            icon={Award}
            label="Bảng xếp hạng"
            id="ranking"
            currentView={currentView}
            onSetView={onSetView}
          />
        </nav>

        {isAdmin ? (
          <button
            type="button"
            onClick={onGoUsers}
            className="mb-4 flex items-center gap-2 rounded-xl border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/20"
          >
            <Shield className="h-4 w-4" /> User Management
          </button>
        ) : null}

        <div className="border-t border-white/20 pt-4 text-xs text-slate-300">
          <p>© BadGuys Ranking 2026</p>
        </div>
      </aside>
    </>
  );
}
