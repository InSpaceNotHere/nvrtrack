import type { Database } from "@/types/database";

import { getAuthenticatedContext, type FoodEntryRow, type FoodRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import {
  normalizeFoodEntryBaseInput,
  normalizeFoodEntrySnapshotInput,
  type FoodEntryBaseInput,
  type FoodEntrySnapshotInput,
  type FoodEntrySnapshotNormalized,
} from "@/lib/nutrition/validation";
import { isValidDateString } from "@/lib/nutrition/date";
import {
  buildCatalogSourceMetadataSnapshot,
  calculateCatalogEntrySnapshot,
  recalculateCatalogEntryFromSnapshot,
} from "@/lib/nutrition/catalog-entry";
import type { SupportedAmountUnit } from "@/lib/nutrition/serving";
import { getActiveFoodCatalogById } from "./food-catalog";

type FoodEntryInsert = Database["public"]["Tables"]["food_entries"]["Insert"];
type FoodEntryUpdate = Database["public"]["Tables"]["food_entries"]["Update"];

export interface CreateMyFoodEntryInput extends FoodEntryBaseInput {
  food_id?: string | null;
  snapshot?: FoodEntrySnapshotInput;
}

export interface UpdateMyFoodEntryInput extends Partial<FoodEntryBaseInput> {
  food_id?: string | null;
  snapshot?: FoodEntrySnapshotInput;
}

export interface CreateMyCatalogFoodEntryInput extends Pick<FoodEntryBaseInput, "entry_date" | "meal_type" | "note"> {
  catalog_food_id: string;
  amount_value: number;
  amount_unit: SupportedAmountUnit;
}

export interface UpdateMyCatalogFoodEntryInput extends Pick<FoodEntryBaseInput, "entry_date" | "meal_type" | "note"> {
  amount_value: number;
  amount_unit: SupportedAmountUnit;
}

function sanitizeLimit(limit: number, fallback = 20): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }

  return Math.min(limit, 100);
}

function snapshotFromFood(food: FoodRow): FoodEntrySnapshotNormalized {
  return {
    food_name: food.name,
    brand_name: food.brand,
    serving_size: food.serving_size,
    serving_unit: food.serving_unit,
    calories_per_serving: food.calories,
    protein_per_serving_g: food.protein_g,
    carbohydrate_per_serving_g: food.carbohydrate_g,
    fat_per_serving_g: food.fat_g,
    fiber_per_serving_g: food.fiber_g,
  };
}

async function getOwnedFoodById(foodId: string): Promise<DataAccessResult<FoodRow | null>> {
  if (!foodId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Food id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("foods")
    .select("*")
    .eq("id", foodId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load saved food.",
      cause: error.message,
    });
  }

  return ok(data);
}

