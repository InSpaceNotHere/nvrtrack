import type { MealType } from "./types";

export const FOOD_NAME_MAX_LENGTH = 120;
export const FOOD_BRAND_MAX_LENGTH = 120;
export const SERVING_UNIT_MAX_LENGTH = 40;
export const ENTRY_NOTE_MAX_LENGTH = 500;
export const FOOD_SERVING_SIZE_MAX = 10000;
export const ENTRY_SERVINGS_MAX = 100;
export const CALORIES_MAX = 100000;
export const MACRO_MAX = 10000;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type NumberLike = number | string | null | undefined;

export interface SavedFoodInput {
  name: string;
  brand?: string | null;
  serving_size: NumberLike;
  serving_unit: string;
  calories: NumberLike;
  protein_g?: NumberLike;
  carbohydrate_g?: NumberLike;
  fat_g?: NumberLike;
  fiber_g?: NumberLike;
}

export interface SavedFoodNormalized {
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  fiber_g: number | null;
}

export interface FoodEntrySnapshotInput {
  food_name: string;
  brand_name?: string | null;
  serving_size: NumberLike;
  serving_unit: string;
  calories_per_serving: NumberLike;
  protein_per_serving_g?: NumberLike;
  carbohydrate_per_serving_g?: NumberLike;
  fat_per_serving_g?: NumberLike;
  fiber_per_serving_g?: NumberLike;
}

export interface FoodEntrySnapshotNormalized {
  food_name: string;
  brand_name: string | null;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein_per_serving_g: number;
  carbohydrate_per_serving_g: number;
  fat_per_serving_g: number;
  fiber_per_serving_g: number | null;
}

export interface FoodEntryBaseInput {
  entry_date: string;
  meal_type: string;
  servings?: NumberLike;
  note?: string | null;
}

export interface FoodEntryBaseNormalized {
  entry_date: string;
  meal_type: MealType;
  servings: number;
  note: string | null;
}

export interface ValidationResult<T, F extends string> {
  data: T | null;
  errors: Partial<Record<F, string>>;
}

export type SavedFoodField =
  | "name"
  | "brand"
  | "serving_size"
  | "serving_unit"
  | "calories"
  | "protein_g"
  | "carbohydrate_g"
  | "fat_g"
  | "fiber_g";

export type FoodEntryBaseField = "entry_date" | "meal_type" | "servings" | "note";

export type FoodEntrySnapshotField =
  | "food_name"
  | "brand_name"
  | "serving_size"
  | "serving_unit"
  | "calories_per_serving"
  | "protein_per_serving_g"
  | "carbohydrate_per_serving_g"
  | "fat_per_serving_g"
  | "fiber_per_serving_g";

function parseNumber(
  value: NumberLike,
  fieldLabel: string,
  options: { required: boolean; min: number; max: number; allowZero?: boolean },
): { value: number | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    if (!options.required) {
      return { value: null, error: null };
    }
    return { value: null, error: `${fieldLabel} is required.` };
  }

  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) {
    return { value: null, error: `${fieldLabel} must be a number.` };
  }

  if (options.allowZero === false && numeric <= 0) {
    return { value: null, error: `${fieldLabel} must be greater than 0.` };
  }

  if (numeric < options.min || numeric > options.max) {
    return { value: null, error: `${fieldLabel} must be between ${options.min} and ${options.max}.` };
  }

  return { value: numeric, error: null };
}

function parseRequiredText(
  value: string,
  fieldLabel: string,
  maxLength: number,
): { value: string | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: `${fieldLabel} is required.` };
  }
  if (trimmed.length > maxLength) {
    return { value: null, error: `${fieldLabel} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed, error: null };
}

function parseOptionalText(
  value: string | null | undefined,
  fieldLabel: string,
  maxLength: number,
): { value: string | null; error: string | null } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (trimmed.length > maxLength) {
    return { value: null, error: `${fieldLabel} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed, error: null };
}

export function isMealType(value: string): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

