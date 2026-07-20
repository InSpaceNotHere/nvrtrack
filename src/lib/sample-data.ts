import type {
  MacroStat,
  MealEntry,
  StrengthGoal,
  StrengthPr,
  WeightTrendPoint,
  WorkoutExercise,
} from "@/types/fitness";

export const HOME_DATA = {
  calories: {
    consumed: 1842,
    goal: 2500,
  },
  currentWeight: {
    value: 204.8,
    changeLabel: "down 1.2 lb",
  },
  sevenDayAverage: {
    value: 205.6,
    changeLabel: "down 0.8 lb",
  },
  workout: {
    name: "Bench Day",
    exercises: 5,
    totalSets: 12,
  },
} as const;

export const MACRO_STATS: MacroStat[] = [
  { name: "Protein", consumed: 162, goal: 190, unit: "g" },
  { name: "Carbohydrates", consumed: 201, goal: 250, unit: "g" },
  { name: "Fat", consumed: 62, goal: 70, unit: "g" },
];

export const WEIGHT_TREND: WeightTrendPoint[] = [
  { label: "Mon", value: 206.8 },
  { label: "Tue", value: 206.3 },
  { label: "Wed", value: 205.9 },
  { label: "Thu", value: 205.7 },
  { label: "Fri", value: 205.2 },
  { label: "Sat", value: 204.9 },
  { label: "Sun", value: 204.8 },
];

export const CLUB_TARGETS: StrengthGoal[] = [
  { lift: "Bench", current: 225, target: 315, unit: "lb" },
  { lift: "Squat", current: 225, target: 405, unit: "lb" },
  { lift: "Deadlift", current: 345, target: 500, unit: "lb" },
];

export const RECENT_MEALS: MealEntry[] = [
  {
    id: "meal-1",
    name: "Egg white scramble + toast",
    calories: 462,
    protein: 41,
    carbs: 38,
    fat: 16,
    time: "7:35 AM",
  },
  {
    id: "meal-2",
    name: "Chicken rice bowl",
    calories: 691,
    protein: 58,
    carbs: 70,
    fat: 19,
    time: "12:48 PM",
  },
  {
    id: "meal-3",
    name: "Greek yogurt, granola, berries",
    calories: 389,
    protein: 24,
    carbs: 45,
    fat: 10,
    time: "8:12 PM",
  },
];

export const TRAINING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const TODAY_EXERCISES: WorkoutExercise[] = [
  { name: "Barbell Bench Press", sets: 4, reps: "5-8" },
  { name: "Incline Dumbbell Press", sets: 3, reps: "8-10" },
  { name: "Chest Fly", sets: 2, reps: "12-15" },
  { name: "Dips", sets: 2, reps: "8-12" },
  { name: "Triceps Pushdown", sets: 1, reps: "12-15" },
];

export const STRENGTH_PRS: StrengthPr[] = [
  { exercise: "Bench Press", value: 225, unit: "lb" },
  { exercise: "Squat", value: 225, unit: "lb" },
  { exercise: "Deadlift", value: 345, unit: "lb" },
];

export const PROFILE_DEFAULTS = {
  displayName: "NVRTRACK Athlete",
  height: "6'0\"",
  calorieGoal: 2500,
  proteinGoal: 190,
  carbohydrateGoal: 250,
  fatGoal: 70,
  unit: "Imperial (lb, in)",
  appearance: "Dark",
} as const;
