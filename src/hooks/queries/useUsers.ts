import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deleteUser,
  updateUserRole,
  setUserDisabled,
} from "../../lib/api";
import { getUsers } from "../../lib/supabase";
import type { UserRole } from "../../types";
import { queryDefaults } from "./config";

/**
 * Query key factory for users
 */
export const usersKeys = {
  all: ["users"] as const,
  list: () => [...usersKeys.all, "list"] as const,
};

/**
 * Fetch users
 * Uses reference defaults (infrequent changes)
 */
export function useUsersQuery() {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: getUsers,
    ...queryDefaults.reference,
  });
}

/**
 * Create user
 */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { username: string; passwordHash: string; role: UserRole }) =>
      createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

/**
 * Delete user
 */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

/**
 * Update user role
 */
export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

/**
 * Toggle user disabled status
 */
export function useToggleUserDisabledMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) =>
      setUserDisabled(userId, disabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

/**
 * Combined hook for users management
 */
export function useUsers() {
  const query = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const updateRoleMutation = useUpdateUserRoleMutation();
  const toggleDisabledMutation = useToggleUserDisabledMutation();

  return {
    // Query state
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Create
    createUser: createMutation.mutate,
    createUserAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    // Delete
    deleteUser: deleteMutation.mutate,
    deleteUserAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Update role
    updateRole: updateRoleMutation.mutate,
    updateRoleAsync: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,

    // Toggle disabled
    toggleDisabled: toggleDisabledMutation.mutate,
    toggleDisabledAsync: toggleDisabledMutation.mutateAsync,
    isTogglingDisabled: toggleDisabledMutation.isPending,

    // Cache control
    refetch: query.refetch,
  };
}
