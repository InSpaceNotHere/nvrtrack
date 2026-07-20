import { describe, expect, it } from "vitest";

import {
  addNutritionTotals,
  calculateDailyTotals,
  calculateEntryTotals,
  calculateGoalProgress,
  calculateMealTotals,
  createEmptyTotals,
  roundNutritionValue,
} from "./calculations";

describe("nutrition calculations", () => {
  it("calculates totals for one entry", () => {
    const totals = calculateEntryTotals({
      servings: 1,
      calories_per_serving: 240,
      protein_per_serving_g: 20,
      carbohydrate_per_serving_g: 30,
      fat_per_serving_g: 8,
      fiber_per_serving_g: 4,
    });

    expect(totals).toEqual({
      calories: 240,
      protein_g: 20,
      carbohydrate_g: 30,
      fat_g: 8,
      fiber_g: 4,
    });
  });

  it("supports fractional servings", () => {
    const totals = calculateEntryTotals({
      servings: 1.5,
      calories_per_serving: 100,
      protein_per_serving_g: 10,
      carbohydrate_per_serving_g: 12,
      fat_per_serving_g: 4,
      fiber_per_serving_g: null,
    });

    expect(totals.calories).toBe(150);
    expect(totals.protein_g).toBe(15);
    expect(totals.carbohydrate_g).toBe(18);
    expect(totals.fat_g).toBe(6);
    expect(totals.fiber_g).toBe(0);
  });

  it("supports multiple servings", () => {
    const totals = calculateEntryTotals({
      servings: 3,
      calories_per_serving: 180,
      protein_per_serving_g: 8,
      carbohydrate_per_serving_g: 15,
      fat_per_serving_g: 7,
      fiber_per_serving_g: 2,
    });

    expect(totals).toEqual({
      calories: 540,
      protein_g: 24,
      carbohydrate_g: 45,
      fat_g: 21,
      fiber_g: 6,
    });
  });

  it("aggregates daily totals", () => {
    const totals = calculateDailyTotals([
      {
        servings: 2,
        calories_per_serving: 100,
        protein_per_serving_g: 5,
        carbohydrate_per_serving_g: 12,
        fat_per_serving_g: 1,
        fiber_per_serving_g: 2,
      },
      {
        servings: 1,
        calories_per_serving: 450,
        protein_per_serving_g: 30,
        carbohydrate_per_serving_g: 40,
        fat_per_serving_g: 20,
        fiber_per_serving_g: 6,
      },
    ]);

    expect(totals).toEqual({
      calories: 650,
      protein_g: 40,
      carbohydrate_g: 64,
      fat_g: 22,
      fiber_g: 10,
    });
  });

  it("returns zero totals for empty entries", () => {
    expect(calculateDailyTotals([])).toEqual(createEmptyTotals());
  });

  it("groups totals by meal", () => {
    const mealTotals = calculateMealTotals([
      {
        meal_type: "breakfast",
        servings: 1,
        calories_per_serving: 300,
        protein_per_serving_g: 20,
        carbohydrate_per_serving_g: 35,
        fat_per_serving_g: 9,
        fiber_per_serving_g: 3,
      },
      {
        meal_type: "dinner",
        servings: 2,
        calories_per_serving: 250,
        protein_per_serving_g: 15,
        carbohydrate_per_serving_g: 20,
        fat_per_serving_g: 10,
        fiber_per_serving_g: 4,
      },
    ]);

    expect(mealTotals.breakfast.calories).toBe(300);
    expect(mealTotals.dinner.calories).toBe(500);
    expect(mealTotals.lunch.calories).toBe(0);
    expect(mealTotals.snack.calories).toBe(0);
  });

  it("handles goal progress with null goals", () => {
    const progress = calculateGoalProgress(1300, null);
    expect(progress.state).toBe("no-goal");
    expect(progress.percentOfGoal).toBeNull();
  });

  it("handles goal progress with zero goals", () => {
    const progress = calculateGoalProgress(200, 0);
    expect(progress.state).toBe("zero-goal");
    expect(progress.percentOfGoal).toBeNull();
    expect(progress.clampedPercentOfGoal).toBeNull();
  });

  it("handles under and over goal states", () => {
    const under = calculateGoalProgress(1800, 2200);
    expect(under.state).toBe("under-goal");
    expect(under.remaining).toBe(400);
    expect(under.percentOfGoal).toBe(81.8);

    const over = calculateGoalProgress(2500, 2200);
    expect(over.state).toBe("over-goal");
    expect(over.remaining).toBe(-300);
    expect(over.clampedPercentOfGoal).toBe(100);
  });

  it("rounds nutrition values to avoid floating-point noise", () => {
    expect(roundNutritionValue(0.1 + 0.2)).toBe(0.3);

    const combined = addNutritionTotals(
      { calories: 100.005, protein_g: 10.004, carbohydrate_g: 0, fat_g: 0, fiber_g: 0 },
      { calories: 0.005, protein_g: 0.006, carbohydrate_g: 0, fat_g: 0, fiber_g: 0 },
    );
    expect(combined.calories).toBe(100.01);
    expect(combined.protein_g).toBe(10.01);
  });
});
