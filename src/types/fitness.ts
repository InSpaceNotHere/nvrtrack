import type { LucideIcon } from "lucide-react";

export type AppRoute = "/" | "/nutrition" | "/training" | "/progress" | "/profile";

export interface NavigationItem {
  href: AppRoute;
  label: string;
  icon: LucideIcon;
}

export interface MacroStat {
  name: "Protein" | "Carbohydrates" | "Fat";
  consumed: number;
  goal: number;
  unit: "g";
}

export interface WeightTrendPoint {
  label: string;
  value: number;
}

export interface MealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
}

export interface StrengthGoal {
  lift: "Bench" | "Squat" | "Deadlift";
  current: number;
  target: number;
  unit: "lb";
}

export interface StrengthPr {
  exercise: "Bench Press" | "Squat" | "Deadlift";
  value: number;
  unit: "lb";
}
