import { describe, expect, it } from "vitest";

import { hasRequiredMacroNutrients, normalizeUsdaNutrientsPer100g } from "./nutrients";
import type { UsdaFoodNutrient } from "./types";

describe("USDA nutrient normalization", () => {
  it("maps required and optional nutrients deterministically", () => {
    const nutrients: UsdaFoodNutrient[] = [
      { nutrientId: 1008, unitName: "KCAL", value: 165 },
      { nutrientId: 1003, unitName: "G", value: 31 },
      { nutrientId: 1005, unitName: "g", value: 0 },
      { nutrientId: 1004, unitName: "g", value: 3.6 },
      { nutrientId: 1079, unitName: "g", value: 0 },
      { nutrientId: 2000, unitName: "g", value: 0 },
      { nutrientId: 1093, unitName: "mg", value: 74 },
    ];

    const normalized = normalizeUsdaNutrientsPer100g(nutrients);
    expect(normalized.calories_kcal).toEqual({ value: 165, isMissing: false });
    expect(normalized.protein_g).toEqual({ value: 31, isMissing: false });
    expect(normalized.carbohydrate_g).toEqual({ value: 0, isMissing: false });
    expect(normalized.fat_g).toEqual({ value: 3.6, isMissing: false });
    expect(normalized.fiber_g).toEqual({ value: 0, isMissing: false });
    expect(normalized.sugar_g).toEqual({ value: 0, isMissing: false });
    expect(normalized.sodium_mg).toEqual({ value: 74, isMissing: false });
    expect(hasRequiredMacroNutrients(normalized)).toBe(true);
  });

  it("does not treat kilojoules as kilocalories", () => {
    const normalized = normalizeUsdaNutrientsPer100g([
      { nutrientId: 1062, unitName: "kJ", value: 550 },
      { nutrientId: 1003, unitName: "g", value: 10 },
      { nutrientId: 1005, unitName: "g", value: 20 },
      { nutrientId: 1004, unitName: "g", value: 5 },
    ]);

    expect(normalized.calories_kcal).toEqual({ value: null, isMissing: true });
    expect(hasRequiredMacroNutrients(normalized)).toBe(false);
  });

  it("keeps missing nutrients distinct from explicit zero", () => {
    const normalized = normalizeUsdaNutrientsPer100g([
      { nutrientId: 1008, unitName: "kcal", value: 40 },
      { nutrientId: 1003, unitName: "g", value: 0 },
      { nutrientId: 1005, unitName: "g", value: 0 },
      { nutrientId: 1004, unitName: "g", value: 0 },
    ]);

    expect(normalized.protein_g).toEqual({ value: 0, isMissing: false });
    expect(normalized.fiber_g).toEqual({ value: null, isMissing: true });
    expect(normalized.sugar_g).toEqual({ value: null, isMissing: true });
    expect(normalized.sodium_mg).toEqual({ value: null, isMissing: true });
  });

  it("rejects negative nutrient values", () => {
    expect(() =>
      normalizeUsdaNutrientsPer100g([
        { nutrientId: 1008, unitName: "kcal", value: -10 },
      ]),
    ).toThrowError(/negative value/i);
  });
});
