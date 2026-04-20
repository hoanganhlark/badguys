import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  InputNumber,
  Row,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MatchSetInput, Member } from "./types";
import type { RankingCategory } from "../../types";

interface MatchFormPanelProps {
  members: Member[];
  categories: RankingCategory[];
  matchType: "singles" | "doubles";
  matchData: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
    playedAt: string;
  };
  onSetMatchType: (type: "singles" | "doubles") => void;
  onSetMatchData: (next: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
    playedAt: string;
  }) => void;
  onSaveMatch: () => void;
}

function MatchFormPanel({
  members,
  categories,
  matchType,
  matchData,
  onSetMatchType,
  onSetMatchData,
  onSaveMatch,
}: MatchFormPanelProps) {
  const { t } = useTranslation();
  const categoryOrderByName = useMemo(
    () =>
      [...categories]
        .sort(
          (a, b) =>
            a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"),
        )
        .reduce<Record<string, number>>((acc, category, index) => {
          acc[category.name] = index;
          return acc;
        }, {}),
    [categories],
  );

  const slotCount = matchType === "singles" ? 1 : 2;
  const selectedTeam1 = matchData.team1
    .slice(0, slotCount)
    .filter((name) => name?.trim());
  const selectedTeam2 = matchData.team2
    .slice(0, slotCount)
    .filter((name) => name?.trim());
  const hasValidTeams =
    selectedTeam1.length === slotCount && selectedTeam2.length === slotCount;
  const hasValidSet = matchData.sets.some((set) => {
    const scoreA = Number.parseInt(set.team1Score, 10);
    const scoreB = Number.parseInt(set.team2Score, 10);
    const minutes = Number.parseInt(String(set.minutes || ""), 10);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return false;
    if (scoreA < 0 || scoreB < 0) return false;
    if (!Number.isNaN(minutes) && minutes < 0) return false;
    return true;
  });
  const canSaveMatch = hasValidTeams && hasValidSet;

  const getSelectableMembers = (team: "team1" | "team2", index: number) => {
    const currentSelection = matchData[team][index];
    const selectedInOtherSlots = new Set(
      [...matchData.team1, ...matchData.team2].filter(
        (name) => name && name !== currentSelection,
      ),
    );

    return members
      .filter((member) => !selectedInOtherSlots.has(member.name))
      .sort((a, b) => {
        const orderA =
          categoryOrderByName[a.level] ?? Number.MAX_SAFE_INTEGER;
        const orderB =
          categoryOrderByName[b.level] ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;

        return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
      });
  };

  const addSetInput = () => {
    onSetMatchData({
      ...matchData,
      sets: [
        ...matchData.sets,
        { team1Score: "", team2Score: "", minutes: "" },
      ],
    });
  };

  const removeSetInput = (index: number) => {
    if (matchData.sets.length <= 1) return;
    const nextSets = matchData.sets.filter((_, i) => i !== index);
    onSetMatchData({
      ...matchData,
      sets: nextSets,
    });
  };

  const updateTeamSelection = (
    team: "team1" | "team2",
    index: number,
    value?: string,
  ) => {
    const nextTeam = [...matchData[team]];
    nextTeam[index] = value || "";
    onSetMatchData({ ...matchData, [team]: nextTeam });
  };

  const updateSetValue = (
    index: number,
    key: "team1Score" | "team2Score" | "minutes",
    value: number | null,
  ) => {
    if (value !== null && value < 0) return;
    const nextSets = [...matchData.sets];
    nextSets[index] = {
      ...nextSets[index],
      [key]: value === null ? "" : String(value),
    };
    onSetMatchData({ ...matchData, sets: nextSets });
  };

  const playedAtValue = dayjs(matchData.playedAt);
  const playedAt = playedAtValue.isValid() ? playedAtValue : null;

  return (
    <Card style={{ maxWidth: 920 }}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Form layout="vertical" requiredMark={false}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={14}>
              <Form.Item
                label={t("rankingPage.recordResult")}
                style={{ marginBottom: 0 }}
              >
                <Radio.Group
                  value={matchType}
                  buttonStyle="solid"
                  onChange={(event) => onSetMatchType(event.target.value)}
                >
                  <Radio.Button value="doubles">
                    <Space>
                      <UsergroupAddOutlined />
                      {t("matchForm.doubles")}
                    </Space>
                  </Radio.Button>
                  <Radio.Button value="singles">
                    <Space>
                      <UserOutlined />
                      {t("matchForm.singles")}
                    </Space>
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                label={t("matchForm.playedAt")}
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  value={playedAt}
                  style={{ width: "100%" }}
                  suffixIcon={<ClockCircleOutlined />}
                  onChange={(value) => {
                    const nextPlayedAt = value
                      ? value.format("YYYY-MM-DDTHH:mm")
                      : "";
                    onSetMatchData({
                      ...matchData,
                      playedAt: nextPlayedAt,
                    });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Card size="small" title={t("matchForm.teamA")}>
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {[...Array(slotCount)].map((_, i) => (
                  <Form.Item
                    key={`teamA-player-${i}`}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder={t("matchForm.choosePlayer")}
                      value={matchData.team1[i] || undefined}
                      allowClear
                      options={getSelectableMembers("team1", i).map(
                        (member) => ({
                          value: member.name,
                          label: member.name,
                        }),
                      )}
                      onChange={(value) =>
                        updateTeamSelection("team1", i, value)
                      }
                    />
                  </Form.Item>
                ))}
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card size="small" title={t("matchForm.teamB")}>
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {[...Array(slotCount)].map((_, i) => (
                  <Form.Item
                    key={`teamB-player-${i}`}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder={t("matchForm.choosePlayer")}
                      value={matchData.team2[i] || undefined}
                      allowClear
                      options={getSelectableMembers("team2", i).map(
                        (member) => ({
                          value: member.name,
                          label: member.name,
                        }),
                      )}
                      onChange={(value) =>
                        updateTeamSelection("team2", i, value)
                      }
                    />
                  </Form.Item>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider style={{ margin: 0 }} />

        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t("matchForm.setResults")}
            </Typography.Title>
            <Button icon={<PlusOutlined />} onClick={addSetInput}>
              {t("matchForm.addSet")}
            </Button>
          </Space>

          {matchData.sets.map((set, i) => (
            <Card
              key={`set-${i}`}
              size="small"
              title={`Set ${i + 1}`}
              extra={
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => removeSetInput(i)}
                  disabled={matchData.sets.length <= 1}
                  aria-label={`Remove set ${i + 1}`}
                />
              }
            >
              <Row gutter={[10, 10]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label={t("matchForm.setTeamA")}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t("matchForm.setTeamA")}
                      value={
                        set.team1Score === "" ? null : Number(set.team1Score)
                      }
                      onChange={(value) =>
                        updateSetValue(i, "team1Score", value)
                      }
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label={t("matchForm.setTeamB")}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t("matchForm.setTeamB")}
                      value={
                        set.team2Score === "" ? null : Number(set.team2Score)
                      }
                      onChange={(value) =>
                        updateSetValue(i, "team2Score", value)
                      }
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label={t("matchForm.setMinutes")}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      placeholder={t("matchForm.setMinutes")}
                      value={set.minutes === "" ? null : Number(set.minutes)}
                      onChange={(value) => updateSetValue(i, "minutes", value)}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>

        <Alert
          type={canSaveMatch ? "success" : "info"}
          showIcon
          message={
            canSaveMatch
              ? t("matchForm.saveResult")
              : t("matchForm.completeRequiredFields")
          }
        />

        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={!canSaveMatch}
          onClick={onSaveMatch}
          block
          size="large"
        >
          {t("matchForm.saveResult")}
        </Button>
      </Space>
    </Card>
  );
}

export default memo(MatchFormPanel);
