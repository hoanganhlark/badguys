import { useEffect, useState } from "react";
import { ChevronDown, X } from "react-feather";
import type { RankingMetricVisibility } from "../../types";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  penaltyCoefficient: number;
  metricVisibility: RankingMetricVisibility;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number): number {
  return clamp(value, 0, 1) * 100;
}

function getVolBadge(vol: number): string {
  if (vol <= 0.05) return "Rat on dinh";
  if (vol <= 0.07) return "Binh thuong";
  if (vol < 0.1) return "That thuong";
  return "Kho du doan";
}

function getUncertaintyBadge(uncertaintyNorm: number): string {
  if (uncertaintyNorm > 1.2) return "Rat it du lieu";
  if (uncertaintyNorm >= 1.0) return "Biet so bo";
  if (uncertaintyNorm >= 0.7) return "Bat dau tin duoc";
  if (uncertaintyNorm >= 0.4) return "Kha chac";
  return "Rat chac";
}

function getSkillBadge(rating: number): string {
  if (rating < 1300) return "Khong phan biet duoc";
  if (rating < 1500) return "Nhinh hon nhe";
  if (rating <= 1700) return "Hon ro";
  return "Khac dang cap";
}

export default function PlayerStatsModal({
  stats,
  penaltyCoefficient,
  metricVisibility,
  onClose,
}: PlayerStatsModalProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [isSimpleExplainOpen, setIsSimpleExplainOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const skillProgress = clamp((stats.rating - 1000) / 1000, 0, 1);
  const stabilityProgress = clamp(1 - stats.vol / 0.2, 0, 1);
  const uncertaintyProgress = clamp(1 - stats.rd / 350, 0, 1);
  const motivationProgress = clamp(stats.motivation / 2, 0, 1);

  const metricItems = [
    {
      id: "skill",
      label: "Ky nang",
      displayValue: `${stats.rating.toFixed(2)} (${getSkillBadge(stats.rating)})`,
      progress: toPercent(skillProgress),
      tone: "bg-blue-500",
      description:
        "Dua tren Glicko-2 rating. Cang thang nhieu doi thu manh, rating cang cao. Goc: 1500.",
    },
    {
      id: "stability",
      label: "Do on dinh",
      displayValue: `${stats.vol.toFixed(4)} (${getVolBadge(stats.vol)})`,
      progress: toPercent(stabilityProgress),
      tone: "bg-emerald-500",
      description:
        "Dua tren Volatility (sigma) Glicko-2. Phong do cang deu thi sigma cang thap, diem cang cao.",
    },
    {
      id: "uncertainty",
      label: "Do bat dinh",
      displayValue: `${stats.uncertaintyNorm.toFixed(3)} (${getUncertaintyBadge(stats.uncertaintyNorm)})`,
      progress: toPercent(uncertaintyProgress),
      tone: "bg-amber-500",
      description:
        "Dua tren Rating Deviation (RD). Cang it tran hoac lau khong thi dau thi RD cao, diem thap.",
    },
    {
      id: "motivation",
      label: "Dong luc",
      displayValue: stats.motivation.toFixed(3),
      progress: toPercent(motivationProgress),
      tone: "bg-violet-500",
      description:
        "Tan suat thi dau gan day so voi trung binh. > 1 = dang tich cuc hon binh thuong.",
    },
    {
      id: "winRate",
      label: "Ti le thang",
      displayValue: `${Math.round(stats.winRate * 100)}% (${stats.wins}/${stats.totalMatches})`,
      progress: toPercent(stats.winRate),
      tone: "bg-cyan-500",
      description: "So tran thang / tong so tran da thi dau.",
    },
  ].filter(
    (item) => metricVisibility[item.id as keyof RankingMetricVisibility],
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{stats.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Diem xep hang: {stats.rankScore.toFixed(4)}
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
            <button
              key={item.label}
              type="button"
              onClick={() =>
                setExpandedMetric((prev) =>
                  prev === item.label ? null : item.label,
                )
              }
              className="w-full p-3 bg-gray-50 rounded text-left"
              aria-expanded={expandedMetric === item.label}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-700 uppercase">
                  {item.label}
                </p>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${
                    expandedMetric === item.label ? "rotate-180" : "rotate-0"
                  }`}
                />
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${item.tone} transition-all duration-300`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  expandedMetric === item.label
                    ? "grid-rows-[1fr] opacity-100 mt-2"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-500">{item.description}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Gia tri hien tai: {item.displayValue}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Progress hien thi: {item.progress.toFixed(1)}%
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-600 pt-2 border-t space-y-2">
          <p>
            <strong>Cong thuc diem xep hang:</strong> Diem xep hang = Ky nang -
            (Do bat dinh x Phong do on dinh x {penaltyCoefficient.toFixed(2)} x
            Dong luc)
          </p>
          <p className="text-gray-500">
            {stats.skillNorm.toFixed(4)} - ({stats.uncertaintyNorm.toFixed(4)} x
            {stats.vol.toFixed(4)} x {penaltyCoefficient.toFixed(2)} x{" "}
            {stats.motivation.toFixed(4)})
          </p>
          <button
            type="button"
            onClick={() => setIsSimpleExplainOpen((prev) => !prev)}
            className="w-full mt-1 p-2 rounded bg-gray-50 text-left inline-flex items-center justify-between"
            aria-expanded={isSimpleExplainOpen}
          >
            <span className="font-semibold text-gray-700">Hieu don gian</span>
            <ChevronDown
              className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${
                isSimpleExplainOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
          <div
            className={`grid transition-all duration-300 ease-out ${
              isSimpleExplainOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <p className="text-gray-500 mt-1">
                Ky nang cang cao thi diem cang tot. Do bat dinh (RD) cao se bi
                tru vi du lieu chua du. Vol cao (phong do that thuong) bi tru
                them. Dong luc thap lam muc phat nhe hon.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
        >
          Dong
        </button>
      </div>
    </div>
  );
}
