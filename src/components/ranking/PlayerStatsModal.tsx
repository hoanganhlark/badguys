import { useEffect, useState } from "react";
import { ChevronDown, X } from "react-feather";
import { useTranslation } from "react-i18next";
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

function getVolBadge(vol: number, t: (key: string) => string): string {
  if (vol <= 0.05) return t("playerStats.veryStable");
  if (vol <= 0.07) return t("playerStats.normal");
  if (vol < 0.1) return t("playerStats.volatile");
  return t("playerStats.hardToPredict");
}

function getUncertaintyBadge(
  uncertaintyNorm: number,
  t: (key: string) => string,
): string {
  if (uncertaintyNorm > 1.2) return t("playerStats.veryLittleData");
  if (uncertaintyNorm >= 1.0) return t("playerStats.roughEstimate");
  if (uncertaintyNorm >= 0.7) return t("playerStats.becomingReliable");
  if (uncertaintyNorm >= 0.4) return t("playerStats.fairlyCertain");
  return t("playerStats.veryCertain");
}

function getSkillBadge(rating: number, t: (key: string) => string): string {
  if (rating < 1300) return t("playerStats.notDistinguishable");
  if (rating < 1500) return t("playerStats.slightlyBetter");
  if (rating <= 1700) return t("playerStats.clearlyBetter");
  return t("playerStats.differentClass");
}

export default function PlayerStatsModal({
  stats,
  penaltyCoefficient,
  metricVisibility,
  onClose,
}: PlayerStatsModalProps) {
  const { t } = useTranslation();
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
      label: t("playerStats.skill"),
      displayValue: `${stats.rating.toFixed(2)} (${getSkillBadge(stats.rating, t)})`,
      progress: toPercent(skillProgress),
      tone: "bg-blue-500",
      description: t("playerStats.descriptionSkill"),
    },
    {
      id: "stability",
      label: t("playerStats.stability"),
      displayValue: `${stats.vol.toFixed(4)} (${getVolBadge(stats.vol, t)})`,
      progress: toPercent(stabilityProgress),
      tone: "bg-emerald-500",
      description: t("playerStats.descriptionStability"),
    },
    {
      id: "uncertainty",
      label: t("playerStats.uncertainty"),
      displayValue: `${stats.uncertaintyNorm.toFixed(3)} (${getUncertaintyBadge(stats.uncertaintyNorm, t)})`,
      progress: toPercent(uncertaintyProgress),
      tone: "bg-amber-500",
      description: t("playerStats.descriptionUncertainty"),
    },
    {
      id: "motivation",
      label: t("playerStats.motivation"),
      displayValue: stats.motivation.toFixed(3),
      progress: toPercent(motivationProgress),
      tone: "bg-violet-500",
      description: t("playerStats.descriptionMotivation"),
    },
    {
      id: "winRate",
      label: t("playerStats.winRate"),
      displayValue: `${Math.round(stats.winRate * 100)}% (${stats.wins}/${stats.totalMatches})`,
      progress: toPercent(stats.winRate),
      tone: "bg-cyan-500",
      description: t("playerStats.descriptionWinRate"),
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
              {t("playerStats.rankScore")}: {stats.rankScore.toFixed(4)}
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
                    {t("playerStats.currentValue", {
                      value: item.displayValue,
                    })}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {t("playerStats.progressShown", {
                      value: item.progress.toFixed(1),
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-600 pt-2 border-t space-y-2">
          <p>
            <strong>{t("playerStats.formulaTitle")}</strong>{" "}
            {t("playerStats.formulaText", {
              penalty: penaltyCoefficient.toFixed(2),
            })}
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
            <span className="font-semibold text-gray-700">
              {t("playerStats.simpleExplanation")}
            </span>
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
                {t("playerStats.simpleText")}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
