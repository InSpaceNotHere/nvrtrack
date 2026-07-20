import type { Database } from "@/types/database";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodRow = Database["public"]["Tables"]["foods"]["Row"];
export type FoodInsert = Database["public"]["Tables"]["foods"]["Insert"];
export type FoodUpdate = Database["public"]["Tables"]["foods"]["Update"];

export type FoodEntryRow = Database["public"]["Tables"]["food_entries"]["Row"];
export type FoodEntryInsert = Database["public"]["Tables"]["food_entries"]["Insert"];
export type FoodEntryUpdate = Database["public"]["Tables"]["food_entries"]["Update"];

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MealTotals {
  breakfast: NutritionTotals;
  lunch: NutritionTotals;
  dinner: NutritionTotals;
  snack: NutritionTotals;
}

export interface GoalProgress {
  state: "no-goal" | "zero-goal" | "under-goal" | "over-goal";
  consumed: number;
  goal: number | null;
  remaining: number | null;
  percentOfGoal: number | null;
  clampedPercentOfGoal: number | null;
}

export interface NutritionEntryLike {
  servings: number;
  calories_per_serving: number;
  protein_per_serving_g: number;
  carbohydrate_per_serving_g: number;
  fat_per_serving_g: number;
  fiber_per_serving_g: number | null;
}
