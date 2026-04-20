import { useMemo } from "react";
import { calculateResult } from "../lib/core";
import type { AppConfig, CalcResult, Player } from "../types";

/**
 * Hook that memoizes cost calculation based on input parameters.
 *
 * @param players - Array of players participating
 * @param courtFeeInput - Court fee as string (will be parsed to number)
 * @param shuttleCountInput - Shuttle count as string (will be parsed to number)
 * @param config - App configuration with pricing rules
 * @returns Memoized CalcResult object
 *
 * @example
 * const calc = useCalculation(players, "500", "2", config);
 * console.log(calc.total); // Total cost in thousands
 */
export function useCalculation(
  players: Player[],
  courtFeeInput: string,
  shuttleCountInput: string,
  config: AppConfig,
): CalcResult {
  return useMemo(() => {
    const courtFee = parseFloat(courtFeeInput) || 0;
    const shuttleCount = parseFloat(shuttleCountInput) || 0;
    return calculateResult(players, courtFee, shuttleCount, config);
  }, [players, courtFeeInput, shuttleCountInput, config]);
}
