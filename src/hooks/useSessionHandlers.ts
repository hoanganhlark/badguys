import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { normalizeKLabels } from "../lib/core";
import { isSupabaseReady } from "../lib/api";
import { copyText } from "../lib/platform";

export interface SessionHandlersOptions {
  showToast: (message: string) => void;
  removeSessions: (sessionId: string) => Promise<any>;
}

export function useSessionHandlers(options: SessionHandlersOptions) {
  const { showToast, removeSessions } = options;
  const { t } = useTranslation();

  const handleRemoveSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId) {
        showToast(t("app.toastMissingSessionId"));
        return;
      }

      if (!isSupabaseReady()) {
        showToast(t("app.toastSupabaseNotReady"));
        return;
      }

      const confirmed = window.confirm(t("common.confirmDelete"));
      if (!confirmed) return;

      try {
        await removeSessions(sessionId);
        showToast(t("app.toastDeletedSession"));
      } catch (error) {
        console.warn("Remove session failed", error);
        showToast(t("app.toastDeleteFailed"));
      }
    },
    [showToast, removeSessions, t],
  );

  const handleCopySessionNote = useCallback(
    async (summaryText: string) => {
      if (!summaryText) return;
      try {
        await copyText(normalizeKLabels(summaryText));
        showToast(t("app.toastCopiedNote"));
      } catch {
        showToast(t("common.copyFailed"));
      }
    },
    [showToast, t],
  );

  return {
    handleRemoveSession,
    handleCopySessionNote,
  };
}
