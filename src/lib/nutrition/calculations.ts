import type { GoalProgress, MealTotals, MealType, NutritionEntryLike, NutritionTotals } from "./types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function roundNutritionValue(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function createEmptyTotals(): NutritionTotals {
  return {
    calories: 0,
    protein_g: 0,
    carbohydrate_g: 0,
    fat_g: 0,
    fiber_g: 0,
  };
}

export function calculateEntryTotals(entry: NutritionEntryLike): NutritionTotals {
  const servings = entry.servings;
  return {
    calories: roundNutritionValue(entry.calories_per_serving * servings),
    protein_g: roundNutritionValue(entry.protein_per_serving_g * servings),
    carbohydrate_g: roundNutritionValue(entry.carbohydrate_per_serving_g * servings),
    fat_g: roundNutritionValue(entry.fat_per_serving_g * servings),
    fiber_g: roundNutritionValue((entry.fiber_per_serving_g ?? 0) * servings),
  };
}

export function addNutritionTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories: roundNutritionValue(a.calories + b.calories),
    protein_g: roundNutritionValue(a.protein_g + b.protein_g),
    carbohydrate_g: roundNutritionValue(a.carbohydrate_g + b.carbohydrate_g),
    fat_g: roundNutritionValue(a.fat_g + b.fat_g),
    fiber_g: roundNutritionValue(a.fiber_g + b.fiber_g),
  };
}

export function calculateDailyTotals(entries: NutritionEntryLike[]): NutritionTotals {
  return entries.reduce((totals, entry) => addNutritionTotals(totals, calculateEntryTotals(entry)), createEmptyTotals());
}

export function isMealType(value: string): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

export function createEmptyMealTotals(): MealTotals {
  return {
    breakfast: createEmptyTotals(),
    lunch: createEmptyTotals(),
    dinner: createEmptyTotals(),
    snack: createEmptyTotals(),
  };
}

export function calculateMealTotals(entries: Array<NutritionEntryLike & { meal_type: string }>): MealTotals {
  return entries.reduce((acc, entry) => {
    if (!isMealType(entry.meal_type)) {
      return acc;
    }

    acc[entry.meal_type] = addNutritionTotals(acc[entry.meal_type], calculateEntryTotals(entry));
    return acc;
  }, createEmptyMealTotals());
}

export function calculateGoalProgress(consumed: number, goal: number | null): GoalProgress {
  const normalizedConsumed = roundNutritionValue(consumed);

  if (goal === null) {
    return {
      state: "no-goal",
      consumed: normalizedConsumed,
      goal: null,
      remaining: null,
      percentOfGoal: null,
      clampedPercentOfGoal: null,
    };
  }

  if (goal === 0) {
    return {
      state: "zero-goal",
      consumed: normalizedConsumed,
      goal: 0,
      remaining: roundNutritionValue(-normalizedConsumed),
      percentOfGoal: null,
      clampedPercentOfGoal: null,
    };
  }

  const remaining = roundNutritionValue(goal - normalizedConsumed);
  const percent = roundNutritionValue((normalizedConsumed / goal) * 100, 1);
  const clamped = roundNutritionValue(Math.max(0, Math.min(100, percent)), 1);

  return {
    state: remaining >= 0 ? "under-goal" : "over-goal",
    consumed: normalizedConsumed,
    goal,
    remaining,
    percentOfGoal: percent,
    clampedPercentOfGoal: clamped,
  };
}
