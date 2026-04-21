import { describe, expect, it } from "vitest";
import type { AppConfig, Player } from "../types";
import { calculateResult } from "./core";

const baseConfig: Omit<AppConfig, "roundResult"> = {
  femaleMax: 60,
  tubePrice: 290,
  setPrice: 12,
  shuttlesPerTube: 12,
  enableCourtCount: true,
};

describe("calculateResult", () => {
  it("giu mac dinh 1 so le khi tat lam tron", () => {
    const players: Player[] = [
      { name: "An", isFemale: false, sets: 0, customFee: null, extraFee: null },
      {
        name: "Binh",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
      {
        name: "Cuong",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
    ];

    const result = calculateResult(players, 100, 1, {
      ...baseConfig,
      roundResult: false,
    });

    expect(result.mFee).toBeCloseTo(41.4, 5);
    expect(result.fFee).toBeCloseTo(41.4, 5);
    expect(Number(result.mFee.toFixed(1))).toBe(result.mFee);
    expect(result.total).toBe(124.2);
    expect(Number(result.total.toFixed(1))).toBe(result.total);
  });

  it("giu female max va mFee fixed 1 khi avg vuot female max", () => {
    const players: Player[] = [
      { name: "An", isFemale: true, sets: 0, customFee: null, extraFee: null },
      {
        name: "Binh",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
      {
        name: "Cuong",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
    ];

    const result = calculateResult(players, 200, 1, {
      ...baseConfig,
      roundResult: false,
    });

    expect(result.fFee).toBe(60);
    expect(result.mFee).toBeCloseTo(82.1, 5);
    expect(Number(result.mFee.toFixed(1))).toBe(result.mFee);
    expect(result.total).toBe(224.2);
    expect(Number(result.total.toFixed(1))).toBe(result.total);
  });

  it("van lam tron so nguyen khi bat roundResult", () => {
    const players: Player[] = [
      { name: "An", isFemale: false, sets: 0, customFee: null, extraFee: null },
      {
        name: "Binh",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
      {
        name: "Cuong",
        isFemale: false,
        sets: 0,
        customFee: null,
        extraFee: null,
      },
    ];

    const result = calculateResult(players, 100, 1, {
      ...baseConfig,
      roundResult: true,
    });

    expect(result.mFee).toBe(41);
    expect(result.fFee).toBe(41);
  });
});
