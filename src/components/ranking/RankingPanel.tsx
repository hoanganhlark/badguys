import {
  Award,
  Clock,
  FileText,
  Star,
  Trash2,
  User,
  Users,
} from "react-feather";
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

function getWinRate(matches: number, wins: number): number {
  if (matches <= 0) return 0;
  return Math.max(0, Math.min(100, (wins / matches) * 100));
}

function getWinRateTone(winRate: number): string {
  if (winRate >= 70) return "bg-emerald-500";
  if (winRate >= 50) return "bg-sky-500";
  if (winRate >= 35) return "bg-amber-500";
  return "bg-rose-500";
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

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div>
        <div className="md:hidden space-y-2.5">
          {rankings.map((player, index) => {
            const winRate = getWinRate(player.totalMatches, player.wins);
            const progressTone = getWinRateTone(winRate);

            return (
              <button
                key={player.name}
                type="button"
                onClick={() => onSelectPlayer(player)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex items-center gap-2">
                    {index < 3 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                        {index === 0 ? (
                          <Award className="h-4 w-4 text-amber-500" />
                        ) : index === 1 ? (
                          <Award className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Star className="h-4 w-4 text-orange-400" />
                        )}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">
                        #{index + 1}
                      </span>
                    )}
                    <p className="font-semibold text-slate-900">
                      {player.name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-sky-700">
                    {player.rankScore.toFixed(3)}
                  </p>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <p className="font-semibold uppercase tracking-wide text-slate-500">
                      {t("rankingPanel.winRate")}
                    </p>
                    <p className="font-bold text-slate-700">
                      {Math.round(winRate)}%
                    </p>
                  </div>
                  <div
                    className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label={`${t("rankingPanel.winRate")} ${player.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(winRate)}
                  >
                    <div
                      className={`h-full rounded-full ${progressTone}`}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {t("rankingPanel.winsOutOfMatches", {
                      wins: player.wins,
                      matches: player.totalMatches,
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                  {t("rankingPanel.rank")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                  {t("rankingPanel.athlete")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-center">
                  {t("rankingPanel.winRate")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-right">
                  RankScore
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rankings.map((player, index) => {
                const winRate = getWinRate(player.totalMatches, player.wins);
                const progressTone = getWinRateTone(winRate);

                return (
                  <tr
                    key={player.name}
                    onClick={() => onSelectPlayer(player)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {index < 3 ? (
                        <span className="inline-flex">
                          {index === 0 ? (
                            <Award className="h-5 w-5 text-amber-500" />
                          ) : index === 1 ? (
                            <Award className="h-5 w-5 text-slate-400" />
                          ) : (
                            <Star className="h-5 w-5 text-orange-400" />
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500">#{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {player.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="mx-auto w-44">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                          <span>{Math.round(winRate)}%</span>
                          <span>
                            {player.wins}/{player.totalMatches}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"
                          role="progressbar"
                          aria-label={`${t("rankingPanel.winRate")} ${player.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(winRate)}
                        >
                          <div
                            className={`h-full rounded-full ${progressTone}`}
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sky-700">
                      {player.rankScore.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              disabled={matches.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />{" "}
              {t("rankingPanel.clearHistory")}
            </button>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
          {matches.length === 0 && (
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 text-center">
              <p className="text-slate-400 text-sm inline-flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t("rankingPanel.noMatches")}
              </p>
            </div>
          )}
          {matches.slice(0, 10).map((match) => (
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
        </div>
      </div>
    </div>
  );
}
