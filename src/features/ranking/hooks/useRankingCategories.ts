import { useState, useEffect, useMemo } from "react";
import { getRankingCategories } from "../../../lib/api";
import type { RankingCategory } from "../../../types";

export interface UseRankingCategoriesReturn {
  categories: RankingCategory[];
  sortedCategories: RankingCategory[];
  defaultMemberLevel: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for loading ranking categories.
 * Loads and sorts player level categories (e.g., 'Yo', 'Lo', 'Nè').
 * Provides default member level based on first category in order.
 *
 * @returns {UseRankingCategoriesReturn} Object containing:
 *   - categories: Unsorted list of ranking categories
 *   - sortedCategories: Categories sorted by order and display name
 *   - defaultMemberLevel: First category name (default for new members)
 *   - isLoading: Loading flag for data loading
 *   - error: Error message if loading failed, null if successful
 *
 * @example
 * const { sortedCategories, defaultMemberLevel, isLoading } = useRankingCategories();
 * if (!isLoading) {
 *   console.log('Available levels:', sortedCategories.map(c => c.displayName));
 * }
 */
export function useRankingCategories(): UseRankingCategoriesReturn {
  const [categories, setCategories] = useState<RankingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const loadedCategories = await getRankingCategories();
        setCategories(loadedCategories);
        setError(null);
      } catch (err) {
        console.error("Failed to load ranking categories", err);
        setError("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCategories();
  }, []);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"),
      ),
    [categories],
  );

  const defaultMemberLevel = sortedCategories[0]?.name || "";

  return {
    categories,
    sortedCategories,
    defaultMemberLevel,
    isLoading,
    error,
  };
}