export function normalizeSavedFoodInput(input: SavedFoodInput): ValidationResult<SavedFoodNormalized, SavedFoodField> {
  const errors: Partial<Record<SavedFoodField, string>> = {};

  const name = parseRequiredText(input.name, "Food name", FOOD_NAME_MAX_LENGTH);
  if (name.error) errors.name = name.error;

  const brand = parseOptionalText(input.brand, "Brand", FOOD_BRAND_MAX_LENGTH);
  if (brand.error) errors.brand = brand.error;

  const servingSize = parseNumber(input.serving_size, "Serving size", {
    required: true,
    min: 0,
    max: FOOD_SERVING_SIZE_MAX,
    allowZero: false,
  });
  if (servingSize.error) errors.serving_size = servingSize.error;

  const servingUnit = parseRequiredText(input.serving_unit, "Serving unit", SERVING_UNIT_MAX_LENGTH);
  if (servingUnit.error) errors.serving_unit = servingUnit.error;

  const calories = parseNumber(input.calories, "Calories", {
    required: true,
    min: 0,
    max: CALORIES_MAX,
  });
  if (calories.error) errors.calories = calories.error;

  const protein = parseNumber(input.protein_g ?? 0, "Protein", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (protein.error) errors.protein_g = protein.error;

  const carbohydrate = parseNumber(input.carbohydrate_g ?? 0, "Carbohydrates", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (carbohydrate.error) errors.carbohydrate_g = carbohydrate.error;

  const fat = parseNumber(input.fat_g ?? 0, "Fat", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (fat.error) errors.fat_g = fat.error;

  const fiber = parseNumber(input.fiber_g, "Fiber", {
    required: false,
    min: 0,
    max: MACRO_MAX,
  });
  if (fiber.error) errors.fiber_g = fiber.error;

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      name: name.value!,
      brand: brand.value,
      serving_size: servingSize.value!,
      serving_unit: servingUnit.value!,
      calories: calories.value!,
      protein_g: protein.value!,
      carbohydrate_g: carbohydrate.value!,
      fat_g: fat.value!,
      fiber_g: fiber.value,
    },
    errors: {},
  };
}

export function normalizeFoodEntryBaseInput(
  input: FoodEntryBaseInput,
): ValidationResult<FoodEntryBaseNormalized, FoodEntryBaseField> {
  const errors: Partial<Record<FoodEntryBaseField, string>> = {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entry_date) || Number.isNaN(Date.parse(`${input.entry_date}T00:00:00.000Z`))) {
    errors.entry_date = "Entry date must be a valid date.";
  }

  if (!isMealType(input.meal_type)) {
    errors.meal_type = "Meal type must be breakfast, lunch, dinner, or snack.";
  }

  const servings = parseNumber(input.servings ?? 1, "Servings", {
    required: true,
    min: 0,
    max: ENTRY_SERVINGS_MAX,
    allowZero: false,
  });
  if (servings.error) {
    errors.servings = servings.error;
  }

  const note = parseOptionalText(input.note, "Note", ENTRY_NOTE_MAX_LENGTH);
  if (note.error) {
    errors.note = note.error;
  }

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      entry_date: input.entry_date,
      meal_type: input.meal_type as MealType,
      servings: servings.value!,
      note: note.value,
    },
    errors: {},
  };
}

export function normalizeFoodEntrySnapshotInput(
  input: FoodEntrySnapshotInput,
): ValidationResult<FoodEntrySnapshotNormalized, FoodEntrySnapshotField> {
  const errors: Partial<Record<FoodEntrySnapshotField, string>> = {};

  const foodName = parseRequiredText(input.food_name, "Food name", FOOD_NAME_MAX_LENGTH);
  if (foodName.error) errors.food_name = foodName.error;

  const brandName = parseOptionalText(input.brand_name, "Brand", FOOD_BRAND_MAX_LENGTH);
  if (brandName.error) errors.brand_name = brandName.error;

  const servingSize = parseNumber(input.serving_size, "Serving size", {
    required: true,
    min: 0,
    max: FOOD_SERVING_SIZE_MAX,
    allowZero: false,
  });
  if (servingSize.error) errors.serving_size = servingSize.error;

  const servingUnit = parseRequiredText(input.serving_unit, "Serving unit", SERVING_UNIT_MAX_LENGTH);
  if (servingUnit.error) errors.serving_unit = servingUnit.error;

  const calories = parseNumber(input.calories_per_serving, "Calories per serving", {
    required: true,
    min: 0,
    max: CALORIES_MAX,
  });
  if (calories.error) errors.calories_per_serving = calories.error;

  const protein = parseNumber(input.protein_per_serving_g ?? 0, "Protein per serving", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (protein.error) errors.protein_per_serving_g = protein.error;

  const carbohydrate = parseNumber(input.carbohydrate_per_serving_g ?? 0, "Carbohydrate per serving", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (carbohydrate.error) errors.carbohydrate_per_serving_g = carbohydrate.error;

  const fat = parseNumber(input.fat_per_serving_g ?? 0, "Fat per serving", {
    required: true,
    min: 0,
    max: MACRO_MAX,
  });
  if (fat.error) errors.fat_per_serving_g = fat.error;

  const fiber = parseNumber(input.fiber_per_serving_g, "Fiber per serving", {
    required: false,
    min: 0,
    max: MACRO_MAX,
  });
  if (fiber.error) errors.fiber_per_serving_g = fiber.error;

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      food_name: foodName.value!,
      brand_name: brandName.value,
      serving_size: servingSize.value!,
      serving_unit: servingUnit.value!,
      calories_per_serving: calories.value!,
      protein_per_serving_g: protein.value!,
      carbohydrate_per_serving_g: carbohydrate.value!,
      fat_per_serving_g: fat.value!,
      fiber_per_serving_g: fiber.value,
    },
    errors: {},
  };
}
