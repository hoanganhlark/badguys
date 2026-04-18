import { X } from "react-feather";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  onClose: () => void;
}

export default function PlayerStatsModal({
  stats,
  onClose,
}: PlayerStatsModalProps) {
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

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Skill
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {stats.skill.toFixed(3)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Stability
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {stats.stability.toFixed(3)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Uncertainty
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {stats.uncertainty.toFixed(3)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Momentum
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {stats.momentum.toFixed(3)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Wins
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {stats.wins}/{stats.matches}
            </p>
          </div>
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