async function getOwnedFoodEntryById(entryId: string): Promise<DataAccessResult<FoodEntryRow | null>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load food entry.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyFoodEntriesForDate(entryDate: string): Promise<DataAccessResult<FoodEntryRow[]>> {
  if (!isValidDateString(entryDate)) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry date must be valid.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("entry_date", entryDate)
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load food entries.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyFoodEntriesForDateRange(
  startDate: string,
  endDate: string,
): Promise<DataAccessResult<FoodEntryRow[]>> {
  if (!isValidDateString(startDate) || !isValidDateString(endDate) || startDate > endDate) {
    return fail({
      code: "INVALID_INPUT",
      message: "Date range is invalid.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load food entries for date range.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyRecentFoodEntries(limit = 20): Promise<DataAccessResult<FoodEntryRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit);
  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent food entries.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function createMyFoodEntry(input: CreateMyFoodEntryInput): Promise<DataAccessResult<FoodEntryRow>> {
  const base = normalizeFoodEntryBaseInput(input);
  if (!base.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(base.errors)[0] ?? "Invalid food entry input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  let snapshot: FoodEntrySnapshotNormalized | null = null;
  let foodId: string | null = null;

  if (input.food_id) {
    const foodResult = await getOwnedFoodById(input.food_id);
    if (foodResult.error) {
      return foodResult;
    }
    if (!foodResult.data) {
      return fail({
        code: "NOT_FOUND",
        message: "Saved food not found.",
      });
    }

    foodId = foodResult.data.id;
    snapshot = snapshotFromFood(foodResult.data);
  } else {
    if (!input.snapshot) {
      return fail({
        code: "INVALID_INPUT",
        message: "Snapshot nutrition fields are required for custom entries.",
      });
    }
    const normalizedSnapshot = normalizeFoodEntrySnapshotInput(input.snapshot);
    if (!normalizedSnapshot.data) {
      return fail({
        code: "INVALID_INPUT",
        message: Object.values(normalizedSnapshot.errors)[0] ?? "Invalid entry snapshot values.",
      });
    }

    snapshot = normalizedSnapshot.data;
  }

  const payload: FoodEntryInsert = {
    user_id: auth.data.user.id,
    food_id: foodId,
    entry_date: base.data.entry_date,
    meal_type: base.data.meal_type,
    servings: base.data.servings,
    note: base.data.note,
    food_name: snapshot.food_name,
    brand_name: snapshot.brand_name,
    serving_size: snapshot.serving_size,
    serving_unit: snapshot.serving_unit,
    calories_per_serving: snapshot.calories_per_serving,
    protein_per_serving_g: snapshot.protein_per_serving_g,
    carbohydrate_per_serving_g: snapshot.carbohydrate_per_serving_g,
    fat_per_serving_g: snapshot.fat_per_serving_g,
    fiber_per_serving_g: snapshot.fiber_per_serving_g,
  };

  const { data, error } = await auth.data.supabase.from("food_entries").insert(payload).select("*").single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create food entry.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function updateMyFoodEntry(
  entryId: string,
  input: UpdateMyFoodEntryInput,
): Promise<DataAccessResult<FoodEntryRow>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const existingResult = await getOwnedFoodEntryById(entryId);
  if (existingResult.error) {
    return existingResult;
  }

  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Food entry not found.",
    });
  }

  const existing = existingResult.data;
  const base = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date ?? existing.entry_date,
    meal_type: input.meal_type ?? existing.meal_type,
    servings: input.servings ?? existing.servings,
    note: input.note === undefined ? existing.note : input.note,
  });

  if (!base.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(base.errors)[0] ?? "Invalid food entry input.",
    });
  }

  let nextFoodId: string | null = existing.food_id;
  let nextSnapshot: FoodEntrySnapshotNormalized = {
    food_name: existing.food_name,
    brand_name: existing.brand_name,
    serving_size: existing.serving_size,
    serving_unit: existing.serving_unit,
    calories_per_serving: existing.calories_per_serving,
    protein_per_serving_g: existing.protein_per_serving_g,
    carbohydrate_per_serving_g: existing.carbohydrate_per_serving_g,
    fat_per_serving_g: existing.fat_per_serving_g,
    fiber_per_serving_g: existing.fiber_per_serving_g,
  };

  if (input.food_id !== undefined) {
    if (input.food_id === null) {
      nextFoodId = null;
      if (input.snapshot) {
        const normalizedSnapshot = normalizeFoodEntrySnapshotInput(input.snapshot);
        if (!normalizedSnapshot.data) {
          return fail({
            code: "INVALID_INPUT",
            message: Object.values(normalizedSnapshot.errors)[0] ?? "Invalid entry snapshot values.",
          });
        }
        nextSnapshot = normalizedSnapshot.data;
      }
    } else {
      const foodResult = await getOwnedFoodById(input.food_id);
      if (foodResult.error) {
        return foodResult;
      }
      if (!foodResult.data) {
        return fail({
          code: "NOT_FOUND",
          message: "Saved food not found.",
        });
      }

      nextFoodId = foodResult.data.id;
      nextSnapshot = snapshotFromFood(foodResult.data);
    }
  } else if (input.snapshot) {
    const normalizedSnapshot = normalizeFoodEntrySnapshotInput(input.snapshot);
    if (!normalizedSnapshot.data) {
      return fail({
        code: "INVALID_INPUT",
        message: Object.values(normalizedSnapshot.errors)[0] ?? "Invalid entry snapshot values.",
      });
    }
    nextFoodId = null;
    nextSnapshot = normalizedSnapshot.data;
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const payload: FoodEntryUpdate = {
    food_id: nextFoodId,
    entry_date: base.data.entry_date,
    meal_type: base.data.meal_type,
    servings: base.data.servings,
    note: base.data.note,
    food_name: nextSnapshot.food_name,
    brand_name: nextSnapshot.brand_name,
    serving_size: nextSnapshot.serving_size,
    serving_unit: nextSnapshot.serving_unit,
    calories_per_serving: nextSnapshot.calories_per_serving,
    protein_per_serving_g: nextSnapshot.protein_per_serving_g,
    carbohydrate_per_serving_g: nextSnapshot.carbohydrate_per_serving_g,
    fat_per_serving_g: nextSnapshot.fat_per_serving_g,
    fiber_per_serving_g: nextSnapshot.fiber_per_serving_g,
  };

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .update(payload)
    .eq("id", entryId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update food entry.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Food entry not found.",
    });
  }

  return ok(data);
}

