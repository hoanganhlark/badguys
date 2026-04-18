import { CheckCircle, Plus, User, Users } from "react-feather";
import type { MatchSetInput, Member } from "./types";

interface MatchFormPanelProps {
  members: Member[];
  matchType: "singles" | "doubles";
  matchData: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
  };
  onSetMatchType: (type: "singles" | "doubles") => void;
  onSetMatchData: (next: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
  }) => void;
  onSaveMatch: () => void;
}

export default function MatchFormPanel({
  members,
  matchType,
  matchData,
  onSetMatchType,
  onSetMatchData,
  onSaveMatch,
}: MatchFormPanelProps) {
  const getSelectableMembers = (team: "team1" | "team2", index: number) => {
    const currentSelection = matchData[team][index];
    const selectedInOtherSlots = new Set(
      [...matchData.team1, ...matchData.team2].filter(
        (name) => name && name !== currentSelection,
      ),
    );

    return members.filter((member) => !selectedInOtherSlots.has(member.name));
  };

  const addSetInput = () => {
    onSetMatchData({
      ...matchData,
      sets: [...matchData.sets, { team1Score: "", team2Score: "" }],
    });
  };

  return (
    <div className="max-w-3xl bg-white p-6 rounded-lg border border-gray-200 shadow">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => onSetMatchType("doubles")}
          className={`flex-1 py-2 rounded border font-semibold transition-all ${
            matchType === "doubles"
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" /> Đánh Đôi
          </span>
        </button>
        <button
          onClick={() => onSetMatchType("singles")}
          className={`flex-1 py-2 rounded border font-semibold transition-all ${
            matchType === "singles"
              ? "bg-blue-600 text-white border-blue-600"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4" /> Đánh Đơn
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="font-bold text-center">Đội A</h3>
          <div className="space-y-2">
            {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
              <select
                key={i}
                className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const newTeam = [...matchData.team1];
                  newTeam[i] = e.target.value;
                  onSetMatchData({ ...matchData, team1: newTeam });
                }}
                value={matchData.team1[i] || ""}
              >
                <option value="">Chọn VĐV...</option>
                {getSelectableMembers("team1", i).map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-center">Đội B</h3>
          <div className="space-y-2">
            {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
              <select
                key={i}
                className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const newTeam = [...matchData.team2];
                  newTeam[i] = e.target.value;
                  onSetMatchData({ ...matchData, team2: newTeam });
                }}
                value={matchData.team2[i] || ""}
              >
                <option value="">Chọn VĐV...</option>
                {getSelectableMembers("team2", i).map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Kết quả theo set</h3>
          <button
            type="button"
            onClick={addSetInput}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" /> Thêm set
          </button>
        </div>
        {matchData.sets.map((set, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={`Set ${i + 1} - Đội A`}
              className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={set.team1Score}
              onChange={(e) => {
                const newSets = [...matchData.sets];
                newSets[i] = {
                  ...newSets[i],
                  team1Score: e.target.value,
                };
                onSetMatchData({ ...matchData, sets: newSets });
              }}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={`Set ${i + 1} - Đội B`}
              className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={set.team2Score}
              onChange={(e) => {
                const newSets = [...matchData.sets];
                newSets[i] = {
                  ...newSets[i],
                  team2Score: e.target.value,
                };
                onSetMatchData({ ...matchData, sets: newSets });
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onSaveMatch}
        className="w-full mt-6 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-all inline-flex items-center justify-center gap-2"
      >
        <CheckCircle className="h-4 w-4" /> Lưu kết quả
      </button>
    </div>
  );
}
