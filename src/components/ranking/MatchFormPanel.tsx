import {
  CheckCircleOutlined,
  PlusOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Radio,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { MatchSetInput, Member } from "./types";

interface MatchFormPanelProps {
  members: Member[];
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

export default function MatchFormPanel({
  members,
  matchType,
  matchData,
  onSetMatchType,
  onSetMatchData,
  onSaveMatch,
}: MatchFormPanelProps) {
  const { t } = useTranslation();
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

    return members.filter((member) => !selectedInOtherSlots.has(member.name));
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

  const playedAtValue = dayjs(matchData.playedAt);
  const playedAt = playedAtValue.isValid() ? playedAtValue : null;

  return (
    <Card style={{ maxWidth: 920 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card size="small" title={t("matchForm.teamA")}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {[...Array(slotCount)].map((_, i) => (
                <Select
                  key={`teamA-${i}`}
                  placeholder={t("matchForm.choosePlayer")}
                  value={matchData.team1[i] || undefined}
                  allowClear
                  options={getSelectableMembers("team1", i).map((member) => ({
                    value: member.name,
                    label: member.name,
                  }))}
                  onChange={(value) => {
                    const nextTeam = [...matchData.team1];
                    nextTeam[i] = value || "";
                    onSetMatchData({ ...matchData, team1: nextTeam });
                  }}
                />
              ))}
            </Space>
          </Card>

          <Card size="small" title={t("matchForm.teamB")}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {[...Array(slotCount)].map((_, i) => (
                <Select
                  key={`teamB-${i}`}
                  placeholder={t("matchForm.choosePlayer")}
                  value={matchData.team2[i] || undefined}
                  allowClear
                  options={getSelectableMembers("team2", i).map((member) => ({
                    value: member.name,
                    label: member.name,
                  }))}
                  onChange={(value) => {
                    const nextTeam = [...matchData.team2];
                    nextTeam[i] = value || "";
                    onSetMatchData({ ...matchData, team2: nextTeam });
                  }}
                />
              ))}
            </Space>
          </Card>
        </div>

        <Form layout="vertical" requiredMark={false}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <Form.Item
              label={t("matchForm.setResults")}
              style={{ marginBottom: 0 }}
            >
              <Typography.Text type="secondary">
                {t("matchForm.playedAt")}
              </Typography.Text>
            </Form.Item>
            <Form.Item
              label={t("matchForm.playedAt")}
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                value={playedAt}
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
          </div>
        </Form>

        <Button icon={<PlusOutlined />} onClick={addSetInput}>
          {t("matchForm.addSet")}
        </Button>

        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {matchData.sets.map((set, i) => (
            <div
              key={`set-${i}`}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <InputNumber
                min={0}
                placeholder={t("matchForm.setTeamA", { index: i + 1 })}
                value={set.team1Score === "" ? null : Number(set.team1Score)}
                onChange={(value) => {
                  if (value !== null && value < 0) return;
                  const nextSets = [...matchData.sets];
                  nextSets[i] = {
                    ...nextSets[i],
                    team1Score: value === null ? "" : String(value),
                  };
                  onSetMatchData({ ...matchData, sets: nextSets });
                }}
                style={{ width: "100%" }}
              />
              <InputNumber
                min={0}
                placeholder={t("matchForm.setTeamB", { index: i + 1 })}
                value={set.team2Score === "" ? null : Number(set.team2Score)}
                onChange={(value) => {
                  if (value !== null && value < 0) return;
                  const nextSets = [...matchData.sets];
                  nextSets[i] = {
                    ...nextSets[i],
                    team2Score: value === null ? "" : String(value),
                  };
                  onSetMatchData({ ...matchData, sets: nextSets });
                }}
                style={{ width: "100%" }}
              />
              <InputNumber
                min={0}
                placeholder={t("matchForm.setMinutes", { index: i + 1 })}
                value={set.minutes === "" ? null : Number(set.minutes)}
                onChange={(value) => {
                  if (value !== null && value < 0) return;
                  const nextSets = [...matchData.sets];
                  nextSets[i] = {
                    ...nextSets[i],
                    minutes: value === null ? "" : String(value),
                  };
                  onSetMatchData({ ...matchData, sets: nextSets });
                }}
                style={{ width: "100%" }}
              />
            </div>
          ))}
        </Space>

        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={!canSaveMatch}
          onClick={onSaveMatch}
          block
        >
          {t("matchForm.saveResult")}
        </Button>
      </Space>
    </Card>
  );
}
