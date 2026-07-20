import type { Database } from "@/types/database";

import { getAuthenticatedContext, type FoodRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import {
  normalizeSavedFoodInput,
  type SavedFoodInput,
  type SavedFoodNormalized,
} from "@/lib/nutrition/validation";

type FoodInsert = Database["public"]["Tables"]["foods"]["Insert"];
type FoodUpdate = Database["public"]["Tables"]["foods"]["Update"];

export interface CreateMyFoodInput extends SavedFoodInput {}

export interface UpdateMyFoodInput {
  name?: string;
  brand?: string | null;
  serving_size?: number | string;
  serving_unit?: string;
  calories?: number | string;
  protein_g?: number | string;
  carbohydrate_g?: number | string;
  fat_g?: number | string;
  fiber_g?: number | string | null;
}

function toFoodPayload(normalized: SavedFoodNormalized, userId: string): FoodInsert {
  return {
    user_id: userId,
    name: normalized.name,
    brand: normalized.brand,
    serving_size: normalized.serving_size,
    serving_unit: normalized.serving_unit,
    calories: normalized.calories,
    protein_g: normalized.protein_g,
    carbohydrate_g: normalized.carbohydrate_g,
    fat_g: normalized.fat_g,
    fiber_g: normalized.fiber_g,
  };
}

function sanitizeLimit(limit: number, fallback = 20): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }

  return Math.min(limit, 100);
}

export async function getMyFoods(): Promise<DataAccessResult<FoodRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load saved foods.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function searchMyFoods(query: string, limit = 25): Promise<DataAccessResult<FoodRow[]>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return ok([]);
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 25);
  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to search saved foods.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyRecentFoods(limit = 20): Promise<DataAccessResult<FoodRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit);
  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent saved foods.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyFoodById(foodId: string): Promise<DataAccessResult<FoodRow | null>> {
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

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("id", foodId)
    .eq("user_id", user.id)
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

export async function createMyFood(input: CreateMyFoodInput): Promise<DataAccessResult<FoodRow>> {
  const normalized = normalizeSavedFoodInput(input);
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid saved food input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const payload = toFoodPayload(normalized.data, auth.data.user.id);
  const { data, error } = await auth.data.supabase.from("foods").insert(payload).select("*").single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create saved food.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function updateMyFood(foodId: string, input: UpdateMyFoodInput): Promise<DataAccessResult<FoodRow>> {
  if (!foodId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Food id is required.",
    });
  }

  const existingResult = await getMyFoodById(foodId);
  if (existingResult.error) {
    return existingResult;
  }

  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Saved food not found.",
    });
  }

  const existing = existingResult.data;
  const normalized = normalizeSavedFoodInput({
    name: input.name ?? existing.name,
    brand: input.brand ?? existing.brand,
    serving_size: input.serving_size ?? existing.serving_size,
    serving_unit: input.serving_unit ?? existing.serving_unit,
    calories: input.calories ?? existing.calories,
    protein_g: input.protein_g ?? existing.protein_g,
    carbohydrate_g: input.carbohydrate_g ?? existing.carbohydrate_g,
    fat_g: input.fat_g ?? existing.fat_g,
    fiber_g: input.fiber_g ?? existing.fiber_g,
  });

  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid saved food input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const payload: FoodUpdate = {
    name: normalized.data.name,
    brand: normalized.data.brand,
    serving_size: normalized.data.serving_size,
    serving_unit: normalized.data.serving_unit,
    calories: normalized.data.calories,
    protein_g: normalized.data.protein_g,
    carbohydrate_g: normalized.data.carbohydrate_g,
    fat_g: normalized.data.fat_g,
    fiber_g: normalized.data.fiber_g,
  };

  const { data, error } = await auth.data.supabase
    .from("foods")
    .update(payload)
    .eq("id", foodId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update saved food.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Saved food not found.",
    });
  }

  return ok(data);
}

export async function deleteMyFood(foodId: string): Promise<DataAccessResult<{ id: string }>> {
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
    .delete()
    .eq("id", foodId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete saved food.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Saved food not found.",
    });
  }

  return ok({ id: data.id });
}
