import { useState, useCallback, useEffect } from "react";
import {
  getRankingMembers,
  saveRankingMembers,
  isSupabaseReady,
} from "../../../lib/api";
import type { Member } from "../../../components/ranking/types";
import type { RankingLevel } from "../../../types";

export interface UseRankingMembersReturn {
  members: Member[];
  addMember: (name: string, level: RankingLevel) => void;
  editMember: (id: number, name: string, level: RankingLevel) => void;
  deleteMember: (id: number) => void;
  selectMember: (id: number | null) => void;
  selectedMember: Member | null;
  isDuplicate: (name: string, excludeId?: number) => boolean;
}

function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase();
}

/**
 * Hook for managing ranking members (CRUD operations).
 * Persists member changes to both localStorage and Firestore.
 * Handles member creation, editing, deletion, and selection.
 *
 * @returns {UseRankingMembersReturn} Object containing:
 *   - members: Array of all members
 *   - addMember: Function to add a new member (name, level)
 *   - editMember: Function to edit an existing member (id, name, level)
 *   - deleteMember: Function to delete a member by id
 *   - selectMember: Function to select/deselect a member (pass null to deselect)
 *   - selectedMember: Currently selected member or null
 *   - isDuplicate: Function to check if a name is already used (optional excludeId)
 *
 * @example
 * const { members, addMember, editMember, deleteMember, isDuplicate } = useRankingMembers();
 * if (!isDuplicate('John')) {
 *   addMember('John', 'Yo');
 * }
 */
export function useRankingMembers(): UseRankingMembersReturn {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

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
    (name: string, level: RankingLevel) => {
      if (!name.trim() || !level.trim()) return;

      const newMember: Member = {
        id:
          members.reduce((maxId, member) => Math.max(maxId, member.id), 0) + 1,
        name: name.trim(),
        level,
      };

      setMembers((prev) => [...prev, newMember]);
      setSelectedMember(newMember);
    },
    [members],
  );

  const editMember = useCallback(
    (id: number, name: string, level: RankingLevel) => {
      if (!name.trim() || !level.trim()) return;

      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, name: name.trim(), level } : m)),
      );

      setSelectedMember((prev) =>
        prev && prev.id === id ? { ...prev, name: name.trim(), level } : prev,
      );
    },
    [],
  );

  const deleteMember = useCallback((id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setSelectedMember((prev) => (prev?.id === id ? null : prev));
  }, []);

  const selectMember = useCallback(
    (id: number | null) => {
      if (id === null) {
        setSelectedMember(null);
        return;
      }

      setSelectedMember((prev) => {
        if (prev?.id === id) return prev;
        return members.find((m) => m.id === id) ?? null;
      });
    },
    [members],
  );

  useEffect(() => {
    if (!isSupabaseReady()) return;

    let mounted = true;

    void getRankingMembers()
      .then((remoteMembers) => {
        if (!mounted) return;
        setMembers(remoteMembers);
        setIsHydrated(true);
      })
      .catch((error) => {
        console.error("Failed to load ranking members from Supabase", error);
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Persist to Supabase
  useEffect(() => {
    if (!isSupabaseReady() || !isHydrated) return;

    void saveRankingMembers(members).catch((error) => {
      console.error("Failed to save ranking members to Supabase", error);
    });
  }, [members, isHydrated]);

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
