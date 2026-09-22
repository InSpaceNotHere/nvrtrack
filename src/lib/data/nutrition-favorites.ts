import type { Database } from "@/types/database";

import { getAuthenticatedContext, type NutritionFoodFavoriteRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import {
  getLogicalFoodIdentity,
  type LogicalFoodIdentity,
} from "@/lib/nutrition/food-identity";
import type { FavoriteRecord } from "@/lib/nutrition/personal-foods";

type FavoriteInsert = Database["public"]["Tables"]["nutrition_food_favorites"]["Insert"];

function isMissingTableError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  return (
    message.includes("nutrition_food_favorites") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("42P01"))
  );
}

function rowToFavorite(row: NutritionFoodFavoriteRow): FavoriteRecord {
  const identity = getLogicalFoodIdentity({
    catalog_food_id: row.catalog_food_id,
    food_id: row.food_id,
    food_name: row.snapshot_key,
    source_description: row.identity_type === "snapshot" ? row.snapshot_key : null,
  });
  if (row.identity_type === "snapshot" && row.snapshot_key) {
    return {
      identity: {
        type: "snapshot",
        key: `snapshot:${row.snapshot_key}`,
        catalogFoodId: null,
        foodId: null,
        snapshotKey: row.snapshot_key,
      },
      createdAt: row.created_at,
    };
  }
  return { identity, createdAt: row.created_at };
}

function payloadFromIdentity(identity: LogicalFoodIdentity): FavoriteInsert | null {
  if (identity.type === "catalog" && identity.catalogFoodId) {
    return {
      identity_type: "catalog",
      catalog_food_id: identity.catalogFoodId,
      food_id: null,
      snapshot_key: null,
    };
  }
  if (identity.type === "saved" && identity.foodId) {
    return {
      identity_type: "saved",
      catalog_food_id: null,
      food_id: identity.foodId,
      snapshot_key: null,
    };
  }
  if (identity.type === "snapshot" && identity.snapshotKey) {
    return {
      identity_type: "snapshot",
      catalog_food_id: null,
      food_id: null,
      snapshot_key: identity.snapshotKey,
    };
  }
  return null;
}

export function parseFavoriteIdentityInput(input: {
  identity_type?: string;
  catalog_food_id?: string | null;
  food_id?: string | null;
  snapshot_key?: string | null;
}): LogicalFoodIdentity | null {
  const type = input.identity_type;
  if (type !== "catalog" && type !== "saved" && type !== "snapshot") {
    return null;
  }
  const identity = getLogicalFoodIdentity({
    catalog_food_id: type === "catalog" ? input.catalog_food_id : null,
    food_id: type === "saved" ? input.food_id : null,
    food_name: type === "snapshot" ? input.snapshot_key : null,
    source_description: type === "snapshot" ? input.snapshot_key : null,
  });
  if (type === "snapshot") {
    const snapshotKey = input.snapshot_key?.trim() || null;
    if (!snapshotKey) {
      return null;
    }
    return {
      type: "snapshot",
      key: `snapshot:${snapshotKey}`,
      catalogFoodId: null,
      foodId: null,
      snapshotKey,
    };
  }
  if (identity.type !== type) {
    return null;
  }
  return identity;
}

export async function listMyNutritionFoodFavorites(): Promise<DataAccessResult<FavoriteRecord[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("nutrition_food_favorites")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error.message)) {
      return ok([]);
    }
    return fail({
      code: "DB_ERROR",
      message: "Failed to load favorite foods.",
      cause: error.message,
    });
  }

  return ok((data ?? []).map(rowToFavorite));
}

export async function addMyNutritionFoodFavorite(
  identity: LogicalFoodIdentity,
): Promise<DataAccessResult<FavoriteRecord>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const payload = payloadFromIdentity(identity);
  if (!payload) {
    return fail({
      code: "INVALID_INPUT",
      message: "Favorite identity is invalid.",
    });
  }

  const { data, error } = await auth.data.supabase
    .from("nutrition_food_favorites")
    .insert({
      ...payload,
      user_id: auth.data.user.id,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const existing = await listMyNutritionFoodFavorites();
      if (existing.error) {
        return existing;
      }
      const match = existing.data.find((row) => row.identity.key === identity.key);
      if (match) {
        return ok(match);
      }
    }
    return fail({
      code: "DB_ERROR",
      message: isMissingTableError(error.message)
        ? "Favorites are waiting on the nutrition_food_favorites migration."
        : "Failed to save favorite.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to save favorite.",
    });
  }

  return ok(rowToFavorite(data));
}

export async function removeMyNutritionFoodFavorite(identity: LogicalFoodIdentity): Promise<DataAccessResult<true>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  let query = auth.data.supabase.from("nutrition_food_favorites").delete().eq("user_id", auth.data.user.id);

  if (identity.type === "catalog" && identity.catalogFoodId) {
    query = query.eq("catalog_food_id", identity.catalogFoodId);
  } else if (identity.type === "saved" && identity.foodId) {
    query = query.eq("food_id", identity.foodId);
  } else if (identity.type === "snapshot" && identity.snapshotKey) {
    query = query.eq("snapshot_key", identity.snapshotKey);
  } else {
    return fail({
      code: "INVALID_INPUT",
      message: "Favorite identity is invalid.",
    });
  }

  const { error } = await query;
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: isMissingTableError(error.message)
        ? "Favorites are waiting on the nutrition_food_favorites migration."
        : "Failed to remove favorite.",
      cause: error.message,
    });
  }

  return ok(true);
}
