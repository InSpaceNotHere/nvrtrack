"use server";

import { revalidatePath } from "next/cache";

import {
  createMyFood,
  deleteMyFood,
  updateMyFood,
} from "@/lib/data/foods";
import { searchActiveFoodCatalog } from "@/lib/data/food-catalog";
import {
  createMyFoodEntry,
  createMyCatalogFoodEntry,
  deleteMyFoodEntry,
  updateMyCatalogFoodEntry,
  updateMyFoodEntry,
  type CreateMyFoodEntryInput,
  type CreateMyCatalogFoodEntryInput,
  type UpdateMyCatalogFoodEntryInput,
  type UpdateMyFoodEntryInput,
} from "@/lib/data/nutrition";
import {
  normalizeFoodEntryBaseInput,
  normalizeFoodEntrySnapshotInput,
  normalizeSavedFoodInput,
  type FoodEntryBaseField,
  type FoodEntrySnapshotField,
  type SavedFoodField,
  type SavedFoodInput,
} from "@/lib/nutrition/validation";
import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "@/lib/data/auth-context";
import { parseAmountUnit, parseAmountValue } from "@/lib/nutrition/catalog-entry";
import type { SupportedAmountUnit } from "@/lib/nutrition/serving";

type BaseActionResult = {
  status: "success" | "error";
  message: string;
};

export type SavedFoodFormErrors = Partial<Record<SavedFoodField, string>>;
export type FoodEntryFormErrors = Partial<Record<FoodEntryBaseField | FoodEntrySnapshotField | "food_id", string>>;

export interface SavedFoodActionResult extends BaseActionResult {
  errors: SavedFoodFormErrors;
  food: FoodRow | null;
}

export interface FoodEntryActionResult extends BaseActionResult {
  errors: FoodEntryFormErrors;
  entry: FoodEntryRow | null;
}

export type CatalogFoodEntryFormErrors = Partial<
  Record<FoodEntryBaseField | "catalog_food_id" | "amount_value" | "amount_unit", string>
>;

export interface CatalogFoodEntryActionResult extends BaseActionResult {
  errors: CatalogFoodEntryFormErrors;
  entry: FoodEntryRow | null;
}

export interface CatalogFoodSearchActionResult extends BaseActionResult {
  foods: FoodCatalogRow[];
}

export type SavedFoodActionInput = SavedFoodInput;

export interface FoodEntryActionInput {
  mode: "saved" | "custom";
  food_id?: string | null;
  entry_date: string;
  meal_type: string;
  servings?: string;
  note?: string;
  food_name?: string;
  brand_name?: string;
  serving_size?: string;
  serving_unit?: string;
  calories_per_serving?: string;
  protein_per_serving_g?: string;
  carbohydrate_per_serving_g?: string;
  fat_per_serving_g?: string;
  fiber_per_serving_g?: string;
}

export interface FoodEntryEditActionInput {
  entry_date: string;
  meal_type: string;
  servings?: string;
  note?: string;
}

export interface CatalogFoodEntryActionInput {
  catalog_food_id: string;
  amount_value: string;
  amount_unit: string;
  entry_date: string;
  meal_type: string;
  note?: string;
}

export interface CatalogFoodEntryEditActionInput {
  amount_value: string;
  amount_unit: string;
  entry_date: string;
  meal_type: string;
  note?: string;
}

function revalidateNutritionViews() {
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/foods");
}

function normalizeCatalogFoodEntryInput(
  input: CatalogFoodEntryActionInput | CatalogFoodEntryEditActionInput,
): {
  data: {
    amount_value: number;
    amount_unit: SupportedAmountUnit;
  } | null;
  errors: CatalogFoodEntryFormErrors;
} {
  const errors: CatalogFoodEntryFormErrors = {};
  let amountValue: number | null = null;
  let amountUnit: SupportedAmountUnit | null = null;

  try {
    amountValue = parseAmountValue(input.amount_value);
  } catch (error) {
    errors.amount_value = error instanceof Error ? error.message : "Amount must be greater than 0.";
  }

  try {
    amountUnit = parseAmountUnit(input.amount_unit);
  } catch (error) {
    errors.amount_unit = error instanceof Error ? error.message : "Unsupported amount unit.";
  }

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      amount_value: amountValue!,
      amount_unit: amountUnit!,
    },
    errors: {},
  };
}

export async function createSavedFoodAction(input: SavedFoodActionInput): Promise<SavedFoodActionResult> {
  const normalized = normalizeSavedFoodInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: normalized.errors,
      food: null,
    };
  }

  const result = await createMyFood(normalized.data);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      food: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Saved food created.",
    errors: {},
    food: result.data,
  };
}

export async function updateSavedFoodAction(foodId: string, input: SavedFoodActionInput): Promise<SavedFoodActionResult> {
  const normalized = normalizeSavedFoodInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: normalized.errors,
      food: null,
    };
  }

  const result = await updateMyFood(foodId, normalized.data);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      food: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Saved food updated.",
    errors: {},
    food: result.data,
  };
}

export async function deleteSavedFoodAction(foodId: string): Promise<BaseActionResult> {
  const result = await deleteMyFood(foodId);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Saved food deleted.",
  };
}

