import { Clock, Trash2, User, Users } from "react-feather";
import { useMemo } from "react";
import { Progress, Table, Typography, type TableColumnsType } from "antd";
import { useTranslation } from "react-i18next";
import type { RankingCategory } from "../../types";
import type { AdvancedStats, Match } from "./types";

interface RankingPanelProps {
  rankings: AdvancedStats[];
  matches: Match[];
  rankTrends: Record<number, number | "NEW">;
  categories: RankingCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
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

function parseMatchDate(match: Match): Date | null {
  if (match.playedAt) {
    const parsed = new Date(match.playedAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const normalized = String(match.date || "").trim();
  if (!normalized) return null;

  const [datePart] = normalized.split(" ");
  const segments = datePart.split("/");
  if (segments.length !== 3) return null;

  const [dd, mm, yyyy] = segments.map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) {
    return null;
  }

  const fallbackDate = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(fallbackDate.getTime())) return null;
  return fallbackDate;
}

function getDateGroupKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatVietnameseDateGroup(date: Date): string {
  const weekdays = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  const weekday = weekdays[date.getDay()] || "Không rõ";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

function getWinRate(matches: number, wins: number): number {
  if (matches <= 0) return 0;
  return Math.max(0, Math.min(100, (wins / matches) * 100));
}

function getWinRateTone(winRate: number): string {
  if (winRate >= 70) return "#10b981";
  if (winRate >= 50) return "#0ea5e9";
  if (winRate >= 35) return "#f59e0b";
  return "#f43f5e";
}

function formatSet(setText: string): string {
  const [score, minutes] = String(setText || "").split("@");
  const normalizedMinutes = Number.parseInt(String(minutes || ""), 10);
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) {
    return score;
  }
  return `${score} (${normalizedMinutes}p)`;
}

const AVATAR_COLORS = [
  "#ef5350",
  "#ec407a",
  "#ab47bc",
  "#7e57c2",
  "#42a5f5",
  "#26a69a",
  "#66bb6a",
  "#ffa726",
  "#ff7043",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDisplayName(name: string): { firstName: string; lastName: string } {
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

function getNationText(playerId: number, memberLevelById: Record<number, string>): string {
  const level = String(memberLevelById[playerId] || "").trim();
  if (!level) return "--";
  return level.toUpperCase();
}

export default function RankingPanel({
  rankings,
  matches,
  rankTrends,
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

  const recentMatchGroups = useMemo(() => {
    const grouped = new Map<
      string,
      { label: string; order: number; items: Match[] }
    >();

    matches.slice(0, 10).forEach((match, index) => {
      const parsedDate = parseMatchDate(match);
      if (!parsedDate) {
        const unknownKey = "unknown-date";
        const currentUnknown = grouped.get(unknownKey) ?? {
          label: t("rankingPanel.unknownDateGroup"),
          order: -1,
          items: [],
        };
        currentUnknown.items.push(match);
        grouped.set(unknownKey, currentUnknown);
        return;
      }

      const key = getDateGroupKey(parsedDate);
      const existing = grouped.get(key);

      if (existing) {
        existing.items.push(match);
      } else {
        grouped.set(key, {
          label: formatVietnameseDateGroup(parsedDate),
          order: parsedDate.getTime() - index,
          items: [match],
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.order - a.order);
  }, [matches, t]);

  const hasRankings = rankings.length > 0;
  const hasHistory = matches.length > 0;

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [categories],
  );

  const selectedCategory = useMemo(
    () => sortedCategories.find((category) => category.id === selectedCategoryId),
    [selectedCategoryId, sortedCategories],
  );

  const filteredRankings = useMemo(() => {
    if (!selectedCategory) return rankings;
    return rankings.filter(
      (player) => memberLevelById[player.id] === selectedCategory.name,
    );
  }, [memberLevelById, rankings, selectedCategory]);

  const rankingRows = filteredRankings.map((player) => ({
    key: player.name,
    rank: rankings.findIndex((entry) => entry.id === player.id) + 1,
    player,
    nation: getNationText(player.id, memberLevelById),
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
      width: 90,
      render: (rank: number, row) => {
        const trend = rankTrends[row.player.id];
        let trendText = "-";
        let trendClassName = "text-slate-400";

        if (trend === "NEW") {
          trendText = "NEW";
          trendClassName = "text-blue-600";
        } else if (typeof trend === "number" && trend > 0) {
          trendText = `▲${trend}`;
          trendClassName = "text-green-600";
        } else if (typeof trend === "number" && trend < 0) {
          trendText = `▼${Math.abs(trend)}`;
          trendClassName = "text-red-500";
        }

        return (
          <div className="leading-tight">
            <Typography.Text strong>#{rank}</Typography.Text>
            <div className={`text-[11px] font-semibold ${trendClassName}`}>
              {trendText}
            </div>
          </div>
        );
      },
    },
    {
      title: "",
      key: "avatar",
      width: 70,
      render: (_, row) => {
        const displayName = formatDisplayName(row.player.name);
        const avatarText = displayName.firstName.charAt(0).toUpperCase();
        const avatarColor = getAvatarColor(row.player.name);

        return (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarText || "?"}
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
      render: (name: string) => {
        const displayName = formatDisplayName(name);

        return (
          <Typography.Text>
            {displayName.firstName}{" "}
            {displayName.lastName ? <strong>{displayName.lastName}</strong> : null}
          </Typography.Text>
        );
      },
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.nation")}
        </span>
      ),
      key: "nation",
      width: 100,
      align: "center",
      render: (_, row) => (
        <div className="inline-flex items-center gap-2">
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ backgroundColor: getAvatarColor(row.nation) }}
          >
            {row.nation.slice(0, 2)}
          </span>
          <span className="text-[11px] text-slate-500">{row.nation}</span>
        </div>
      ),
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.points")}
        </span>
      ),
      key: "rankScore",
      width: 130,
      align: "right",
      render: (_, row) => (
        <Typography.Text strong className="text-slate-700">
          {Math.round(row.player.rating).toLocaleString()}
        </Typography.Text>
      ),
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.form")}
        </span>
      ),
      key: "form",
      width: 120,
      align: "right",
      render: (_, row) => {
        const winRate = getWinRate(row.player.totalMatches, row.player.wins);
        return (
          <div className="w-[90px]">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{Math.round(winRate)}%</span>
              <span>
                {row.player.wins}/{row.player.totalMatches}
              </span>
            </div>
            <Progress
              percent={Math.round(winRate)}
              showInfo={false}
              strokeColor={getWinRateTone(winRate)}
              size="small"
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`rounded-sm border px-5 py-2 text-xs font-semibold transition-colors ${
              selectedCategoryId === null
                ? "border-red-500 bg-red-500 text-white"
                : "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
            }`}
          >
            {t("rankingPanel.allCategories")}
          </button>
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
            pagination={{
              defaultPageSize: 10,
              pageSizeOptions: ["5", "10", "20", "50"],
              showSizeChanger: true,
              showQuickJumper: true,
              hideOnSinglePage: false,
              position: ["bottomCenter"],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            }}
            scroll={{ x: 720 }}
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
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
          {!hasHistory ? (
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 text-center">
              <p className="text-slate-500 text-sm">
                {t("rankingPanel.noHistory")}
              </p>
            </div>
          ) : null}

          {recentMatchGroups.map((group) => (
            <section key={group.label} className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </p>

              {group.items.map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {match.type === "singles" ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                      {match.type === "singles"
                        ? t("rankingPanel.singles")
                        : t("rankingPanel.doubles")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatMatchDateTime(match.date)}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[12px]">
                    <div className="font-medium text-slate-900 truncate">
                      {match.team1.join(" & ")}
                    </div>
                    <div className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      {match.sets.map(formatSet).join(", ")}
                    </div>
                    <div className="font-medium text-slate-900 truncate text-right">
                      {match.team2.join(" & ")}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 truncate">
                      {t("rankingPanel.createdBy")}:{" "}
                      {match.createdByUsername || match.createdBy || "-"}
                    </div>
                    {isAdmin || match.createdBy === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => onDeleteMatch(match.id)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-600 hover:bg-red-50"
                        aria-label={t("rankingPanel.deleteThisMatch")}
                        title={t("rankingPanel.deleteThisMatch")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
