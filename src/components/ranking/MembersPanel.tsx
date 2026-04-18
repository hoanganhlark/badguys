import { Check, Edit2, Plus, Trash2, UserPlus } from "react-feather";
import type { Member } from "./types";

interface MembersPanelProps {
  isEditing: number | null;
  newMember: { name: string; level: string };
  members: Member[];
  onSetNewMember: (next: { name: string; level: string }) => void;
  onAddOrUpdateMember: () => void;
  onStartEdit: (member: Member) => void;
  onDeleteMember: (id: number) => void;
}

export default function MembersPanel({
  isEditing,
  newMember,
  members,
  onSetNewMember,
  onAddOrUpdateMember,
  onStartEdit,
  onDeleteMember,
}: MembersPanelProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white p-4 rounded border border-gray-200 shadow">
        <h2 className="text-sm font-semibold uppercase text-gray-700 mb-3 flex items-center gap-2">
          {isEditing ? (
            <Edit2 className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isEditing ? "Cập nhật thành viên" : "Thêm thành viên mới"}
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Họ và tên..."
            className="flex-1 px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newMember.name}
            onChange={(e) =>
              onSetNewMember({ ...newMember, name: e.target.value })
            }
          />
          <select
            className="px-3 py-2 rounded border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
            value={newMember.level}
            onChange={(e) =>
              onSetNewMember({ ...newMember, level: e.target.value })
            }
          >
            <option>Yếu</option>
            <option>Trung bình</option>
            <option>Khá</option>
            <option>Giỏi</option>
          </select>
          <button
            onClick={onAddOrUpdateMember}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
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

      <div className="bg-white rounded border border-gray-200 shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">
                Thành viên
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase">
                Trình độ
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                    {member.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onStartEdit(member)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMember(member.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
