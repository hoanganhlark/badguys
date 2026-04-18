import {
  Award,
  Clock,
  FileText,
  Star,
  Trash2,
  User,
  Users,
} from "react-feather";
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

export default function RankingPanel({
  rankings,
  matches,
  onSelectPlayer,
  onClearHistory,
  onDeleteMatch,
  isAdmin,
  currentUserId,
}: RankingPanelProps) {
  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div>
        <div className="md:hidden space-y-2.5">
          {rankings.map((player, index) => (
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
                  <p className="font-semibold text-slate-900">{player.name}</p>
                </div>
                <p className="text-sm font-bold text-sky-700">
                  {player.rankScore.toFixed(3)}
                </p>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-slate-500">Số trận</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {player.matches}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-slate-500">Trận thắng</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {player.wins}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Hạng
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                  Vận động viên
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-center">
                  Trận
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-center">
                  Thắng
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-right">
                  RankScore
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rankings.map((player, index) => (
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
                  <td className="px-4 py-3 text-center text-slate-600">
                    {player.matches}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {player.wins}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-sky-700">
                    {player.rankScore.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-700" /> Lịch sử gần đây
          </h3>
          {isAdmin ? (
            <button
              type="button"
              onClick={onClearHistory}
              disabled={matches.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xóa lịch sử
            </button>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
          {matches.length === 0 && (
            <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 text-center">
              <p className="text-slate-400 text-sm inline-flex items-center gap-2">
                <FileText className="h-4 w-4" /> Chưa có trận đấu
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
                  {match.type === "singles" ? "Đơn" : "Đôi"}
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
                  {match.sets.join(", ")}
                </div>
                <div className="font-medium text-slate-900 truncate text-right">
                  {match.team2.join(" & ")}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 truncate">
                  Tạo bởi: {match.createdByUsername || match.createdBy || "-"}
                </div>
                {isAdmin || match.createdBy === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => onDeleteMatch(match.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-600 hover:bg-red-50"
                    aria-label="Xóa trận này"
                    title="Xóa trận này"
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
