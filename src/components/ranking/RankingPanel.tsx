import {
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
  User,
  Users,
} from "react-feather";
import { memo, useMemo } from "react";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Table, Typography, type TableColumnsType } from "antd";
import { useTranslation } from "react-i18next";
import type { RankingCategory } from "../../types";
import type { AdvancedStats, Match } from "./types";

interface RankingPanelProps {
  rankings: AdvancedStats[];
  historyMatches: Match[];
  isHistoryExpanded: boolean;
  isHistoryLoading: boolean;
  onToggleHistory: (nextExpanded: boolean) => void | Promise<void>;
  historyPagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onHistoryPaginationChange: (page: number, pageSize: number) => void;
  rankTrends: Record<number, number | "NEW">;
  showRankTrend: boolean;
  categories: RankingCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  memberLevelById: Record<number, string>;
  onSelectPlayer: (player: AdvancedStats) => void;
  onClearHistory: () => void | Promise<void>;
  onDeleteMatch: (matchId: number | string) => void | Promise<void>;
  isAdmin: boolean;
  currentUserId: string;
}

function formatMatchDateTime(dateText: string): string {
  if (!dateText) return "--/--/---- --:--";
  return dateText;
}

function formatSet(setText: string): string {
  const [score, minutes] = String(setText || "").split("@");
  const normalizedMinutes = Number.parseInt(String(minutes || ""), 10);
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) {
    return score;
  }
  return `${score} (${normalizedMinutes}p)`;
}

function formatDisplayName(name: string): {
  firstName: string;
  lastName: string;
} {
  const tokens = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: "-", lastName: "" };
  }

  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: "" };
  }

  return {
    firstName: tokens.slice(0, -1).join(" "),
    lastName: tokens[tokens.length - 1].toUpperCase(),
  };
}

