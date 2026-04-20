/**
 * Central export for all React Query hooks
 * Organized by domain for easy discovery and extension
 */

// Configuration
export { queryClient, queryDefaults } from "./config";

// Ranking Members
export {
  useRankingMembers,
  useRankingMembersQuery,
  useRankingMembersMutation,
  rankingMembersKeys,
} from "./useRankingMembers";

// Ranking Matches
export {
  useRankingMatches,
  useRankingMatchesQuery,
  useRankingMatchesMutation,
  rankingMatchesKeys,
} from "./useRankingMatches";

// Ranking Categories
export {
  useRankingCategories,
  useRankingCategoriesQuery,
  useCreateRankingCategoryMutation,
  useUpdateRankingCategoryMutation,
  useDeleteRankingCategoryMutation,
  rankingCategoriesKeys,
} from "./useRankingCategories";

// Users
export {
  useUsers,
  useUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
  useToggleUserDisabledMutation,
  usersKeys,
} from "./useUsers";

// Audit Events
export {
  useAuditEvents,
  useAuditEventsQuery,
} from "./useAuditEvents";

// Sessions
export {
  useSessions,
  useSessionsQuery,
  useSaveSessionMutation,
  useRemoveSessionMutation,
} from "./useSessions";
