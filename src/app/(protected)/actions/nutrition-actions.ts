"use server";

import { revalidatePath } from "next/cache";

import {
  createMyFood,
  deleteMyFood,
  updateMyFood,
  type UpdateMyFoodInput,
} from "@/lib/data/foods";
import {
  createMyFoodEntry,
  deleteMyFoodEntry,
  updateMyFoodEntry,
  type CreateMyFoodEntryInput,
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
import type { FoodEntryRow, FoodRow } from "@/lib/data/auth-context";

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

function revalidateNutritionViews() {
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/foods");
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

export async function updateSavedFoodAction(foodId: string, input: UpdateMyFoodInput): Promise<SavedFoodActionResult> {
  const result = await updateMyFood(foodId, input);
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
