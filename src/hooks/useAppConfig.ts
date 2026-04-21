import { useEffect, useState } from "react";
import { loadStoredConfig, saveConfig } from "../lib/platform";
import { envConfig } from "../env";
import type { AppConfig } from "../types";

/**
 * Manages app configuration state with localStorage persistence.
 * Loads config on mount, saves on changes, and validates values.
 */
export function useAppConfig(storageScopeKey: string) {
  const [appConfig, setAppConfig] = useState<AppConfig>(() =>
    loadStoredConfig(envConfig.defaultConfig, storageScopeKey),
  );

  // Load config when storage scope changes (e.g., user login/logout)
  useEffect(() => {
    setAppConfig(loadStoredConfig(envConfig.defaultConfig, storageScopeKey));
  }, [storageScopeKey]);

  // Persist config changes to localStorage
  useEffect(() => {
    saveConfig(appConfig, storageScopeKey);
  }, [appConfig, storageScopeKey]);

  // Handle config updates with validation
  const handleConfigChange = (next: AppConfig) => {
    setAppConfig({
      ...next,
      femaleMax: Math.max(0, next.femaleMax || 0),
      tubePrice: Math.max(0, next.tubePrice || 0),
      setPrice: Math.max(0, next.setPrice || 0),
      enableCourtCount: !!next.enableCourtCount,
    });
  };

  return {
    appConfig,
    handleConfigChange,
  };
}
