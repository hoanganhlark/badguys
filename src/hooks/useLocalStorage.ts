import { useState, useCallback } from "react";

/**
 * A generic hook for managing state that persists to localStorage.
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if nothing is stored
 * @param scope - Optional scope prefix (e.g., userId) for scoped storage as "scope:key"
 * @returns A tuple of [value, setValue] matching useState API
 *
 * @example
 * const [config, setConfig] = useLocalStorage("config", defaultConfig, userId);
 * setConfig({ ...config, enabled: true }); // Auto-persists to localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  scope?: string,
): [T, (value: T | ((prev: T) => T)) => void] {
  const scopedKey = scope ? `${scope}:${key}` : key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(scopedKey);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        localStorage.setItem(scopedKey, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(
          `Failed to save to localStorage (key: ${scopedKey}):`,
          error,
        );
      }
    },
    [scopedKey, storedValue],
  );

  return [storedValue, setValue];
}
