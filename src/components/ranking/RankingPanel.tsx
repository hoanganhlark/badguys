import { Award, Clock, Star, Trash2, User, Users } from "react-feather";
import { useMemo } from "react";
import { Progress, Table, Typography, type TableColumnsType } from "antd";
import { useTranslation } from "react-i18next";
import type { AdvancedStats, Match } from "./types";

interface RankingPanelProps {
  rankings: AdvancedStats[];
  matches: Match[];
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

export default function RankingPanel({
  rankings,
  matches,
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

  const rankingRows = rankings.map((player, index) => ({
    key: player.name,
    rank: index + 1,
    player,
    winRate: getWinRate(player.totalMatches, player.wins),
  }));

  const athleteFilters = useMemo(
    () =>
      rankings
        .map((player) => player.name)
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((name) => ({ text: name, value: name })),
    [rankings],
  );

  const rankingColumns: TableColumnsType<(typeof rankingRows)[number]> = [
    {
      title: t("rankingPanel.rank"),
      dataIndex: "rank",
      key: "rank",
      width: 90,
      sorter: (a, b) => a.rank - b.rank,
      render: (rank: number) => {
        if (rank === 1) {
          return <Award className="h-5 w-5 text-amber-500" />;
        }
        if (rank === 2) {
          return <Award className="h-5 w-5 text-slate-400" />;
        }
        if (rank === 3) {
          return <Star className="h-5 w-5 text-orange-400" />;
        }

        return <Typography.Text type="secondary">#{rank}</Typography.Text>;
      },
    },
    {
      title: t("rankingPanel.athlete"),
      dataIndex: ["player", "name"],
      key: "name",
      filters: athleteFilters,
      filterSearch: true,
      onFilter: (value, record) => record.player.name === value,
      sorter: (a, b) => a.player.name.localeCompare(b.player.name, "vi"),
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
    },
    {
      title: t("rankingPanel.winRate"),
      key: "winRate",
      width: 240,
      filters: [
        { text: ">= 70%", value: "high" },
        { text: "50% - 69%", value: "mid" },
        { text: "< 50%", value: "low" },
      ],
      onFilter: (value, record) => {
        if (value === "high") return record.winRate >= 70;
        if (value === "mid") return record.winRate >= 50 && record.winRate < 70;
        return record.winRate < 50;
      },
      sorter: (a, b) => a.winRate - b.winRate,
      render: (_, row) => (
        <div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
            <span>{Math.round(row.winRate)}%</span>
            <span>
              {row.player.wins}/{row.player.totalMatches}
            </span>
          </div>
          <Progress
            percent={Math.round(row.winRate)}
            showInfo={false}
            strokeColor={getWinRateTone(row.winRate)}
            size="small"
          />
        </div>
      ),
    },
    {
      title: t("rankingPanel.rankScore"),
      key: "rankScore",
      width: 130,
      align: "right",
      sorter: (a, b) => a.player.rankScore - b.player.rankScore,
      render: (_, row) => (
        <Typography.Text strong style={{ color: "#0369a1" }}>
          {row.player.rankScore.toFixed(3)}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div>
        {!hasRankings ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {t("rankingPanel.noRanking")}
          </div>
        ) : null}

        {hasRankings ? (
          <Table
            columns={rankingColumns}
            dataSource={rankingRows}
            pagination={{
              defaultPageSize: 5,
              pageSizeOptions: ["5", "10", "20", "50"],
              showSizeChanger: true,
              showQuickJumper: true,
              hideOnSinglePage: false,
              position: ["bottomCenter"],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            }}
            scroll={{ x: 600 }}
            onRow={(row) => ({
              onClick: () => onSelectPlayer(row.player),
              style: { cursor: "pointer" },
            })}
          />
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
