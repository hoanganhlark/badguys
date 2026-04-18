import type { ComponentType } from "react";
import { Award, Grid, PlusCircle, X } from "react-feather";
import type { RankingView } from "./types";

interface RankingSidebarProps {
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
  onGoHome: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
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

export default function RankingSidebar({
  currentView,
  onSetView,
  onGoHome,
  mobileOpen,
  onCloseMobile,
}: RankingSidebarProps) {
  const navItems: Array<{
    icon: ComponentType<{ className?: string }>;
    label: string;
    id: RankingView;
  }> = [
    { icon: Grid, label: "Thành viên", id: "member" },
    { icon: PlusCircle, label: "Nhập trận đấu", id: "match-form" },
    { icon: Award, label: "Bảng xếp hạng", id: "ranking" },
  ];

  return (
    <>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[75]">
          <button
            type="button"
            aria-label="Đóng menu dashboard"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-gray-200 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onGoHome();
                }}
                className="inline-flex items-center gap-2 text-left"
              >
                <Award className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-bold text-gray-900">BadGuys</span>
              </button>

              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Đóng menu"
                className="h-9 w-9 rounded border border-gray-200 flex items-center justify-center text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map(({ icon: Icon, label, id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onCloseMobile();
                    onSetView(id);
                  }}
                  className={`w-full rounded border px-3 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${
                    currentView === id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <aside className="w-64 bg-gray-50 border-r border-gray-200 p-6 hidden md:flex flex-col shadow">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center space-x-2 mb-10 text-left"
        >
          <Award className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">BadGuys</span>
        </button>

        <nav className="space-y-2 flex-1">
          <SidebarItem
            icon={Grid}
            label="Thành viên"
            id="member"
            currentView={currentView}
            onSetView={onSetView}
          />
          <SidebarItem
            icon={PlusCircle}
            label="Nhập trận đấu"
            id="match-form"
            currentView={currentView}
            onSetView={onSetView}
          />
          <SidebarItem
            icon={Award}
            label="Bảng xếp hạng"
            id="ranking"
            currentView={currentView}
            onSetView={onSetView}
          />
        </nav>

        <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
          <p>© BadGuys Ranking 2026</p>
        </div>
      </aside>
    </>
  );
}
