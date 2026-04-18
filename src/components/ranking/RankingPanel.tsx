import { Award, Clock, FileText, Star, User, Users } from "react-feather";
import type { AdvancedStats, Match } from "./types";

interface RankingPanelProps {
  rankings: AdvancedStats[];
  matches: Match[];
  onSelectPlayer: (player: AdvancedStats) => void;
}

export default function RankingPanel({
  rankings,
  matches,
  onSelectPlayer,
}: RankingPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2">
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
                  <p className="text-sm font-semibold text-slate-900">{player.matches}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-slate-500">Trận thắng</p>
                  <p className="text-sm font-semibold text-slate-900">{player.wins}</p>
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
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-700" /> Lịch sử gần đây
        </h3>
        <div className="space-y-2">
          {matches.length === 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
              <p className="text-slate-400 text-sm inline-flex items-center gap-2">
                <FileText className="h-4 w-4" /> Chưa có trận đấu
              </p>
            </div>
          )}
          {matches.slice(0, 10).map((match) => (
            <div
              key={match.id}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs"
            >
              <div className="text-slate-500 mb-1 inline-flex items-center gap-1.5">
                {match.type === "singles" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
                {match.type === "singles" ? "Đơn" : "Đôi"} • {match.date}
              </div>
              <div className="space-y-1">
                <div className="font-medium text-slate-900">
                  {match.team1.join(" & ")}
                </div>
                <div className="text-slate-500">{match.sets.join(", ")}</div>
                <div className="font-medium text-slate-900">
                  {match.team2.join(" & ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
