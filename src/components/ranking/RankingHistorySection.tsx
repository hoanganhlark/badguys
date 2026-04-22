import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Trash2,
  User,
  Users,
} from "react-feather";
import {
  Button,
  Grid,
  Popconfirm,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import type { Match } from "./types";
import { useAuth } from "../../context/AuthContext";
import { envConfig } from "../../env";
import DashboardTableSkeleton from "../dashboard/DashboardTableSkeleton";

interface RankingHistorySectionProps {
  historyMatches: Match[];
  totalHistoryCount: number;
  isHistoryLoading: boolean;
  isMatchesLoading: boolean;
  historyPage: number;
  historyPageSize: number;
  isHistoryExpanded: boolean;
  currentUserId: string;
  onToggleHistory: (expanded: boolean) => Promise<void>;
  onHistoryPaginationChange: (page: number, pageSize: number) => void;
  onDeleteMatch: (matchId: number | string) => Promise<void>;
  onClearHistory: () => Promise<void>;
}

function formatMatchDateTime(dateText: string): string {
  if (!dateText) return "--/--/---- --:--";
  return dateText;
}

function formatSet(setText: string): string {
  const [score, minutes] = String(setText || "").split("@");
  const normalizedMinutes = Number.parseInt(String(minutes || ""), 5);
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) {
    return score;
  }
  return `${score} (${normalizedMinutes}p)`;
}

function getTeamToneByMatch(sets: string[]): {
  team1ClassName: string;
  team2ClassName: string;
} {
  let team1SetWins = 0;
  let team2SetWins = 0;

  for (const set of sets) {
    const [scorePart] = String(set || "").split("@");
    const [raw1, raw2] = String(scorePart || "").split("-");
    const score1 = Number.parseInt(String(raw1 || ""), 10);
    const score2 = Number.parseInt(String(raw2 || ""), 10);

    if (!Number.isFinite(score1) || !Number.isFinite(score2)) continue;
    if (score1 > score2) team1SetWins += 1;
    if (score2 > score1) team2SetWins += 1;
  }

  if (team1SetWins > team2SetWins) {
    return {
      team1ClassName: "text-emerald-600 font-semibold",
      team2ClassName: "text-red-600 font-semibold",
    };
  }

  if (team2SetWins > team1SetWins) {
    return {
      team1ClassName: "text-red-600 font-semibold",
      team2ClassName: "text-emerald-600 font-semibold",
    };
  }

  return {
    team1ClassName: "text-slate-700",
    team2ClassName: "text-slate-700",
  };
}

export default function RankingHistorySection({
  historyMatches,
  totalHistoryCount,
  isHistoryLoading,
  isMatchesLoading,
  historyPage,
  historyPageSize,
  isHistoryExpanded,
  currentUserId,
  onToggleHistory,
  onHistoryPaginationChange,
  onDeleteMatch,
  onClearHistory,
}: RankingHistorySectionProps) {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const hasHistory = totalHistoryCount > 0;
  const historyTableScroll = screens.md
    ? { x: 860, y: 360 }
    : { x: 860, y: 300 };

  const historyColumns: TableColumnsType<Match> = [
    {
      title: t("rankingPanel.historyTeams"),
      key: "teams",
      width: 300,
      ellipsis: true,
      render: (_, row) => {
        const tones = getTeamToneByMatch(row.sets);
        return (
          <Typography.Text
            ellipsis={{
              tooltip: `${row.team1.join(" & ")} vs ${row.team2.join(" & ")}`,
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              {row.type === "singles" ? (
                <User className="h-3.5 w-3.5 text-slate-500" />
              ) : (
                <Users className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>
                <span className={tones.team1ClassName}>
                  {row.team1.join(" & ")}
                </span>{" "}
                <span className="mx-1 text-slate-400">vs</span>{" "}
                <span className={tones.team2ClassName}>
                  {row.team2.join(" & ")}
                </span>
              </span>
            </span>
          </Typography.Text>
        );
      },
    },
    {
      title: t("rankingPanel.historyResult"),
      key: "sets",
      width: 170,
      render: (_, row) => (
        <Typography.Text className="text-xs text-slate-700">
          {row.sets.map(formatSet).join(", ")}
        </Typography.Text>
      ),
    },
    {
      title: t("rankingPanel.historyTime"),
      dataIndex: "date",
      key: "date",
      width: 148,
      render: (value: string) => (
        <Typography.Text className="text-xs text-slate-500">
          {formatMatchDateTime(value)}
        </Typography.Text>
      ),
    },
    {
      title: t("rankingPanel.historyCreator"),
      key: "creator",
      width: 130,
      ellipsis: true,
      render: (_, row) => (
        <Typography.Text ellipsis className="text-xs text-slate-500">
          {row.createdByUsername || row.createdBy || "-"}
        </Typography.Text>
      ),
    },
    {
      title: t("rankingPanel.historyActions"),
      key: "actions",
      width: 74,
      align: "center",
      render: (_, row) =>
        isAdmin || row.createdBy === currentUserId ? (
          <Popconfirm
            title={t("common.confirmDelete")}
            okText={t("rankingPanel.deleteThisMatch")}
            cancelText={t("common.cancel")}
            onConfirm={() => onDeleteMatch(row.id)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-600 hover:bg-red-50"
              aria-label={t("rankingPanel.deleteThisMatch")}
              title={t("rankingPanel.deleteThisMatch")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Popconfirm>
        ) : null,
    },
  ];

  if (!isHistoryExpanded) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4 flex justify-end">
        <Button
          type="default"
          size="small"
          onClick={() => void onToggleHistory(true)}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          {t("rankingPanel.expandHistory")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 md:px-4 md:py-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-700" />
          {t("rankingPanel.recentHistory")}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && envConfig.isDevelopment ? (
            <Popconfirm
              title={t("common.confirmDelete")}
              okText={t("rankingPanel.clearHistory")}
              cancelText={t("common.cancel")}
              onConfirm={onClearHistory}
              disabled={!hasHistory}
            >
              <button
                type="button"
                disabled={!hasHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("rankingPanel.clearHistory")}
              </button>
            </Popconfirm>
          ) : null}
          <Button
            type="default"
            size="small"
            onClick={() => void onToggleHistory(false)}
            icon={<ChevronDown className="h-4 w-4" />}
          >
            {t("rankingPanel.collapseHistory")}
          </Button>
        </div>
      </div>

      <div className="p-2.5 md:p-3">
        {isHistoryLoading ? (
          <DashboardTableSkeleton className="mt-1" />
        ) : (
          <Table
            rowKey={(row) => String(row.id)}
            columns={historyColumns}
            dataSource={historyMatches}
            size="small"
            pagination={{
              current: historyPage,
              pageSize: historyPageSize,
              total: totalHistoryCount,
              position: ["bottomRight"],
              responsive: false,
              showSizeChanger: true,
              pageSizeOptions: [5, 10, 20],
              onChange: onHistoryPaginationChange,
            }}
            locale={{
              emptyText:
                isMatchesLoading || isHistoryLoading
                  ? t("rankingPanel.loadingHistory")
                  : t("rankingPanel.noHistory"),
            }}
            scroll={historyTableScroll}
            className="ranking-ui-table"
          />
        )}
      </div>
    </div>
  );
}
