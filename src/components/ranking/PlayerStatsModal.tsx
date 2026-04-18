import { X } from "react-feather";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

export default function PlayerStatsModal({
  stats,
  onClose,
}: PlayerStatsModalProps) {
  const metricItems = [
    {
      label: "Skill",
      value: stats.skill,
      displayValue: stats.skill.toFixed(3),
      progress: toPercent(stats.skill, -1, 1),
      tone: "bg-blue-500",
    },
    {
      label: "Stability",
      value: stats.stability,
      displayValue: stats.stability.toFixed(3),
      progress: toPercent(stats.stability, 0, 1),
      tone: "bg-emerald-500",
    },
    {
      label: "Uncertainty",
      value: stats.uncertainty,
      displayValue: stats.uncertainty.toFixed(3),
      progress: toPercent(stats.uncertainty, 0, 2),
      tone: "bg-amber-500",
    },
    {
      label: "Momentum",
      value: stats.momentum,
      displayValue: stats.momentum.toFixed(3),
      progress: toPercent(stats.momentum, -1, 1),
      tone: "bg-violet-500",
    },
    {
      label: "Win rate",
      value: stats.matches === 0 ? 0 : stats.wins / stats.matches,
      displayValue:
        stats.matches === 0
          ? "0%"
          : `${Math.round((stats.wins / stats.matches) * 100)}% (${stats.wins}/${stats.matches})`,
      progress: stats.matches === 0 ? 0 : (stats.wins / stats.matches) * 100,
      tone: "bg-cyan-500",
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              RankScore: {stats.rankScore.toFixed(3)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="pt-4 border-t space-y-3">
          {metricItems.map((item) => (
            <div key={item.label} className="p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {item.displayValue}
                </p>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${item.tone} transition-all duration-300`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-600 pt-2 border-t space-y-1">
          <p>
            <strong>Formula:</strong> RankScore = Skill -
            2×Uncertainty×0.5×Stability×0.3×Momentum
          </p>
          <p className="text-gray-500">
            {stats.skill.toFixed(3)} - 2×{stats.uncertainty.toFixed(3)}×0.5×
            {stats.stability.toFixed(3)}×0.3×{stats.momentum.toFixed(3)}
          </p>
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
