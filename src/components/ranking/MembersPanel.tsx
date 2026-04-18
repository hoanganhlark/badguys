import { Check, Edit2, Plus, Trash2, UserPlus } from "react-feather";
import type { Member } from "./types";
import type { RankingLevel } from "../../types";
import {
  getRankingLevelBadgeClassName,
  getRankingLevelDisplay,
  normalizeRankingLevel,
  sortMembersByLevelAndName,
} from "../../lib/rankingLevel";

interface MembersPanelProps {
  isEditing: number | null;
  newMember: { name: string; level: RankingLevel };
  members: Member[];
  canManage: boolean;
  onSetNewMember: (next: { name: string; level: RankingLevel }) => void;
  onAddOrUpdateMember: () => void;
  onStartEdit: (member: Member) => void;
  onDeleteMember: (id: number) => void;
}

export default function MembersPanel({
  isEditing,
  newMember,
  members,
  canManage,
  onSetNewMember,
  onAddOrUpdateMember,
  onStartEdit,
  onDeleteMember,
}: MembersPanelProps) {
  const sortedMembers = sortMembersByLevelAndName(members);

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      {canManage ? (
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-700 mb-3 flex items-center gap-2">
            {isEditing ? (
              <Edit2 className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEditing ? "Cập nhật thành viên" : "Thêm thành viên mới"}
          </h2>
          <div className="flex flex-col md:flex-row gap-2.5 md:gap-3">
            <input
              type="text"
              placeholder="Họ và tên..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={newMember.name}
              onChange={(e) =>
                onSetNewMember({ ...newMember, name: e.target.value })
              }
            />
            <select
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500"
              value={newMember.level}
              onChange={(e) =>
                onSetNewMember({
                  ...newMember,
                  level: normalizeRankingLevel(e.target.value),
                })
              }
            >
              <option value="Yo">Yo</option>
              <option value="Lo">Lo</option>
              <option value="Nè">Nè</option>
            </select>
            <button
              onClick={onAddOrUpdateMember}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {isEditing ? (
                <Check className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isEditing ? "Lưu" : "Thêm"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="md:hidden space-y-2.5">
        {sortedMembers.map((member) => (
          <div
            key={member.id}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{member.name}</p>
                <span
                  className={`mt-1 inline-flex px-2 py-1 text-xs rounded-lg font-semibold ${getRankingLevelBadgeClassName(member.level)}`}
                >
                  {getRankingLevelDisplay(member.level)}
                </span>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onStartEdit(member)}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-700 hover:border-sky-200 transition-colors inline-flex items-center justify-center"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteMember(member.id)}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors inline-flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                Thành viên
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase">
                Trình độ
              </th>
              {canManage ? (
                <th className="px-4 py-3 text-xs font-semibold text-slate-700 uppercase text-right">
                  Thao tác
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedMembers.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-lg font-semibold ${getRankingLevelBadgeClassName(member.level)}`}
                  >
                    {getRankingLevelDisplay(member.level)}
                  </span>
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onStartEdit(member)}
                        className="p-1 text-slate-400 hover:text-sky-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteMember(member.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
