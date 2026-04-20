import { useState, useEffect, useCallback } from "react";

/**
 * A hook for managing async operations with loading, error, and data states.
 *
 * @param fn - The async function to execute
 * @param dependencies - Optional dependency array (like useEffect)
 * @param initialData - Optional initial data value
 * @returns Object with data, isLoading, error states and a retry function
 *
 * @example
 * const { data, isLoading, error, retry } = useAsync(
 *   async () => {
 *     const response = await fetch('/api/users');
 *     return response.json();
 *   },
 *   []
 * );
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  dependencies?: React.DependencyList,
  initialData?: T,
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    execute();
  }, dependencies ? dependencies : [execute]);

  return { data, isLoading, error, retry };
}
