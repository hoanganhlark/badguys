import {
  Button,
  Col,
  Divider,
  Grid,
  Modal,
  Row,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DownOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RankingMetricVisibility } from "../../types";
import type { AdvancedStats } from "./types";

interface PlayerStatsModalProps {
  stats: AdvancedStats;
  metricVisibility: RankingMetricVisibility;
  onClose: () => void;
}

// Helper: Categorize rating into skill levels
type RatingCategory = "learning" | "growing" | "stable" | "advanced";

function getRatingCategory(rating: number): RatingCategory {
  if (rating < 1300) return "learning";
  if (rating < 1500) return "growing";
  if (rating < 1700) return "stable";
  return "advanced";
}

// Helper: Categorize RD (confidence level)
function getConfidenceLevel(
  rd: number,
):
  | "veryLittleData"
  | "roughEstimate"
  | "becomingReliable"
  | "fairlyCertain"
  | "veryCertain" {
  if (rd > 280) return "veryLittleData";
  if (rd > 200) return "roughEstimate";
  if (rd > 120) return "becomingReliable";
  if (rd > 60) return "fairlyCertain";
  return "veryCertain";
}

// Helper: Categorize volatility (consistency level)
function getConsistencyLevel(
  vol: number,
): "hardToPredict" | "volatile" | "normal" | "veryStable" {
  if (vol > 0.16) return "hardToPredict";
  if (vol > 0.1) return "volatile";
  if (vol > 0.06) return "normal";
  return "veryStable";
}

// Color mapping for badges
function getCategoryColor(category: RatingCategory): string {
  switch (category) {
    case "learning":
      return "#ff7a45";
    case "growing":
      return "#faad14";
    case "stable":
      return "#52c41a";
    case "advanced":
      return "#1890ff";
  }
}

function getConfidenceColor(
  level:
    | "veryLittleData"
    | "roughEstimate"
    | "becomingReliable"
    | "fairlyCertain"
    | "veryCertain",
): string {
  switch (level) {
    case "veryLittleData":
      return "#ff4d4f";
    case "roughEstimate":
      return "#ff7a45";
    case "becomingReliable":
      return "#faad14";
    case "fairlyCertain":
      return "#52c41a";
    case "veryCertain":
      return "#1890ff";
  }
}

function getConsistencyColor(
  level: "hardToPredict" | "volatile" | "normal" | "veryStable",
): string {
  switch (level) {
    case "hardToPredict":
      return "#ff4d4f";
    case "volatile":
      return "#ff7a45";
    case "normal":
      return "#faad14";
    case "veryStable":
      return "#1890ff";
  }
}

interface MetricCardProps {
  label: string;
  value: string | number;
  badge: React.ReactNode;
  description: string;
}

