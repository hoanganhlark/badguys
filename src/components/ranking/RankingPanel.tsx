import {
  CaretDownOutlined,
  CaretUpOutlined,
  DotChartOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Grid,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { memo, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRankingUIContext } from "../../features/ranking/context";
import type { RankingCategory } from "../../types";
import DashboardTableSkeleton from "../dashboard/DashboardTableSkeleton";
import RankingHistorySection from "./RankingHistorySection";
import type { AdvancedStats, Match } from "./types";

interface RankingPanelProps {
  officialRankings: AdvancedStats[];
  simulatedRankings: AdvancedStats[];
  todaysMatches: Match[];
  categories: RankingCategory[];
  isLoading: boolean;
  historyMatches: Match[];
  historyMatchesForDisplay: Match[];
  isHistoryLoading: boolean;
  isHistoryExpanded: boolean;
  historyPage: number;
  historyPageSize: number;
  officialTrends: Record<number, number | "NEW">;
  simulatedTrends: Record<number, number | "NEW">;
  showRankTrend: boolean;
  memberLevelById: Record<number, string>;
  currentUserId: string;
  onToggleHistory: (expanded: boolean) => Promise<void>;
  onHistoryPaginationChange: (page: number, pageSize: number) => void;
  onDeleteMatch: (matchId: number | string) => Promise<void>;
  onClearHistory: () => Promise<void>;
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
  officialRankings,
  simulatedRankings,
  todaysMatches,
  categories,
  isLoading,
  historyMatches,
  historyMatchesForDisplay,
  isHistoryLoading,
  isHistoryExpanded,
  historyPage,
  historyPageSize,
  officialTrends,
  simulatedTrends,
  showRankTrend,
  memberLevelById,
  currentUserId,
  onToggleHistory,
  onHistoryPaginationChange,
  onDeleteMatch,
  onClearHistory,
}: RankingPanelProps) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();

  const {
    selectedCategoryId,
    setSelectedCategoryId: onSelectCategory,
    setSelectedPlayer: onSelectPlayer,
    realtimeMode,
    setRealtimeMode,
  } = useRankingUIContext();

  const isMatchesLoading = isLoading;
  const historyPagination = {
    current: historyPage,
    pageSize: historyPageSize,
    total: historyMatchesForDisplay.length,
  };

  const hasRankings = officialRankings.length > 0;
  const rankingTableScroll = screens.md ? undefined : { y: 320 };

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

  useEffect(() => {
    if (sortedCategories.length === 0) return;
    const hasSelectedCategory = sortedCategories.some(
      (category) => category.id === selectedCategoryId,
    );
    if (!hasSelectedCategory) {
      onSelectCategory(sortedCategories[0].id);
    }
  }, [onSelectCategory, selectedCategoryId, sortedCategories]);

  // Select rankings and trends based on realtime mode
  const displayRankings =
    realtimeMode && todaysMatches.length > 0
      ? simulatedRankings
      : officialRankings;

  const displayTrends =
    realtimeMode && todaysMatches.length > 0 ? simulatedTrends : officialTrends;

  const filteredRankings = useMemo(() => {
    if (!selectedCategory) return [];
    return displayRankings.filter(
      (player) => memberLevelById[player.id] === selectedCategory.name,
    );
  }, [memberLevelById, displayRankings, selectedCategory]);

  type RankingRow = {
    key: number;
    rank: number;
    rating: number;
    player: AdvancedStats;
  };

  const rankingRows = useMemo(
    () =>
      [...filteredRankings]
        .sort((a, b) => {
          const roundedDiff = Math.round(b.rating) - Math.round(a.rating);
          if (roundedDiff !== 0) return roundedDiff;
          return a.name.localeCompare(b.name, "vi");
        })
        .reduce<RankingRow[]>(
          (acc, player, index) => {
            const rating = Math.round(player.rating);
            const prev = acc[index - 1];
            const rank = prev && prev.rating === rating ? prev.rank : index + 1;

            acc.push({
              key: player.id,
              rank,
              rating,
              player,
            });
            return acc;
          },
          [],
        ),
    [filteredRankings],
  );

  const rankingColumns: TableColumnsType<(typeof rankingRows)[number]> = [
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.rank")}
        </span>
      ),
      dataIndex: "rank",
      key: "rank",
      width: 60,
      render: (rank: number, row) => {
        const trend = showRankTrend ? displayTrends[row.player.id] : undefined;
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
      key: "rating",
      width: 92,
      align: "right",
      render: (_, row) => (
        <Typography.Text strong className="text-slate-700">
          {row.rating}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        {isMatchesLoading ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton.Button
                key={`category-skeleton-${index}`}
                active
                shape="square"
                size="small"
                style={{ width: 48, height: 24, borderRadius: 2 }}
              />
            ))}
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {sortedCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(category.id)}
                  className={`rounded-sm border px-5 py-2 text-xs font-semibold transition-colors ${
                    selectedCategory?.id === category.id
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {category.displayName}
                </button>
              ))}
            </div>
            <Tooltip
              title={
                todaysMatches.length === 0
                  ? t("rankingPanel.realtimeDisabled")
                  : realtimeMode
                    ? t("rankingPanel.realtimeActive")
                    : t("rankingPanel.realtimeInactive")
              }
            >
              <Button
                type={realtimeMode ? "primary" : "default"}
                size="small"
                icon={<DotChartOutlined />}
                onClick={() => {
                  if (todaysMatches.length > 0) {
                    setRealtimeMode(!realtimeMode);
                  }
                }}
                disabled={todaysMatches.length === 0}
                className="whitespace-nowrap"
              >
                {realtimeMode
                  ? t("rankingPanel.realtimeModeOn")
                  : t("rankingPanel.realtimeMode")}
              </Button>
            </Tooltip>
          </div>
        )}

        {!isMatchesLoading && !hasRankings ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {t("rankingPanel.noRankings")}
          </div>
        ) : null}

        {isMatchesLoading || (hasRankings && rankingRows.length > 0) ? (
          <div className="overflow-hidden rounded-lg border border-slate-100 bg-white">
            <div className="min-h-[240px] md:min-h-[280px]">
              {isMatchesLoading ? (
                <DashboardTableSkeleton rows={3} className="mt-1" />
              ) : (
                <Table
                  columns={rankingColumns}
                  dataSource={rankingRows}
                  size="small"
                  showSorterTooltip={false}
                  pagination={false}
                  scroll={rankingTableScroll}
                  className="ranking-ui-table"
                  onRow={(row) => ({
                    onClick: () => onSelectPlayer(row.player),
                    style: { cursor: "pointer" },
                  })}
                />
              )}
            </div>
          </div>
        ) : null}

        {!isMatchesLoading && hasRankings && rankingRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {t("rankingPanel.noRankings")}
          </div>
        ) : null}
      </div>

      <RankingHistorySection
        historyMatches={historyMatches}
        totalHistoryCount={historyPagination.total}
        isHistoryLoading={isHistoryLoading}
        isMatchesLoading={isLoading}
        historyPage={historyPagination.current}
        historyPageSize={historyPagination.pageSize}
        isHistoryExpanded={isHistoryExpanded}
        currentUserId={currentUserId}
        onToggleHistory={onToggleHistory}
        onHistoryPaginationChange={onHistoryPaginationChange}
        onDeleteMatch={onDeleteMatch}
        onClearHistory={onClearHistory}
      />
    </div>
  );
}

export default memo(RankingPanel);
