import { Collapse, Modal, Progress, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { RankingMetricVisibility } from "../../types";
import { DEFAULT_RANKING_CONFIG } from "../../lib/rankingStats";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  metricVisibility: RankingMetricVisibility;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number): number {
  return clamp(value, 0, 1) * 100;
}

const SKILL_BASELINE_RATING = DEFAULT_RANKING_CONFIG.rating - 300;
const SKILL_RATING_SPAN = 800;
const CONSISTENCY_VOL_CAP = DEFAULT_RANKING_CONFIG.vol * (10 / 3);

export default function PlayerStatsModal({
  stats,
  metricVisibility,
  onClose,
}: PlayerStatsModalProps) {
  const { t } = useTranslation();

  const skillProgress = clamp(
    (stats.rating - SKILL_BASELINE_RATING) / SKILL_RATING_SPAN,
    0,
    1,
  );
  const consistencyProgress = clamp(1 - stats.vol / CONSISTENCY_VOL_CAP, 0, 1);
  const confidenceProgress = clamp(
    1 - stats.rd / DEFAULT_RANKING_CONFIG.rd,
    0,
    1,
  );

  const metricItems = [
    {
      id: "skill",
      label: t("playerStats.skill"),
      progress: toPercent(skillProgress),
      value: `${Math.round(stats.rating)}`,
      tone: "#3b82f6",
      description: t("playerStats.descriptionSkill"),
    },
    {
      id: "winRate",
      label: t("playerStats.winRate"),
      progress: toPercent(stats.winRate),
      value:
        stats.totalMatches > 0
          ? `${(stats.winRate * 100).toFixed(1)}% (${stats.wins}/${stats.totalMatches})`
          : "0% (0/0)",
      tone: "#06b6d4",
      description: t("playerStats.descriptionWinRate"),
    },
    {
      id: "confidence",
      label: t("playerStats.confidence"),
      progress: toPercent(confidenceProgress),
      value: `RD=${stats.rd.toFixed(1)}`,
      tone: "#f59e0b",
      description: t("playerStats.descriptionConfidence"),
    },
    {
      id: "consistency",
      label: t("playerStats.consistency"),
      progress: toPercent(consistencyProgress),
      value: `sigma=${stats.vol.toFixed(3)}`,
      tone: "#10b981",
      description: t("playerStats.descriptionConsistency"),
    },
  ].filter(
    (item) => metricVisibility[item.id as keyof RankingMetricVisibility],
  );

  const metricPanels = metricItems.map((item) => ({
    key: item.id,
    label: (
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        <Typography.Text strong>{item.label}</Typography.Text>
        <Progress
          percent={Number(item.progress.toFixed(1))}
          strokeColor={item.tone}
          size="small"
        />
      </Space>
    ),
    children: (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text>
          {t("playerStats.currentValue", { value: item.value })}
        </Typography.Text>
        <Typography.Text type="secondary">{item.description}</Typography.Text>
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
            {t("playerStats.ratingScore")}: {Math.round(stats.rating)}
          </Typography.Text>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Collapse items={metricPanels} defaultActiveKey={[]} />

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
