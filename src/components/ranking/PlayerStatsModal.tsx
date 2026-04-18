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
      label: "Kỹ năng",
      value: stats.skill,
      displayValue: stats.skill.toFixed(3),
      progress: toPercent(stats.skill, -1, 1),
      tone: "bg-blue-500",
      description:
        "Chỉ số hiệu quả tổng hợp từ chênh lệch điểm ghi được và điểm bị mất.",
      progressExplain: "Progress = ((Kỹ năng + 1) / 2) x 100%.",
    },
    {
      label: "Độ ổn định",
      value: stats.stability,
      displayValue: stats.stability.toFixed(3),
      progress: toPercent(stats.stability, 0, 1),
      tone: "bg-emerald-500",
      description:
        "Độ đều phong độ. Càng gần 1 thì phong độ càng ít lên xuống.",
      progressExplain:
        "Progress = Độ ổn định x 100% (vì giá trị nằm trong [0, 1]).",
    },
    {
      label: "Độ bất định",
      value: stats.uncertainty,
      displayValue: stats.uncertainty.toFixed(3),
      progress: toPercent(stats.uncertainty, 0, 2),
      tone: "bg-amber-500",
      description:
        "Mức độ chưa chắc chắn của thống kê (do dữ liệu ít hoặc kết quả dao động).",
      progressExplain:
        "Progress = (Độ bất định / 2) x 100%, giới hạn trong [0, 100]%.",
    },
    {
      label: "Động lực",
      value: stats.momentum,
      displayValue: stats.momentum.toFixed(3),
      progress: toPercent(stats.momentum, -1, 1),
      tone: "bg-violet-500",
      description:
        "Xu hướng gần đây so với phong độ trung bình toàn bộ.",
      progressExplain: "Progress = ((Động lực + 1) / 2) x 100%.",
    },
    {
      label: "Tỷ lệ thắng",
      value: stats.matches === 0 ? 0 : stats.wins / stats.matches,
      displayValue:
        stats.matches === 0
          ? "0%"
          : `${Math.round((stats.wins / stats.matches) * 100)}% (${stats.wins}/${stats.matches})`,
      progress: stats.matches === 0 ? 0 : (stats.wins / stats.matches) * 100,
      tone: "bg-cyan-500",
      description: "Tỷ lệ trận thắng trên tổng số trận đã thi đấu.",
      progressExplain: "Progress = (Số trận thắng / Tổng số trận) x 100%.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Điểm xếp hạng: {stats.rankScore.toFixed(3)}
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
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${item.tone} transition-all duration-300`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Progress hiển thị: {item.progress.toFixed(1)}%. {item.progressExplain}
              </p>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-600 pt-2 border-t space-y-2">
          <p>
            <strong>Công thức điểm xếp hạng:</strong> Điểm xếp hạng = Kỹ năng -
            (Độ bất định x Độ ổn định x 0.3 x Động lực)
          </p>
          <p className="text-gray-500">
            {stats.skill.toFixed(3)} - ({stats.uncertainty.toFixed(3)} x
            {stats.stability.toFixed(3)} x 0.3 x {stats.momentum.toFixed(3)})
          </p>
          <p className="text-gray-500">
            Hiểu đơn giản: Kỹ năng là nền tảng. Hệ số điều chỉnh phụ thuộc vào độ
            bất định, độ ổn định và động lực gần đây. Nếu động lực dương (phong độ
            đang lên), phần trừ sẽ lớn hơn; nếu động lực âm (phong độ đang giảm),
            giá trị trừ thành âm nên tổng điểm có thể được cộng bù.
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
