import { describe, expect, it } from "vitest";

import {
  normalizeFoodEntryBaseInput,
  normalizeFoodEntrySnapshotInput,
  normalizeSavedFoodInput,
} from "./validation";

describe("saved food validation", () => {
  it("normalizes a valid saved food", () => {
    const result = normalizeSavedFoodInput({
      name: "  Greek Yogurt  ",
      brand: "  FAGE ",
      serving_size: "170",
      serving_unit: " g ",
      calories: "120",
      protein_g: "18",
      carbohydrate_g: "6",
      fat_g: "0",
      fiber_g: "",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      name: "Greek Yogurt",
      brand: "FAGE",
      serving_size: 170,
      serving_unit: "g",
      calories: 120,
      protein_g: 18,
      carbohydrate_g: 6,
      fat_g: 0,
      fiber_g: null,
    });
  });

  it("rejects blank names and invalid numeric values", () => {
    const result = normalizeSavedFoodInput({
      name: " ",
      brand: null,
      serving_size: 0,
      serving_unit: "",
      calories: -1,
      protein_g: -2,
      carbohydrate_g: -3,
      fat_g: -4,
      fiber_g: -5,
    });

    expect(result.data).toBeNull();
    expect(result.errors.name).toBeDefined();
    expect(result.errors.serving_size).toBeDefined();
    expect(result.errors.serving_unit).toBeDefined();
    expect(result.errors.calories).toBeDefined();
    expect(result.errors.protein_g).toBeDefined();
    expect(result.errors.carbohydrate_g).toBeDefined();
    expect(result.errors.fat_g).toBeDefined();
    expect(result.errors.fiber_g).toBeDefined();
  });
});

describe("food entry validation", () => {
  it("normalizes valid food entry base fields", () => {
    const result = normalizeFoodEntryBaseInput({
      entry_date: "2026-07-20",
      meal_type: "lunch",
      servings: "1.5",
      note: "  Added salt  ",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      entry_date: "2026-07-20",
      meal_type: "lunch",
      servings: 1.5,
      note: "Added salt",
    });
  });

  it("rejects invalid meal types and dates", () => {
    const result = normalizeFoodEntryBaseInput({
      entry_date: "invalid-date",
      meal_type: "brunch",
      servings: 0,
      note: null,
    });

    expect(result.data).toBeNull();
    expect(result.errors.entry_date).toBe("Entry date must be a valid date.");
    expect(result.errors.meal_type).toContain("breakfast");
    expect(result.errors.servings).toBeDefined();
  });

  it("normalizes valid custom snapshot nutrition", () => {
    const result = normalizeFoodEntrySnapshotInput({
      food_name: "  Banana ",
      brand_name: " ",
      serving_size: "118",
      serving_unit: "g",
      calories_per_serving: "105",
      protein_per_serving_g: "1.3",
      carbohydrate_per_serving_g: "27",
      fat_per_serving_g: "0.3",
      fiber_per_serving_g: "3.1",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      food_name: "Banana",
      brand_name: null,
      serving_size: 118,
      serving_unit: "g",
      calories_per_serving: 105,
      protein_per_serving_g: 1.3,
      carbohydrate_per_serving_g: 27,
      fat_per_serving_g: 0.3,
      fiber_per_serving_g: 3.1,
    });
  });

  it("rejects invalid snapshot values", () => {
    const result = normalizeFoodEntrySnapshotInput({
      food_name: "",
      brand_name: null,
      serving_size: -1,
      serving_unit: "",
      calories_per_serving: -10,
      protein_per_serving_g: -1,
      carbohydrate_per_serving_g: -1,
      fat_per_serving_g: -1,
      fiber_per_serving_g: -1,
    });

    expect(result.data).toBeNull();
    expect(result.errors.food_name).toBeDefined();
    expect(result.errors.serving_size).toBeDefined();
    expect(result.errors.serving_unit).toBeDefined();
    expect(result.errors.calories_per_serving).toBeDefined();
    expect(result.errors.protein_per_serving_g).toBeDefined();
    expect(result.errors.carbohydrate_per_serving_g).toBeDefined();
    expect(result.errors.fat_per_serving_g).toBeDefined();
    expect(result.errors.fiber_per_serving_g).toBeDefined();
  });
});
