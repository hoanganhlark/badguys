import { useMemo, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRankingMembers,
  useRankingCategories,
  rankingMembersKeys,
} from "../../../hooks/queries";
import { useAuth } from "../../../context/AuthContext";
import MembersPanel from "../../../components/ranking/MembersPanel";
import type { Member } from "../../../components/ranking/types";
import type { RankingLevel } from "../../../types";

/**
 * RankingMembersContainer
 *
 * Owns all member-related data fetching and form state management.
 * Replaces RankingMembersProvider + RankingMembersContext.
 *
 * Responsibilities:
 * - Fetch members via useRankingMembers (React Query)
 * - Fetch categories via useRankingCategories (React Query)
 * - Manage member form state (isEditing, formName, formLevel)
 * - Handle add/edit/delete mutations with proper cache invalidation
 * - Render MembersPanel with props (no context injection)
 */
export function RankingMembersContainer() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Data fetching via React Query
  const { members, isLoading, saveMembersAsync } = useRankingMembers();
  const { categories, isLoading: isCategoriesLoading } = useRankingCategories();

  // Local form state
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<RankingLevel>("");

  // Compute sorted categories and defaults
  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          a.order - b.order ||
          a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [categories],
  );

  const defaultMemberLevel = sortedCategories[0]?.name || "";

  // Check for duplicate names (excluding current edit target)
  const isDuplicate = useCallback(
    (name: string, excludeId?: number): boolean => {
      const normalized = String(name || "")
        .trim()
        .toLowerCase();
      return members.some(
        (m) =>
          String(m.name || "")
            .trim()
            .toLowerCase() === normalized &&
          (excludeId === undefined || m.id !== excludeId),
      );
    },
    [members],
  );

  // Add new member
  const handleAddMember = useCallback(
    async (name: string, level: RankingLevel) => {
      if (!isAdmin) return;
      if (!name.trim() || !level.trim()) return;
      if (isDuplicate(name)) return;

      try {
        const newMember: Member = {
          id: members.reduce((maxId, m) => Math.max(maxId, m.id), 0) + 1,
          name: name.trim(),
          level,
        };

        const nextMembers = [...members, newMember];
        await saveMembersAsync(nextMembers);

        // Invalidate cache to trigger refetch
        queryClient.invalidateQueries({
          queryKey: rankingMembersKeys.all,
        });

        setFormName("");
        setFormLevel(defaultMemberLevel);
      } catch (error) {
        console.error("Failed to add member", error);
        throw error;
      }
    },
    [isAdmin, members, isDuplicate, saveMembersAsync, queryClient, defaultMemberLevel],
  );

  // Edit existing member
  const handleEditMember = useCallback(
    async (id: number, name: string, level: RankingLevel) => {
      if (!isAdmin) return;
      if (!name.trim() || !level.trim()) return;
      if (isDuplicate(name, id)) return;

      try {
        const nextMembers = members.map((m) =>
          m.id === id
            ? { ...m, name: name.trim(), level }
            : m,
        );

        await saveMembersAsync(nextMembers);

        queryClient.invalidateQueries({
          queryKey: rankingMembersKeys.all,
        });

        setIsEditing(null);
        setFormName("");
        setFormLevel(defaultMemberLevel);
      } catch (error) {
        console.error("Failed to edit member", error);
        throw error;
      }
    },
    [isAdmin, members, isDuplicate, saveMembersAsync, queryClient, defaultMemberLevel],
  );

  // Delete member
  const handleDeleteMember = useCallback(
    async (id: number) => {
      if (!isAdmin) return;

      try {
        const nextMembers = members.filter((m) => m.id !== id);
        await saveMembersAsync(nextMembers);

        queryClient.invalidateQueries({
          queryKey: rankingMembersKeys.all,
        });

        // Clear form if we were editing this member
        if (isEditing === id) {
          setIsEditing(null);
          setFormName("");
          setFormLevel(defaultMemberLevel);
        }
      } catch (error) {
        console.error("Failed to delete member", error);
        throw error;
      }
    },
    [isAdmin, members, saveMembersAsync, queryClient, isEditing, defaultMemberLevel],
  );

  // Start editing a member
  const handleStartEditMember = useCallback((member: Member) => {
    setIsEditing(member.id);
    setFormName(member.name);
    setFormLevel(member.level);
  }, []);


  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!isAdmin || !sortedCategories.length) return;
    if (!formName.trim() || !formLevel.trim()) return;

    if (isEditing !== null) {
      await handleEditMember(isEditing, formName, formLevel);
    } else {
      await handleAddMember(formName, formLevel);
    }
  }, [isAdmin, sortedCategories.length, isEditing, formName, formLevel, handleAddMember, handleEditMember]);

  return (
    <MembersPanel
      members={members}
      isLoading={isLoading || isCategoriesLoading}
      isEditing={isEditing !== null}
      formName={formName}
      formLevel={formLevel}
      canManage={isAdmin}
      sortedCategories={sortedCategories}
      onDeleteMember={handleDeleteMember}
      onStartEditMember={handleStartEditMember}
      onSetFormName={setFormName}
      onSetFormLevel={setFormLevel}
      onSubmit={handleSubmit}
    />
  );
}

export default RankingMembersContainer;
