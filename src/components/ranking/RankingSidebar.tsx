import type { ComponentType } from "react";
import { Award, Grid, PlusCircle } from "react-feather";
import type { RankingView } from "./types";

interface RankingSidebarProps {
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
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
}: RankingSidebarProps) {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-6 hidden md:flex flex-col shadow">
      <div className="flex items-center space-x-2 mb-10">
        <Award className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">BADMINTON PRO</span>
      </div>

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
        <p>© BADMINTON RANKING 2024</p>
      </div>
    </aside>
  );
}