export async function createFoodEntryAction(input: FoodEntryActionInput): Promise<FoodEntryActionResult> {
  const baseValidation = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: input.servings,
    note: input.note,
  });

  if (!baseValidation.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: baseValidation.errors,
      entry: null,
    };
  }

  const payload: CreateMyFoodEntryInput = {
    entry_date: baseValidation.data.entry_date,
    meal_type: baseValidation.data.meal_type,
    servings: baseValidation.data.servings,
    note: baseValidation.data.note,
  };

  if (input.mode === "saved") {
    if (!input.food_id) {
      return {
        status: "error",
        message: "Select a saved food first.",
        errors: { food_id: "Select a saved food." },
        entry: null,
      };
    }
    payload.food_id = input.food_id;
  } else {
    const snapshotValidation = normalizeFoodEntrySnapshotInput({
      food_name: input.food_name ?? "",
      brand_name: input.brand_name ?? null,
      serving_size: input.serving_size ?? "",
      serving_unit: input.serving_unit ?? "",
      calories_per_serving: input.calories_per_serving ?? "",
      protein_per_serving_g: input.protein_per_serving_g ?? "",
      carbohydrate_per_serving_g: input.carbohydrate_per_serving_g ?? "",
      fat_per_serving_g: input.fat_per_serving_g ?? "",
      fiber_per_serving_g: input.fiber_per_serving_g ?? "",
    });

    if (!snapshotValidation.data) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        errors: snapshotValidation.errors,
        entry: null,
      };
    }

    payload.snapshot = snapshotValidation.data;
  }

  const result = await createMyFoodEntry(payload);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      entry: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Food entry logged.",
    errors: {},
    entry: result.data,
  };
}

export async function updateFoodEntryAction(
  entryId: string,
  input: FoodEntryEditActionInput,
): Promise<FoodEntryActionResult> {
  const baseValidation = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: input.servings,
    note: input.note,
  });

  if (!baseValidation.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors: baseValidation.errors,
      entry: null,
    };
  }

  const payload: UpdateMyFoodEntryInput = {
    entry_date: baseValidation.data.entry_date,
    meal_type: baseValidation.data.meal_type,
    servings: baseValidation.data.servings,
    note: baseValidation.data.note,
  };

  const result = await updateMyFoodEntry(entryId, payload);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      entry: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Food entry updated.",
    errors: {},
    entry: result.data,
  };
}

export async function deleteFoodEntryAction(entryId: string): Promise<BaseActionResult> {
  const result = await deleteMyFoodEntry(entryId);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Food entry deleted.",
  };
}

export async function createCatalogFoodEntryAction(
  input: CatalogFoodEntryActionInput,
): Promise<CatalogFoodEntryActionResult> {
  const baseValidation = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: 1,
    note: input.note,
  });
  const amountValidation = normalizeCatalogFoodEntryInput(input);

  const errors: CatalogFoodEntryFormErrors = {
    ...baseValidation.errors,
    ...amountValidation.errors,
  };

  const catalogFoodId = input.catalog_food_id?.trim();
  if (!catalogFoodId) {
    errors.catalog_food_id = "Select a common food.";
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(catalogFoodId)) {
    errors.catalog_food_id = "Select a valid common food.";
  }

  if (Object.keys(errors).length > 0 || !baseValidation.data || !amountValidation.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors,
      entry: null,
    };
  }

  const payload: CreateMyCatalogFoodEntryInput = {
    catalog_food_id: catalogFoodId!,
    entry_date: baseValidation.data.entry_date,
    meal_type: baseValidation.data.meal_type,
    note: baseValidation.data.note,
    amount_value: amountValidation.data.amount_value,
    amount_unit: amountValidation.data.amount_unit,
  };

  const result = await createMyCatalogFoodEntry(payload);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      entry: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Common food entry logged.",
    errors: {},
    entry: result.data,
  };
}

export async function updateCatalogFoodEntryAction(
  entryId: string,
  input: CatalogFoodEntryEditActionInput,
): Promise<CatalogFoodEntryActionResult> {
  const baseValidation = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: 1,
    note: input.note,
  });
  const amountValidation = normalizeCatalogFoodEntryInput(input);

  const errors: CatalogFoodEntryFormErrors = {
    ...baseValidation.errors,
    ...amountValidation.errors,
  };
  if (Object.keys(errors).length > 0 || !baseValidation.data || !amountValidation.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      errors,
      entry: null,
    };
  }

  const payload: UpdateMyCatalogFoodEntryInput = {
    entry_date: baseValidation.data.entry_date,
    meal_type: baseValidation.data.meal_type,
    note: baseValidation.data.note,
    amount_value: amountValidation.data.amount_value,
    amount_unit: amountValidation.data.amount_unit,
  };

  const result = await updateMyCatalogFoodEntry(entryId, payload);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      errors: {},
      entry: null,
    };
  }

  revalidateNutritionViews();
  return {
    status: "success",
    message: "Common food entry updated.",
    errors: {},
    entry: result.data,
  };
}

export async function searchCatalogFoodsAction(
  query: string,
  limit = 40,
): Promise<CatalogFoodSearchActionResult> {
  const result = await searchActiveFoodCatalog(query, { limit });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      foods: [],
    };
  }

  return {
    status: "success",
    message: "Common foods loaded.",
    foods: result.data,
  };
}
