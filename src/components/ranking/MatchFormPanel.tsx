import { CheckCircle, Plus, User, Users } from "react-feather";
import { useTranslation } from "react-i18next";
import type { MatchSetInput, Member } from "./types";

interface MatchFormPanelProps {
  members: Member[];
  matchType: "singles" | "doubles";
  matchData: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
    playedAt: string;
  };
  onSetMatchType: (type: "singles" | "doubles") => void;
  onSetMatchData: (next: {
    team1: string[];
    team2: string[];
    sets: MatchSetInput[];
    playedAt: string;
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
  const { t } = useTranslation();
  const slotCount = matchType === "singles" ? 1 : 2;
  const selectedTeam1 = matchData.team1
    .slice(0, slotCount)
    .filter((name) => name?.trim());
  const selectedTeam2 = matchData.team2
    .slice(0, slotCount)
    .filter((name) => name?.trim());
  const hasValidTeams =
    selectedTeam1.length === slotCount && selectedTeam2.length === slotCount;
  const hasValidSet = matchData.sets.some((set) => {
    const scoreA = Number.parseInt(set.team1Score, 10);
    const scoreB = Number.parseInt(set.team2Score, 10);
    const minutes = Number.parseInt(String(set.minutes || ""), 10);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return false;
    if (scoreA < 0 || scoreB < 0) return false;
    if (!Number.isNaN(minutes) && minutes < 0) return false;
    return true;
  });
  const canSaveMatch = hasValidTeams && hasValidSet;

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
      sets: [
        ...matchData.sets,
        { team1Score: "", team2Score: "", minutes: "" },
      ],
    });
  };

  return (
    <div className="max-w-4xl bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSetMatchType("doubles")}
          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            matchType === "doubles"
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" /> {t("matchForm.doubles")}
          </span>
        </button>
        <button
          onClick={() => onSetMatchType("singles")}
          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            matchType === "singles"
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4" /> {t("matchForm.singles")}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 md:p-4">
          <h3 className="font-bold text-center text-slate-800">
            {t("matchForm.teamA")}
          </h3>
          <div className="space-y-2">
            {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
              <select
                key={i}
                className="mobile-focus-target dashboard-input w-full"
                onChange={(e) => {
                  const newTeam = [...matchData.team1];
                  newTeam[i] = e.target.value;
                  onSetMatchData({ ...matchData, team1: newTeam });
                }}
                value={matchData.team1[i] || ""}
              >
                <option value="">{t("matchForm.choosePlayer")}</option>
                {getSelectableMembers("team1", i).map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 md:p-4">
          <h3 className="font-bold text-center text-slate-800">
            {t("matchForm.teamB")}
          </h3>
          <div className="space-y-2">
            {[...Array(matchType === "singles" ? 1 : 2)].map((_, i) => (
              <select
                key={i}
                className="mobile-focus-target dashboard-input w-full"
                onChange={(e) => {
                  const newTeam = [...matchData.team2];
                  newTeam[i] = e.target.value;
                  onSetMatchData({ ...matchData, team2: newTeam });
                }}
                value={matchData.team2[i] || ""}
              >
                <option value="">{t("matchForm.choosePlayer")}</option>
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

      <div className="pt-5 border-t border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2.5 md:items-center">
          <h3 className="font-bold text-slate-900">
            {t("matchForm.setResults")}
          </h3>
          <input
            type="datetime-local"
            className="mobile-focus-target dashboard-input w-full md:w-auto"
            value={matchData.playedAt}
            onChange={(e) =>
              onSetMatchData({
                ...matchData,
                playedAt: e.target.value,
              })
            }
            aria-label={t("matchForm.playedAt")}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addSetInput}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" /> {t("matchForm.addSet")}
          </button>
        </div>
        {matchData.sets.map((set, i) => (
          <div key={i} className="grid grid-cols-3 gap-3">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={t("matchForm.setTeamA", { index: i + 1 })}
              className="mobile-focus-target dashboard-input w-full"
              value={set.team1Score}
              onChange={(e) => {
                if (e.target.value !== "" && Number(e.target.value) < 0) {
                  return;
                }
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
              placeholder={t("matchForm.setTeamB", { index: i + 1 })}
              className="mobile-focus-target dashboard-input w-full"
              value={set.team2Score}
              onChange={(e) => {
                if (e.target.value !== "" && Number(e.target.value) < 0) {
                  return;
                }
                const newSets = [...matchData.sets];
                newSets[i] = {
                  ...newSets[i],
                  team2Score: e.target.value,
                };
                onSetMatchData({ ...matchData, sets: newSets });
              }}
            />
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={t("matchForm.setMinutes", { index: i + 1 })}
              className="mobile-focus-target dashboard-input w-full"
              value={set.minutes || ""}
              onChange={(e) => {
                if (e.target.value !== "" && Number(e.target.value) < 0) {
                  return;
                }
                const newSets = [...matchData.sets];
                newSets[i] = {
                  ...newSets[i],
                  minutes: e.target.value,
                };
                onSetMatchData({ ...matchData, sets: newSets });
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onSaveMatch}
        disabled={!canSaveMatch}
        className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <CheckCircle className="h-4 w-4" /> {t("matchForm.saveResult")}
      </button>
    </div>
  );
}
