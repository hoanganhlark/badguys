import { Collapse, Modal, Progress, Space, Typography } from "antd";
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
      tone: "#3b82f6",
      description: t("playerStats.descriptionSkill"),
    },
    {
      id: "stability",
      label: t("playerStats.stability"),
      displayValue: `${stats.vol.toFixed(4)} (${getVolBadge(stats.vol, t)})`,
      progress: toPercent(stabilityProgress),
      tone: "#10b981",
      description: t("playerStats.descriptionStability"),
    },
    {
      id: "uncertainty",
      label: t("playerStats.uncertainty"),
      displayValue: `${stats.uncertaintyNorm.toFixed(3)} (${getUncertaintyBadge(stats.uncertaintyNorm, t)})`,
      progress: toPercent(uncertaintyProgress),
      tone: "#f59e0b",
      description: t("playerStats.descriptionUncertainty"),
    },
    {
      id: "motivation",
      label: t("playerStats.motivation"),
      displayValue: stats.motivation.toFixed(3),
      progress: toPercent(motivationProgress),
      tone: "#8b5cf6",
      description: t("playerStats.descriptionMotivation"),
    },
    {
      id: "winRate",
      label: t("playerStats.winRate"),
      displayValue: `${Math.round(stats.winRate * 100)}% (${stats.wins}/${stats.totalMatches})`,
      progress: toPercent(stats.winRate),
      tone: "#06b6d4",
      description: t("playerStats.descriptionWinRate"),
    },
  ].filter(
    (item) => metricVisibility[item.id as keyof RankingMetricVisibility],
  );

  const metricPanels = metricItems.map((item) => ({
    key: item.id,
    label: item.label,
    children: (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Progress
          percent={Number(item.progress.toFixed(1))}
          strokeColor={item.tone}
        />
        <Typography.Text type="secondary">{item.description}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("playerStats.currentValue", {
            value: item.displayValue,
          })}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("playerStats.progressShown", {
            value: item.progress.toFixed(1),
          })}
        </Typography.Text>
      </Space>
    ),
  }));

  return (
    <Modal
      open
      onCancel={onClose}
      onOk={onClose}
      width={760}
      okText={t("common.close")}
      cancelButtonProps={{ style: { display: "none" } }}
      title={
        <Space direction="vertical" size={0}>
          <Typography.Text strong style={{ fontSize: 20 }}>
            {stats.name}
          </Typography.Text>
          <Typography.Text type="secondary">
            {t("playerStats.rankScore")}: {stats.rankScore.toFixed(4)}
          </Typography.Text>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Collapse items={metricPanels} defaultActiveKey={[]} />

        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Typography.Text strong>
            {t("playerStats.formulaTitle")}
          </Typography.Text>
          <Typography.Text>
            {t("playerStats.formulaText", {
              penalty: penaltyCoefficient.toFixed(2),
            })}
          </Typography.Text>
          <Typography.Text type="secondary">
            {stats.skillNorm.toFixed(4)} - ({stats.uncertaintyNorm.toFixed(4)} x
            {stats.vol.toFixed(4)} x {penaltyCoefficient.toFixed(2)} x{" "}
            {stats.motivation.toFixed(4)})
          </Typography.Text>
        </Space>

        <Collapse
          defaultActiveKey={[]}
          items={[
            {
              key: "simple",
              label: t("playerStats.simpleExplanation"),
              children: (
                <Typography.Text type="secondary">
                  {t("playerStats.simpleText")}
                </Typography.Text>
              ),
            },
          ]}
        />
      </Space>
    </Modal>
  );
}
