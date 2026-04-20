import { useState, useEffect, useMemo } from "react";
import {
  subscribeRankingCategories,
} from "../../../lib/firebase";
import type { RankingCategory } from "../../../types";

export interface UseRankingCategoriesReturn {
  categories: RankingCategory[];
  sortedCategories: RankingCategory[];
  defaultMemberLevel: string;
  isLoading: boolean;
  error: string | null;
}

export function useRankingCategories(): UseRankingCategoriesReturn {
  const [categories, setCategories] = useState<RankingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeRankingCategories(
      (nextCategories) => {
        setCategories(nextCategories);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to subscribe ranking categories", err);
        setError("Failed to load categories");
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
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
