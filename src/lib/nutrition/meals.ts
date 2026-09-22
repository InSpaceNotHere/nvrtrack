import type { MealType } from "./types";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function parseMealTypeParam(value: string | string[] | undefined, fallback: MealType = "breakfast"): MealType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "breakfast" || raw === "lunch" || raw === "dinner" || raw === "snack") {
    return raw;
  }
  return fallback;
}
