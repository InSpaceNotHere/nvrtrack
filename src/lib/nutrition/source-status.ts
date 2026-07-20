export const FOOD_SOURCE_STATUSES = [
  "manual",
  "usda_catalog",
  "usda_live",
  "usda_modified",
] as const;

export type FoodSourceStatus = (typeof FOOD_SOURCE_STATUSES)[number];

export interface CoreNutritionValues {
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
}

export interface ResolveFoodSourceStatusInput {
  currentStatus: string | null | undefined;
  hasUsdaSource: boolean;
  previousCoreNutrition: CoreNutritionValues;
  nextCoreNutrition: CoreNutritionValues;
}

const USDA_TRACKED_STATUSES: FoodSourceStatus[] = [
  "usda_catalog",
  "usda_live",
  "usda_modified",
];

export function isFoodSourceStatus(value: string | null | undefined): value is FoodSourceStatus {
  return value !== null && value !== undefined && FOOD_SOURCE_STATUSES.includes(value as FoodSourceStatus);
}

export function normalizeFoodSourceStatus(
  value: string | null | undefined,
  fallback: FoodSourceStatus | null = null,
): FoodSourceStatus | null {
  if (isFoodSourceStatus(value)) {
    return value;
  }
  return fallback;
}

export function hasCoreNutritionChanged(
  previous: CoreNutritionValues,
  next: CoreNutritionValues,
): boolean {
  return (
    previous.calories !== next.calories ||
    previous.protein_g !== next.protein_g ||
    previous.carbohydrate_g !== next.carbohydrate_g ||
    previous.fat_g !== next.fat_g
  );
}

export function resolveFoodSourceStatusAfterNutritionEdit(
  input: ResolveFoodSourceStatusInput,
): FoodSourceStatus {
  const currentStatus = normalizeFoodSourceStatus(input.currentStatus, "manual");

  if (!input.hasUsdaSource) {
    return "manual";
  }

  if (
    USDA_TRACKED_STATUSES.includes(currentStatus) &&
    hasCoreNutritionChanged(input.previousCoreNutrition, input.nextCoreNutrition)
  ) {
    return "usda_modified";
  }

  if (currentStatus === "manual") {
    return "usda_live";
  }

  return currentStatus;
}
