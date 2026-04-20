import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRankingCategories,
  createRankingCategory,
  updateRankingCategory,
  deleteRankingCategory,
} from "../../lib/api";
import { queryDefaults } from "./config";

/**
 * Query key factory for ranking categories
 */
export const rankingCategoriesKeys = {
  all: ["ranking-categories"] as const,
  list: () => [...rankingCategoriesKeys.all, "list"] as const,
};

/**
 * Fetch ranking categories
 * Uses reference defaults (infrequent changes, moderate refetch)
 */
export function useRankingCategoriesQuery() {
  return useQuery({
    queryKey: rankingCategoriesKeys.list(),
    queryFn: getRankingCategories,
    ...queryDefaults.reference,
  });
}

/**
 * Create ranking category
 */
export function useCreateRankingCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; displayName: string; order: number }) =>
      createRankingCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rankingCategoriesKeys.all,
      });
    },
  });
}

/**
 * Update ranking category
 */
export function useUpdateRankingCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ displayName: string; order: number }> }) =>
      updateRankingCategory(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rankingCategoriesKeys.all,
      });
    },
  });
}

/**
 * Delete ranking category
 */
export function useDeleteRankingCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRankingCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rankingCategoriesKeys.all,
      });
    },
  });
}

/**
 * Combined hook for ranking categories
 */
export function useRankingCategories() {
  const query = useRankingCategoriesQuery();
  const createMutation = useCreateRankingCategoryMutation();
  const updateMutation = useUpdateRankingCategoryMutation();
  const deleteMutation = useDeleteRankingCategoryMutation();

  return {
    // Query state
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,

    // Mutations
    createCategory: createMutation.mutate,
    createCategoryAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateCategory: updateMutation.mutate,
    updateCategoryAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteCategory: deleteMutation.mutate,
    deleteCategoryAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Cache control
    refetch: query.refetch,
  };
}