export async function deleteMyFoodEntry(entryId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete food entry.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Food entry not found.",
    });
  }

  return ok({ id: data.id });
}

export async function createMyCatalogFoodEntry(
  input: CreateMyCatalogFoodEntryInput,
): Promise<DataAccessResult<FoodEntryRow>> {
  if (!input.catalog_food_id) {
    return fail({
      code: "INVALID_INPUT",
      message: "Catalog food id is required.",
    });
  }

  const base = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: 1,
    note: input.note,
  });
  if (!base.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(base.errors)[0] ?? "Invalid food entry input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const catalogResult = await getActiveFoodCatalogById(input.catalog_food_id);
  if (catalogResult.error) {
    return catalogResult;
  }
  if (!catalogResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Selected common food is unavailable.",
    });
  }

  let calculatedSnapshot;
  try {
    calculatedSnapshot = calculateCatalogEntrySnapshot(catalogResult.data, {
      amountValue: input.amount_value,
      amountUnit: input.amount_unit,
    });
  } catch (error) {
    return fail({
      code: "INVALID_INPUT",
      message: error instanceof Error ? error.message : "Invalid catalog amount input.",
    });
  }

  const sourceSnapshot = buildCatalogSourceMetadataSnapshot(catalogResult.data);

  const payload: FoodEntryInsert = {
    user_id: auth.data.user.id,
    food_id: null,
    entry_date: base.data.entry_date,
    meal_type: base.data.meal_type,
    servings: calculatedSnapshot.servings,
    note: base.data.note,
    food_name: catalogResult.data.description,
    brand_name: sourceSnapshot.source_brand,
    serving_size: calculatedSnapshot.serving_size,
    serving_unit: calculatedSnapshot.serving_unit,
    calories_per_serving: calculatedSnapshot.calories_per_serving,
    protein_per_serving_g: calculatedSnapshot.protein_per_serving_g,
    carbohydrate_per_serving_g: calculatedSnapshot.carbohydrate_per_serving_g,
    fat_per_serving_g: calculatedSnapshot.fat_per_serving_g,
    fiber_per_serving_g: calculatedSnapshot.fiber_per_serving_g,
    catalog_food_id: sourceSnapshot.catalog_food_id,
    fdc_id: sourceSnapshot.fdc_id,
    source_status: sourceSnapshot.source_status,
    source_name: sourceSnapshot.source_name,
    source_data_type: sourceSnapshot.source_data_type,
    source_description: sourceSnapshot.source_description,
    source_brand: sourceSnapshot.source_brand,
    source_gtin_upc: sourceSnapshot.source_gtin_upc,
    source_retrieved_at: sourceSnapshot.source_retrieved_at,
    amount_value: calculatedSnapshot.amount_value,
    amount_unit: calculatedSnapshot.amount_unit,
    amount_grams: calculatedSnapshot.amount_grams,
    source_serving_quantity: calculatedSnapshot.source_serving_quantity,
    source_serving_unit: calculatedSnapshot.source_serving_unit,
    source_serving_weight_grams: calculatedSnapshot.source_serving_weight_grams,
    calories_per_100g: sourceSnapshot.calories_per_100g,
    protein_g_per_100g: sourceSnapshot.protein_g_per_100g,
    carbohydrate_g_per_100g: sourceSnapshot.carbohydrate_g_per_100g,
    fat_g_per_100g: sourceSnapshot.fat_g_per_100g,
    fiber_g_per_100g: sourceSnapshot.fiber_g_per_100g,
    sugar_g_per_100g: sourceSnapshot.sugar_g_per_100g,
    sodium_mg_per_100g: sourceSnapshot.sodium_mg_per_100g,
  };

  const { data, error } = await auth.data.supabase.from("food_entries").insert(payload).select("*").single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create food entry.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function updateMyCatalogFoodEntry(
  entryId: string,
  input: UpdateMyCatalogFoodEntryInput,
): Promise<DataAccessResult<FoodEntryRow>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const existingResult = await getOwnedFoodEntryById(entryId);
  if (existingResult.error) {
    return existingResult;
  }
  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Food entry not found.",
    });
  }

  if (existingResult.data.source_status !== "usda_catalog") {
    return fail({
      code: "INVALID_INPUT",
      message: "Only common catalog entries can be updated with amount units.",
    });
  }

  const base = normalizeFoodEntryBaseInput({
    entry_date: input.entry_date,
    meal_type: input.meal_type,
    servings: 1,
    note: input.note,
  });
  if (!base.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(base.errors)[0] ?? "Invalid food entry input.",
    });
  }

  let calculatedSnapshot;
  try {
    calculatedSnapshot = recalculateCatalogEntryFromSnapshot(existingResult.data, {
      amountValue: input.amount_value,
      amountUnit: input.amount_unit,
    });
  } catch (error) {
    return fail({
      code: "INVALID_INPUT",
      message: error instanceof Error ? error.message : "Invalid catalog amount input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const payload: FoodEntryUpdate = {
    entry_date: base.data.entry_date,
    meal_type: base.data.meal_type,
    servings: calculatedSnapshot.servings,
    note: base.data.note,
    serving_size: calculatedSnapshot.serving_size,
    serving_unit: calculatedSnapshot.serving_unit,
    calories_per_serving: calculatedSnapshot.calories_per_serving,
    protein_per_serving_g: calculatedSnapshot.protein_per_serving_g,
    carbohydrate_per_serving_g: calculatedSnapshot.carbohydrate_per_serving_g,
    fat_per_serving_g: calculatedSnapshot.fat_per_serving_g,
    fiber_per_serving_g: calculatedSnapshot.fiber_per_serving_g,
    amount_value: calculatedSnapshot.amount_value,
    amount_unit: calculatedSnapshot.amount_unit,
    amount_grams: calculatedSnapshot.amount_grams,
    source_serving_quantity: calculatedSnapshot.source_serving_quantity,
    source_serving_unit: calculatedSnapshot.source_serving_unit,
    source_serving_weight_grams: calculatedSnapshot.source_serving_weight_grams,
  };

  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .update(payload)
    .eq("id", entryId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update food entry.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Food entry not found.",
    });
  }

  return ok(data);
}
