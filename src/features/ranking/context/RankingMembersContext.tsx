import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useRankingMembers, useRankingCategories } from "../hooks";
import type { Member } from "../../../components/ranking/types";
import type { RankingLevel } from "../../../types";

type RankingMembersContextValue = {
  // From useRankingMembers
  members: Member[];
  isLoading: boolean;
  // From useRankingCategories
  categories: any[];
  sortedCategories: any[];
  defaultMemberLevel: string;
  // Member form local state
  isEditing: number | null;
  memberFormName: string;
  memberFormLevel: RankingLevel;
  // Handlers
  handleAddOrEditMember: () => void;
  handleDeleteMember: (id: number) => void;
  handleStartEditMember: (member: Member) => void;
  setMemberFormName: (name: string) => void;
  setMemberFormLevel: (level: RankingLevel) => void;
  setIsEditing: (id: number | null) => void;
};

const RankingMembersContext = createContext<
  RankingMembersContextValue | undefined
>(undefined);

interface RankingMembersProviderProps {
  isAdmin: boolean;
  children: ReactNode;
}

export function RankingMembersProvider({
  isAdmin,
  children,
}: RankingMembersProviderProps) {
  const { members, isLoading, addMember, editMember, deleteMember } =
    useRankingMembers();
  const { categories, sortedCategories, defaultMemberLevel } =
    useRankingCategories();

  // Local state for member form editing
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [memberFormName, setMemberFormName] = useState("");
  const [memberFormLevel, setMemberFormLevel] = useState<RankingLevel>("");

  const handleAddOrEditMember = useCallback(() => {
    if (!isAdmin) return;
    if (!sortedCategories.length) return;
    if (!memberFormName.trim()) return;
    if (!memberFormLevel.trim()) return;

    if (isEditing) {
      editMember(isEditing, memberFormName, memberFormLevel);
      setIsEditing(null);
    } else {
      addMember(memberFormName, memberFormLevel);
    }
    setMemberFormName("");
    setMemberFormLevel(defaultMemberLevel);
  }, [
    isAdmin,
    sortedCategories.length,
    isEditing,
    memberFormName,
    memberFormLevel,
    defaultMemberLevel,
    editMember,
    addMember,
  ]);

  const handleDeleteMember = useCallback(
    (id: number) => {
      if (!isAdmin) return;
      deleteMember(id);
    },
    [isAdmin, deleteMember],
  );

  const handleStartEditMember = useCallback(
    (member: Member) => {
      if (!isAdmin) return;
      setIsEditing(member.id);
      setMemberFormName(member.name);
      setMemberFormLevel(member.level);
    },
    [isAdmin],
  );

  const value = useMemo<RankingMembersContextValue>(
    () => ({
      members,
      isLoading,
      categories,
      sortedCategories,
      defaultMemberLevel,
      isEditing,
      memberFormName,
      memberFormLevel,
      handleAddOrEditMember,
      handleDeleteMember,
      handleStartEditMember,
      setMemberFormName,
      setMemberFormLevel,
      setIsEditing,
    }),
    [
      members,
      isLoading,
      categories,
      sortedCategories,
      defaultMemberLevel,
      isEditing,
      memberFormName,
      memberFormLevel,
      handleAddOrEditMember,
      handleDeleteMember,
      handleStartEditMember,
    ],
  );

  return (
    <RankingMembersContext.Provider value={value}>
      {children}
    </RankingMembersContext.Provider>
  );
}

export function useRankingMembersContext(): RankingMembersContextValue {
  const context = useContext(RankingMembersContext);
  if (context === undefined) {
    throw new Error(
      "useRankingMembersContext must be used within a RankingMembersProvider",
    );
  }
  return context;
}
