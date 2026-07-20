import { getAuthenticatedContext, type FoodCatalogRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { rankCatalogSearchItems } from "@/lib/nutrition/catalog-search";

function sanitizeLimit(limit: number, fallback = 40): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, 200);
}

export async function getActiveFoodCatalog(limit = 80): Promise<DataAccessResult<FoodCatalogRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 80);
  const { data, error } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("is_active", true)
    .order("normalized_name", { ascending: true })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load common food catalog.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getActiveFoodCatalogById(catalogFoodId: string): Promise<DataAccessResult<FoodCatalogRow | null>> {
  if (!catalogFoodId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Catalog food id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { data, error } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("id", catalogFoodId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load common food details.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getMyRecentCatalogFdcIds(limit = 40): Promise<DataAccessResult<number[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 40);
  const { data, error } = await auth.data.supabase
    .from("food_entries")
    .select("fdc_id")
    .eq("user_id", auth.data.user.id)
    .eq("source_status", "usda_catalog")
    .not("fdc_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent catalog usage.",
      cause: error.message,
    });
  }

  const fdcIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.fdc_id)
        .filter((fdcId): fdcId is number => typeof fdcId === "number"),
    ),
  );
  return ok(fdcIds);
}

export async function searchActiveFoodCatalog(
  query: string,
  options: { limit?: number; recentFdcIds?: number[] } = {},
): Promise<DataAccessResult<FoodCatalogRow[]>> {
  const listResult = await getActiveFoodCatalog(200);
  if (listResult.error) {
    return listResult;
  }

  const ranked = rankCatalogSearchItems(
    listResult.data.map((row) => ({
      id: row.id,
      fdc_id: row.fdc_id,
      normalized_name: row.normalized_name,
      description: row.description,
      aliases: row.aliases,
    })),
    query,
    {
      limit: options.limit ?? 40,
      recentFdcIds: options.recentFdcIds ?? [],
    },
  );

  const byId = new Map(listResult.data.map((row) => [row.id, row]));
  const rows = ranked
    .map((item) => byId.get(item.id))
    .filter((row): row is FoodCatalogRow => row !== undefined);
  return ok(rows);
}
