import { useState, useCallback, useEffect } from "react";
import {
  saveRankingMembers,
  isFirebaseReady,
} from "../../../lib/firebase";
import {
  loadMembersFromStorage,
  saveMembersToStorage,
} from "../../../lib/rankingStorage";
import type { Member } from "../../../components/ranking/types";

export interface UseRankingMembersReturn {
  members: Member[];
  addMember: (name: string, level: string) => void;
  editMember: (id: number, name: string, level: string) => void;
  deleteMember: (id: number) => void;
  selectMember: (id: number | null) => void;
  selectedMember: Member | null;
  isDuplicate: (name: string, excludeId?: number) => boolean;
}

function normalizeName(name: string): string {
  return String(name || "").trim().toLowerCase();
}

export function useRankingMembers(): UseRankingMembersReturn {
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage(),
  );
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isDuplicate = useCallback(
    (name: string, excludeId?: number): boolean => {
      const normalized = normalizeName(name);
      return members.some(
        (m) =>
          normalizeName(m.name) === normalized &&
          (excludeId === undefined || m.id !== excludeId),
      );
    },
    [members],
  );

  const addMember = useCallback(
    (name: string, level: string) => {
      if (!name.trim() || !level.trim()) return;

      const newMember: Member = {
        id: Date.now(),
        name: name.trim(),
        level: level as any,
      };

      setMembers((prev) => [...prev, newMember]);
      setSelectedMember(newMember);
    },
    [],
  );

  const editMember = useCallback((id: number, name: string, level: string) => {
    if (!name.trim() || !level.trim()) return;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, name: name.trim(), level: level as any }
          : m,
      ),
    );

    setSelectedMember((prev) =>
      prev && prev.id === id
        ? { ...prev, name: name.trim(), level: level as any }
        : prev,
    );
  }, []);

  const deleteMember = useCallback((id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setSelectedMember((prev) => (prev?.id === id ? null : prev));
  }, []);

  const selectMember = useCallback((id: number | null) => {
    if (id === null) {
      setSelectedMember(null);
      return;
    }

    setSelectedMember((prev) => {
      if (prev?.id === id) return prev;
      return (
        members.find((m) => m.id === id) ?? null
      );
    });
  }, [members]);

  // Persist to localStorage and Firestore
  useEffect(() => {
    saveMembersToStorage(members);

    if (!isFirebaseReady()) return;

    void saveRankingMembers(members).catch((error) => {
      console.error("Failed to save ranking members to Firestore", error);
    });
  }, [members]);

  return {
    members,
    addMember,
    editMember,
    deleteMember,
    selectMember,
    selectedMember,
    isDuplicate,
  };
}
