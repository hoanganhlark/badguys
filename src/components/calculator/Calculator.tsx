import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { App as AntApp } from "antd";
import { useCostCalculatorState } from "../../features/calculator/hooks/useCostCalculatorState";
import { useCalculation } from "../../hooks/useCalculation";
import {
  buildSessionPayload,
  buildSummaryText,
  cyclePlayerMode,
  playersToBulk,
} from "../../lib/core";
import {
  RESET_CONFIRM_TIMEOUT_MS,
} from "../../lib/constants";
import { saveDailySummary } from "../../lib/firebase";
import {
  copyText,
} from "../../lib/platform";
import {
  AnalyticsEventName,
  AnalyticsNotificationType,
  AnalyticsParamKey,
  AnalyticsStatus,
  trackEvent,
} from "../../lib/analytics";
import { notifyCopyClicked } from "../../lib/telegram";
import type { AppConfig } from "../../types";
import ExpensesSection from "./ExpensesSection";
import PlayersSection from "./PlayersSection";
import ResultCard from "./ResultCard";

interface CalculatorProps {
  userId: string;
  isAdmin: boolean;
  appConfig: AppConfig;
  onCopySummary?: () => void;
}

export default function Calculator({
  userId,
  isAdmin,
  appConfig,
  onCopySummary,
}: CalculatorProps) {
  const { t } = useTranslation();
  const { message: messageApi } = AntApp.useApp();
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  const {
    inputs,
    setCourtFeeInput,
    setShuttleCountInput,
    setCourtCountInput,
    setBulkInput,
    players,
    reset: resetInputs,
  } = useCostCalculatorState(userId);

  const calc = useCalculation(
    players,
    inputs.courtFeeInput,
    inputs.shuttleCountInput,
    appConfig,
  );

  const showResult = players.length > 0 && calc.total !== 0;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function showToast(message: string) {
    messageApi.info(message);
  }

  const handleBulkInputChange = useCallback((value: string) => {
    setBulkInput(value);
  }, [setBulkInput]);

  const handleTogglePlayer = useCallback((index: number) => {
    const next = players.map((player, i) =>
      i === index ? cyclePlayerMode(player) : player,
    );
    setBulkInput(playersToBulk(next));
  }, [players, setBulkInput]);

  const handleRemovePlayer = useCallback((index: number) => {
    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    const next = players.filter((_, i) => i !== index);
    setBulkInput(playersToBulk(next));
  }, [players, setBulkInput, t]);

  const handleCopySummary = useCallback(async () => {
    trackEvent(AnalyticsEventName.CalculateSession, {
      [AnalyticsParamKey.PlayersCount]: players.length,
      [AnalyticsParamKey.MaleCount]: calc.malesCount,
      [AnalyticsParamKey.FemaleCount]: calc.femalesCount,
      [AnalyticsParamKey.TotalFeeK]: calc.total,
    });

    const summaryText = buildSummaryText(
      players,
      appConfig,
      calc,
      parseFloat(inputs.courtFeeInput) || 0,
      parseFloat(inputs.courtCountInput) || 0,
      parseFloat(inputs.shuttleCountInput) || 0,
    );
    const payload = buildSessionPayload(
      summaryText,
      players,
      parseFloat(inputs.courtFeeInput) || 0,
      parseFloat(inputs.courtCountInput) || 0,
      parseFloat(inputs.shuttleCountInput) || 0,
      appConfig,
      calc,
    );

    try {
      await copyText(summaryText);
      showToast(t("app.toastCopiedSummary"));
    } catch {
      showToast(t("common.copyFailed"));
      return;
    }

    if (!isAdmin) {
      trackEvent(AnalyticsEventName.SendTelegramNotification, {
        [AnalyticsParamKey.NotificationType]:
          AnalyticsNotificationType.CopyClicked,
      });
      void notifyCopyClicked(summaryText);
      void saveDailySummary(payload)
        .then(() => {
          trackEvent(AnalyticsEventName.SaveSession, {
            [AnalyticsParamKey.Status]: AnalyticsStatus.Success,
          });
        })
        .catch((error) => {
          console.warn("Save daily session failed", error);
          trackEvent(AnalyticsEventName.SaveSession, {
            [AnalyticsParamKey.Status]: AnalyticsStatus.Failed,
          });
        });
    }

    onCopySummary?.();
  }, [players, calc, appConfig, inputs, isAdmin, t]);

  const handleReset = useCallback(() => {
    if (resetArmed) {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = null;
      setResetArmed(false);
      resetInputs();
      showToast(t("app.toastClearedData"));
      return;
    }

    setResetArmed(true);
    resetTimerRef.current = window.setTimeout(() => {
      setResetArmed(false);
      resetTimerRef.current = null;
    }, RESET_CONFIRM_TIMEOUT_MS);
  }, [resetArmed, resetInputs, t]);

  return (
    <div className="max-w-md mx-auto">
      <ExpensesSection
        courtFee={inputs.courtFeeInput}
        shuttleCount={inputs.shuttleCountInput}
        courtCount={inputs.courtCountInput}
        showCourtCount={appConfig.enableCourtCount}
        onCourtFeeChange={setCourtFeeInput}
        onShuttleCountChange={setShuttleCountInput}
        onCourtCountChange={setCourtCountInput}
      />

      <PlayersSection
        bulkInput={inputs.bulkInput}
        players={players}
        onBulkInputChange={handleBulkInputChange}
        onTogglePlayer={handleTogglePlayer}
        onRemovePlayer={handleRemovePlayer}
      />

      <ResultCard
        visible={showResult}
        totalLabel={`${calc.total}k`}
        maleFeeLabel={`${calc.mFee}k`}
        femaleFeeLabel={`${appConfig.femaleMax}k`}
        setPriceLabel={`${appConfig.setPrice}k`}
        onCopy={handleCopySummary}
      />

      <div className="flex justify-center gap-8 mt-8">
        <button
          type="button"
          onClick={handleReset}
          className={`text-xs font-medium transition-colors uppercase ${
            resetArmed
              ? "text-red-600"
              : "text-slate-400 hover:text-red-500"
          }`}
        >
          {resetArmed ? t("app.resetConfirm") : t("app.resetData")}
        </button>
      </div>
    </div>
  );
}
