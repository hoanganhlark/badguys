import { useState, useEffect, useCallback, useMemo } from "react";
import { parsePlayersBulk } from "../../../lib/core";
import {
  loadStoredInputDraft,
  saveInputDraft,
  clearInputDraft,
  loadStoredConfig,
  saveConfig,
} from "../../../lib/platform";
import { envConfig } from "../../../env";
import type { AppConfig, Player } from "../../../types";

export interface CalculatorInputs {
  courtFeeInput: string;
  shuttleCountInput: string;
  courtCountInput: string;
  bulkInput: string;
}

export interface CostCalculatorState {
  inputs: CalculatorInputs;
  config: AppConfig;
  players: Player[];
  setCourtFeeInput: (value: string) => void;
  setShuttleCountInput: (value: string) => void;
  setCourtCountInput: (value: string) => void;
  setBulkInput: (value: string) => void;
  setConfig: (config: AppConfig) => void;
  reset: () => void;
}

/**
 * Manages all cost calculator state (inputs, config, players) with auto-persistence to localStorage.
 *
 * @param userId - User ID for scoped storage (e.g., currentUser.userId or "guest")
 * @returns Object with inputs, config, players, setters, and reset function
 *
 * @example
 * const { inputs, setCourtFeeInput, reset, players } = useCostCalculatorState(userId);
 * setCourtFeeInput("500"); // Auto-persists to localStorage
 * reset(); // Clears all inputs and localStorage
 */
export function useCostCalculatorState(userId: string): CostCalculatorState {
  const [inputs, setInputs] = useState<CalculatorInputs>(() =>
    loadStoredInputDraft(userId),
  );

  const [config, setConfigState] = useState<AppConfig>(() =>
    loadStoredConfig(envConfig.defaultConfig, userId),
  );

  const players = useMemo(() => parsePlayersBulk(inputs.bulkInput), [inputs.bulkInput]);

  useEffect(() => {
    saveInputDraft(inputs, userId);
  }, [inputs, userId]);

  useEffect(() => {
    saveConfig(config, userId);
  }, [config, userId]);

  const setCourtFeeInput = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, courtFeeInput: value }));
  }, []);

  const setShuttleCountInput = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, shuttleCountInput: value }));
  }, []);

  const setCourtCountInput = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, courtCountInput: value }));
  }, []);

  const setBulkInput = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, bulkInput: value }));
  }, []);

  const setConfig = useCallback((newConfig: AppConfig) => {
    setConfigState({
      ...newConfig,
      femaleMax: Math.max(0, newConfig.femaleMax || 0),
      tubePrice: Math.max(0, newConfig.tubePrice || 0),
      setPrice: Math.max(0, newConfig.setPrice || 0),
      enableCourtCount: !!newConfig.enableCourtCount,
    });
  }, []);

  const reset = useCallback(() => {
    const emptyInputs: CalculatorInputs = {
      courtFeeInput: "",
      shuttleCountInput: "",
      courtCountInput: "",
      bulkInput: "",
    };
    setInputs(emptyInputs);
    clearInputDraft(userId);
  }, [userId]);

  return {
    inputs,
    config,
    players,
    setCourtFeeInput,
    setShuttleCountInput,
    setCourtCountInput,
    setBulkInput,
    setConfig,
    reset,
  };
}
