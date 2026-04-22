import { Collapse, Modal, Space, Tag, Tooltip, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { RankingMetricVisibility } from "../../types";
import { DEFAULT_RANKING_CONFIG } from "../../lib/rankingStats";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  metricVisibility: RankingMetricVisibility;
  onClose: () => void;
}

// Helper: Categorize rating into skill levels
function getRatingCategory(rating: number): "beginner" | "intermediate" | "advanced" | "expert" {
  if (rating < 1300) return "beginner";
  if (rating < 1500) return "intermediate";
  if (rating < 1700) return "advanced";
  return "expert";
}

// Helper: Determine if rating is above/below average
function getRatingComparison(rating: number): "below" | "average" | "above" {
  const diff = rating - DEFAULT_RANKING_CONFIG.rating;
  if (diff < -100) return "below";
  if (diff > 100) return "above";
  return "average";
}

// Helper: Categorize RD (confidence level)
function getConfidenceLevel(rd: number): "veryLittleData" | "roughEstimate" | "becomingReliable" | "fairlyCertain" | "veryCertain" {
  if (rd > 280) return "veryLittleData";
  if (rd > 200) return "roughEstimate";
  if (rd > 120) return "becomingReliable";
  if (rd > 60) return "fairlyCertain";
  return "veryCertain";
}

// Helper: Categorize volatility (consistency level)
function getConsistencyLevel(vol: number): "hardToPredict" | "volatile" | "normal" | "veryStable" {
  if (vol > 0.16) return "hardToPredict";
  if (vol > 0.1) return "volatile";
  if (vol > 0.06) return "normal";
  return "veryStable";
}

// Color mapping for badges
function getCategoryColor(category: "beginner" | "intermediate" | "advanced" | "expert"): string {
  switch (category) {
    case "beginner": return "#ff7a45";
    case "intermediate": return "#faad14";
    case "advanced": return "#52c41a";
    case "expert": return "#1890ff";
  }
}

function getConfidenceColor(level: "veryLittleData" | "roughEstimate" | "becomingReliable" | "fairlyCertain" | "veryCertain"): string {
  switch (level) {
    case "veryLittleData": return "#ff4d4f";
    case "roughEstimate": return "#ff7a45";
    case "becomingReliable": return "#faad14";
    case "fairlyCertain": return "#52c41a";
    case "veryCertain": return "#1890ff";
  }
}

function getConsistencyColor(level: "hardToPredict" | "volatile" | "normal" | "veryStable"): string {
  switch (level) {
    case "hardToPredict": return "#ff4d4f";
    case "volatile": return "#ff7a45";
    case "normal": return "#faad14";
    case "veryStable": return "#1890ff";
  }
}

export default function PlayerStatsModal({
  stats,
  metricVisibility,
  onClose,
}: PlayerStatsModalProps) {
  const { t } = useTranslation();

  const ratingCategory = getRatingCategory(stats.rating);
  const ratingComparison = getRatingComparison(stats.rating);
  const confidenceLevel = getConfidenceLevel(stats.rd);
  const consistencyLevel = getConsistencyLevel(stats.vol);

  // Build metric items with badges instead of progress bars
  const metricItems = [
    metricVisibility.skill && {
      id: "skill",
      label: t("playerStats.skill"),
      badge: (
        <Tooltip title={t("playerStats.descriptionSkill")}>
          <Tag color={getCategoryColor(ratingCategory)} style={{ cursor: "help" }}>
            {t(`playerStats.${ratingCategory}`)}
          </Tag>
        </Tooltip>
      ),
      value: `${Math.round(stats.rating)}`,
      comparison:
        ratingComparison === "above"
          ? t("playerStats.slightlyBetter")
          : ratingComparison === "below"
            ? t("playerStats.notDistinguishable")
            : "—",
      description: t("playerStats.descriptionSkill"),
    },
    metricVisibility.winRate && {
      id: "winRate",
      label: t("playerStats.winRate"),
      badge: (
        <Tag color="#06b6d4">
          {(stats.winRate * 100).toFixed(1)}%
        </Tag>
      ),
      value:
        stats.totalMatches > 0
          ? `${stats.wins}/${stats.totalMatches}`
          : "0/0",
      comparison: "—",
      description: t("playerStats.descriptionWinRate"),
    },
    metricVisibility.confidence && {
      id: "confidence",
      label: t("playerStats.confidence"),
      badge: (
        <Tooltip title={t("playerStats.descriptionConfidence")}>
          <Tag color={getConfidenceColor(confidenceLevel)} style={{ cursor: "help" }}>
            {t(`playerStats.${confidenceLevel}`)}
          </Tag>
        </Tooltip>
      ),
      value: `RD: ${stats.rd.toFixed(1)}`,
      comparison: "—",
      description: t("playerStats.descriptionConfidence"),
    },
    metricVisibility.consistency && {
      id: "consistency",
      label: t("playerStats.consistency"),
      badge: (
        <Tooltip title={t("playerStats.descriptionConsistency")}>
          <Tag color={getConsistencyColor(consistencyLevel)} style={{ cursor: "help" }}>
            {t(`playerStats.${consistencyLevel}`)}
          </Tag>
        </Tooltip>
      ),
      value: `σ: ${stats.vol.toFixed(4)}`,
      comparison: "—",
      description: t("playerStats.descriptionConsistency"),
    },
  ].filter(Boolean);

  const metricPanels = metricItems.map((item) => ({
    key: item.id,
    label: (
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        <Space>
          <Typography.Text strong>{item.label}</Typography.Text>
          {item.badge}
        </Space>
      </Space>
    ),
    children: (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <div>
          <Typography.Text type="secondary">{t("playerStats.currentValue", { value: item.value })}</Typography.Text>
          {item.comparison !== "—" && (
            <Typography.Text type="secondary" style={{ marginLeft: "16px" }}>
              {item.comparison}
            </Typography.Text>
          )}
        </div>
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
        <Space direction="vertical" size={4}>
          <Space align="center">
            <Typography.Text strong style={{ fontSize: 20 }}>
              {stats.name}
            </Typography.Text>
            <Tag color={getCategoryColor(ratingCategory)}>
              {t(`playerStats.${ratingCategory}`)}
            </Tag>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
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
