import { describe, expect, it } from "vitest";

import { calculateNutritionForAmount, OUNCES_TO_GRAMS } from "./serving";
import type { NormalizedNutrientsPer100g } from "@/lib/usda/types";

const completeNutrients: NormalizedNutrientsPer100g = {
  calories_kcal: { value: 200, isMissing: false },
  protein_g: { value: 20, isMissing: false },
  carbohydrate_g: { value: 10, isMissing: false },
  fat_g: { value: 5, isMissing: false },
  fiber_g: { value: 3, isMissing: false },
  sugar_g: { value: 2, isMissing: false },
  sodium_mg: { value: 120, isMissing: false },
};

describe("serving calculations", () => {
  it("calculates nutrients for gram amounts", () => {
    const result = calculateNutritionForAmount({
      amountValue: 150,
      amountUnit: "g",
      nutrientsPer100g: completeNutrients,
    });

    expect(result.amountGrams).toBe(150);
    expect(result.nutrients.calories_kcal.value).toBe(300);
    expect(result.nutrients.protein_g.value).toBe(30);
  });

  it("calculates nutrients for ounce amounts", () => {
    const result = calculateNutritionForAmount({
      amountValue: 2,
      amountUnit: "oz",
      nutrientsPer100g: completeNutrients,
    });

    expect(result.amountGrams).toBeCloseTo(2 * OUNCES_TO_GRAMS, 10);
    expect(result.nutrients.calories_kcal.value).toBeCloseTo((2 * OUNCES_TO_GRAMS * 200) / 100, 10);
  });

  it("calculates nutrients for trusted source servings", () => {
    const result = calculateNutritionForAmount({
      amountValue: 1.5,
      amountUnit: "source_serving",
      sourceServing: {
        quantity: 1,
        unit: "container",
        weightGrams: 170,
      },
      nutrientsPer100g: completeNutrients,
    });

    expect(result.amountGrams).toBeCloseTo(255, 10);
    expect(result.sourceServingUnit).toBe("container");
    expect(result.nutrients.protein_g.value).toBeCloseTo(51, 10);
  });

  it("rejects unsupported source serving conversions", () => {
    expect(() =>
      calculateNutritionForAmount({
        amountValue: 1,
        amountUnit: "source_serving",
        sourceServing: null,
        nutrientsPer100g: completeNutrients,
      }),
    ).toThrowError(/source serving is unavailable/i);
  });

  it("rejects invalid amounts", () => {
    expect(() =>
      calculateNutritionForAmount({
        amountValue: 0,
        amountUnit: "g",
        nutrientsPer100g: completeNutrients,
      }),
    ).toThrowError(/greater than 0/i);
  });

  it("rejects foods missing required core nutrient fields by default", () => {
    const missingCalories: NormalizedNutrientsPer100g = {
      ...completeNutrients,
      calories_kcal: { value: null, isMissing: true },
    };

    expect(() =>
      calculateNutritionForAmount({
        amountValue: 100,
        amountUnit: "g",
        nutrientsPer100g: missingCalories,
      }),
    ).toThrowError(/missing required usda nutrient fields/i);
  });

  it("preserves missing versus explicit zero optional nutrients", () => {
    const mixed: NormalizedNutrientsPer100g = {
      ...completeNutrients,
      sugar_g: { value: null, isMissing: true },
      fiber_g: { value: 0, isMissing: false },
    };

    const result = calculateNutritionForAmount({
      amountValue: 100,
      amountUnit: "g",
      nutrientsPer100g: mixed,
    });

    expect(result.nutrients.sugar_g).toEqual({ value: null, isMissing: true });
    expect(result.nutrients.fiber_g).toEqual({ value: 0, isMissing: false });
  });
});