function MetricCard({ label, value, badge, description }: MetricCardProps) {
  return (
    <div style={{ padding: "12px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <Typography.Text strong>{label}</Typography.Text>
        {badge}
      </div>
      <Typography.Text
        style={{
          fontSize: "24px",
          fontWeight: 600,
          display: "block",
          marginBottom: "4px",
        }}
      >
        {value}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
        {description}
      </Typography.Text>
    </div>
  );
}

export default function PlayerStatsModal({
  stats,
  metricVisibility,
  onClose,
}: PlayerStatsModalProps) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const [showSimpleExplanation, setShowSimpleExplanation] = useState(false);

  const ratingCategory = getRatingCategory(stats.rating);
  const confidenceLevel = getConfidenceLevel(stats.rd);
  const consistencyLevel = getConsistencyLevel(stats.vol);

  return (
    <Modal
      open
      onCancel={onClose}
      onOk={onClose}
      width={isMobile ? "100vw" : 800}
      centered={!isMobile}
      style={
        isMobile
          ? {
              top: 0,
              margin: 0,
              paddingBottom: 0,
              height: "100dvh",
              maxWidth: "100vw",
            }
          : undefined
      }
      styles={{
        body: {
          overflowX: "hidden",
          overflowY: "auto",
          maxHeight: isMobile ? "calc(100dvh - 132px)" : "70vh",
        },
      }}
      okText={t("common.close")}
      cancelButtonProps={{ style: { display: "none" } }}
      title={
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <Typography.Text strong style={{ fontSize: 20 }}>
              {stats.name}
            </Typography.Text>
            <Tag color={getCategoryColor(ratingCategory)}>
              {t(`playerStats.${ratingCategory}`)}
            </Tag>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
            {t("playerStats.ratingScore")}: {Math.round(stats.rating)}
          </Typography.Text>
        </div>
      }
    >
      <div style={{ width: "100%", overflowX: "hidden" }}>
        {/* Main Metrics Grid */}
        <Row gutter={[16, 16]}>
          {metricVisibility.skill && (
            <Col xs={24} sm={12}>
              <MetricCard
                label={t("playerStats.skill")}
                value={Math.round(stats.rating)}
                badge={
                  <Tooltip title={t("playerStats.descriptionSkill")}>
                    <Tag
                      color={getCategoryColor(ratingCategory)}
                      style={{ cursor: "help" }}
                    >
                      {t(`playerStats.${ratingCategory}`)}
                    </Tag>
                  </Tooltip>
                }
                description={t("playerStats.descriptionSkill")}
              />
            </Col>
          )}

          {metricVisibility.winRate && (
            <Col xs={24} sm={12}>
              <MetricCard
                label={t("playerStats.winRate")}
                value={`${(stats.winRate * 100).toFixed(1)}%`}
                badge={
                  <Tag color="#06b6d4">
                    {stats.totalMatches > 0
                      ? `${stats.wins}/${stats.totalMatches}`
                      : "0/0"}
                  </Tag>
                }
                description={t("playerStats.descriptionWinRate")}
              />
            </Col>
          )}

          {metricVisibility.confidence && (
            <Col xs={24} sm={12}>
              <MetricCard
                label={t("playerStats.confidence")}
                value={stats.rd.toFixed(1)}
                badge={
                  <Tooltip title={t("playerStats.descriptionConfidence")}>
                    <Tag
                      color={getConfidenceColor(confidenceLevel)}
                      style={{ cursor: "help" }}
                    >
                      {t(`playerStats.${confidenceLevel}`)}
                    </Tag>
                  </Tooltip>
                }
                description={t("playerStats.descriptionConfidence")}
              />
            </Col>
          )}

          {metricVisibility.consistency && (
            <Col xs={24} sm={12}>
              <MetricCard
                label={t("playerStats.consistency")}
                value={stats.vol.toFixed(4)}
                badge={
                  <Tooltip title={t("playerStats.descriptionConsistency")}>
                    <Tag
                      color={getConsistencyColor(consistencyLevel)}
                      style={{ cursor: "help" }}
                    >
                      {t(`playerStats.${consistencyLevel}`)}
                    </Tag>
                  </Tooltip>
                }
                description={t("playerStats.descriptionConsistency")}
              />
            </Col>
          )}
        </Row>

        {/* Explanation Section */}
        <Divider style={{ margin: "20px 0" }} />
        <div style={{ paddingTop: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <Button
              type="default"
              size="small"
              onClick={() => setShowSimpleExplanation((prev) => !prev)}
              iconPlacement="end"
              icon={
                showSimpleExplanation ? <DownOutlined /> : <RightOutlined />
              }
              aria-pressed={showSimpleExplanation}
              aria-label={t("playerStats.simpleExplanation")}
            >
              {t("playerStats.simpleExplanation")}
            </Button>
          </div>
          {showSimpleExplanation ? (
            <Typography.Text
              type="secondary"
              style={{ fontSize: "13px", lineHeight: "1.6" }}
            >
              {t("playerStats.simpleText")}
            </Typography.Text>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
