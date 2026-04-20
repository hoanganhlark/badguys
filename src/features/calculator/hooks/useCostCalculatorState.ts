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
 * Hook for managing cost calculator state with auto-persistence to localStorage.
 * Handles calculator inputs (court fee, shuttle count, court count, player bulk input).
 * Automatically parses bulk player input and persists all changes.
 *
 * @param {string} userId - User ID for scoped storage (e.g., currentUser.userId or "guest")
 * @returns {CostCalculatorState} Object containing:
 *   - inputs: CalculatorInputs {courtFeeInput, shuttleCountInput, courtCountInput, bulkInput}
 *   - config: Current app config
 *   - players: Parsed array of Player objects from bulk input
 *   - setCourtFeeInput: Update court fee (persisted)
 *   - setShuttleCountInput: Update shuttle count (persisted)
 *   - setCourtCountInput: Update court count (persisted)
 *   - setBulkInput: Update player bulk input (persisted)
 *   - setConfig: Update calculator config (persisted)
 *   - reset: Clear all inputs and localStorage
 *
 * @example
 * const { inputs, players, setCourtFeeInput, reset } = useCostCalculatorState(userId);
 * setCourtFeeInput("500"); // Auto-persists to localStorage
 * console.log(players); // Automatically parsed from bulkInput
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