function RankingPanel({
  rankings,
  historyMatches,
  isHistoryExpanded,
  isHistoryLoading,
  onToggleHistory,
  historyPagination,
  onHistoryPaginationChange,
  rankTrends,
  showRankTrend,
  categories,
  selectedCategoryId,
  onSelectCategory,
  memberLevelById,
  onSelectPlayer,
  onClearHistory,
  onDeleteMatch,
  isAdmin,
  currentUserId,
}: RankingPanelProps) {
  const { t } = useTranslation();

  const hasRankings = rankings.length > 0;
  const hasHistory = historyPagination.total > 0;

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [categories],
  );

  const selectedCategory = useMemo(
    () =>
      sortedCategories.find((category) => category.id === selectedCategoryId) ||
      sortedCategories[0],
    [selectedCategoryId, sortedCategories],
  );

  const filteredRankings = useMemo(() => {
    if (!selectedCategory) return [];
    return rankings.filter(
      (player) => memberLevelById[player.id] === selectedCategory.name,
    );
  }, [memberLevelById, rankings, selectedCategory]);

  const rankingRows = filteredRankings.map((player) => ({
    key: player.name,
    rank: rankings.findIndex((entry) => entry.id === player.id) + 1,
    player,
  }));

  const rankingColumns: TableColumnsType<(typeof rankingRows)[number]> = [
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.rank")}
        </span>
      ),
      dataIndex: "rank",
      key: "rank",
      width: 72,
      render: (rank: number, row) => {
        const trend = showRankTrend ? rankTrends[row.player.id] : undefined;
        let trendClassName = "text-slate-400";
        let trendDisplay = <MinusOutlined className="text-[11px]" />;

        if (trend === "NEW") {
          trendClassName = "text-blue-600";
          trendDisplay = (
            <>
              <PlusOutlined className="text-[11px]" />
              <span>NEW</span>
            </>
          );
        } else if (typeof trend === "number" && trend > 0) {
          trendClassName = "text-green-600";
          trendDisplay = (
            <>
              <CaretUpOutlined className="text-[14px]" />
              <span>{trend}</span>
            </>
          );
        } else if (typeof trend === "number" && trend < 0) {
          trendClassName = "text-red-500";
          trendDisplay = (
            <>
              <CaretDownOutlined className="text-[14px]" />
              <span>{Math.abs(trend)}</span>
            </>
          );
        }

        return (
          <div className="flex leading-tight whitespace-nowrap">
            <Typography.Text className="text-slate-400 text-xs">
              {rank}
            </Typography.Text>
            <span
              className={`inline-flex items-center gap-1 text-[12px] font-semibold pl-2 ${trendClassName}`}
            >
              {trendDisplay}
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.athlete")}
        </span>
      ),
      dataIndex: ["player", "name"],
      key: "name",
      width: 140,
      ellipsis: true,
      render: (name: string) => {
        const displayName = formatDisplayName(name);

        return (
          <Typography.Text ellipsis={{ tooltip: String(name || "") }}>
            {displayName.firstName}{" "}
            {displayName.lastName ? (
              <strong>{displayName.lastName}</strong>
            ) : null}
          </Typography.Text>
        );
      },
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.points")}
        </span>
      ),
      key: "rankScore",
      width: 104,
      align: "right",
      render: (_, row) => (
        <Typography.Text strong className="text-slate-700">
          {row.player.rankScore.toFixed(4)}
        </Typography.Text>
      ),
    },
  ];

  const historyColumns: TableColumnsType<Match> = [
    {
      title: t("rankingPanel.historyTeams"),
      key: "teams",
      width: 300,
      ellipsis: true,
      render: (_, row) => (
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
              {row.team1.join(" & ")}{" "}
              <span className="mx-1 text-slate-400">vs</span>{" "}
              {row.team2.join(" & ")}
            </span>
          </span>
        </Typography.Text>
      ),
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
      title: t("rankingPanel.historyActions"),
      key: "actions",
      width: 74,
      align: "center",
      render: (_, row) =>
        isAdmin || row.createdBy === currentUserId ? (
          <button
            type="button"
            onClick={() => onDeleteMatch(row.id)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-600 hover:bg-red-50"
            aria-label={t("rankingPanel.deleteThisMatch")}
            title={t("rankingPanel.deleteThisMatch")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`rounded-sm border px-5 py-2 text-xs font-semibold transition-colors ${
                selectedCategoryId === category.id
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
              }`}
            >
              {category.displayName}
            </button>
          ))}
        </div>

        {!hasRankings ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {t("rankingPanel.noRankings")}
          </div>
        ) : null}

        {hasRankings && rankingRows.length > 0 ? (
          <Table
            columns={rankingColumns}
            dataSource={rankingRows}
            size="small"
            showSorterTooltip={false}
            pagination={false}
            scroll={{ x: 340 }}
            className="ranking-ui-table"
            onRow={(row) => ({
              onClick: () => onSelectPlayer(row.player),
              style: { cursor: "pointer" },
            })}
          />
        ) : null}

        {hasRankings && rankingRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {t("rankingPanel.noRankings")}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-700" />{" "}
            {t("rankingPanel.recentHistory")}
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={onClearHistory}
                disabled={!hasHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />{" "}
                {t("rankingPanel.clearHistory")}
              </button>
            ) : null}
            <Button
              type="default"
              size="small"
              onClick={() => void onToggleHistory(!isHistoryExpanded)}
              icon={
                isHistoryExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              }
            >
              {isHistoryExpanded
                ? t("rankingPanel.collapseHistory")
                : t("rankingPanel.expandHistory")}
            </Button>
          </div>
        </div>

        {isHistoryExpanded ? (
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <Table
              rowKey={(row) => String(row.id)}
              columns={historyColumns}
              dataSource={historyMatches}
              size="small"
              loading={isHistoryLoading}
              pagination={{
                current: historyPagination.current,
                pageSize: historyPagination.pageSize,
                total: historyPagination.total,
                showSizeChanger: true,
                pageSizeOptions: [5, 10, 20],
                onChange: onHistoryPaginationChange,
              }}
              locale={{
                emptyText: isHistoryLoading
                  ? t("rankingPanel.loadingHistory")
                  : t("rankingPanel.noHistory"),
              }}
              scroll={{ x: 860 }}
              className="ranking-ui-table"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(RankingPanel);
