import { useState, useCallback } from "react";
import type { MatchSetInput } from "../../../components/ranking/types";

export interface UseMatchFormReturn {
  matchType: "singles" | "doubles";
  team1: string[];
  team2: string[];
  sets: MatchSetInput[];
  playedAt: string;
  setMatchType: (type: "singles" | "doubles") => void;
  setTeam1: (team: string[]) => void;
  setTeam2: (team: string[]) => void;
  setSets: (sets: MatchSetInput[]) => void;
  setPlayedAt: (date: string) => void;
  updateTeam1: (index: number, value: string) => void;
  updateTeam2: (index: number, value: string) => void;
  updateSet: (index: number, field: keyof MatchSetInput, value: string) => void;
  addSet: () => void;
  removeSet: (index: number) => void;
  resetForm: () => void;
  getValidationError: () => string | null;
}

function toDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const INITIAL_SETS: MatchSetInput[] = [
  { team1Score: "", team2Score: "", minutes: "" },
];

export function useMatchForm(): UseMatchFormReturn {
  const [matchType, setMatchType] = useState<"singles" | "doubles">("doubles");
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [sets, setSets] = useState<MatchSetInput[]>(INITIAL_SETS);
  const [playedAt, setPlayedAt] = useState(toDateTimeLocal(new Date()));

  const updateTeam1 = useCallback((index: number, value: string) => {
    setTeam1((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const updateTeam2 = useCallback((index: number, value: string) => {
    setTeam2((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const updateSet = useCallback(
    (index: number, field: keyof MatchSetInput, value: string) => {
      setSets((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const addSet = useCallback(() => {
    setSets((prev) => [
      ...prev,
      { team1Score: "", team2Score: "", minutes: "" },
    ]);
  }, []);

  const removeSet = useCallback((index: number) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetForm = useCallback(() => {
    setMatchType("doubles");
    setTeam1([]);
    setTeam2([]);
    setSets(INITIAL_SETS);
    setPlayedAt(toDateTimeLocal(new Date()));
  }, []);

  const getValidationError = useCallback((): string | null => {
    const slotCount = matchType === "singles" ? 1 : 2;
    const selectedTeam1 = team1.slice(0, slotCount).filter((n) => n?.trim());
    const selectedTeam2 = team2.slice(0, slotCount).filter((n) => n?.trim());

    if (
      selectedTeam1.length !== slotCount ||
      selectedTeam2.length !== slotCount
    ) {
      return `Please select ${slotCount} player(s) for each team`;
    }

    const hasValidSet = sets.some((set) => {
      const scoreA = Number.parseInt(set.team1Score, 10);
      const scoreB = Number.parseInt(set.team2Score, 10);
      return !Number.isNaN(scoreA) && !Number.isNaN(scoreB);
    });

    if (!hasValidSet) {
      return "Please enter at least one valid set score";
    }

    const hasInvalidSet = sets.some((set) => {
      const scoreA = Number.parseInt(set.team1Score, 10);
      const scoreB = Number.parseInt(set.team2Score, 10);
      const minutes = Number.parseInt(String(set.minutes || ""), 10);

      if (set.team1Score && set.team2Score) {
        if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return true;
        if (scoreA < 0 || scoreB < 0) return true;
      }

      if (set.minutes && (!Number.isFinite(minutes) || minutes < 0)) {
        return true;
      }

      return false;
    });

    if (hasInvalidSet) {
      return "Please enter valid scores and duration";
    }

    return null;
  }, [matchType, team1, team2, sets]);

  return {
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    setMatchType,
    setTeam1,
    setTeam2,
    setSets,
    setPlayedAt,
    updateTeam1,
    updateTeam2,
    updateSet,
    addSet,
    removeSet,
    resetForm,
    getValidationError,
  };
}
