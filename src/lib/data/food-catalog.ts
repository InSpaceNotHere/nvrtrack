import { getAuthenticatedContext, type AuthenticatedContext, type FoodCatalogRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { normalizeCatalogSearchText, rankCatalogSearchItems } from "@/lib/nutrition/catalog-search";

function sanitizeLimit(limit: number, fallback = 40): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, 200);
}

function uniqueRowsById(rows: FoodCatalogRow[]): FoodCatalogRow[] {
  const seen = new Set<string>();
  const deduped: FoodCatalogRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    deduped.push(row);
  }
  return deduped;
}

function sanitizeRecentFdcIds(value: number[]): number[] {
  const deduped = Array.from(
    new Set(
      value.filter((fdcId) => Number.isInteger(fdcId) && fdcId > 0),
    ),
  );
  return deduped.slice(0, 80);
}

async function getRecentCatalogFdcIdsForAuthenticatedUser(
  userId: string,
  supabase: AuthenticatedContext["supabase"],
  limit: number,
): Promise<DataAccessResult<number[]>> {
  const safeLimit = sanitizeLimit(limit, 40);
  const { data, error } = await supabase
    .from("food_entries")
    .select("fdc_id")
    .eq("user_id", userId)
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

  return ok(
    Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.fdc_id)
          .filter((fdcId): fdcId is number => typeof fdcId === "number"),
      ),
    ),
  );
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

export async function getFeaturedActiveFoodCatalog(options: {
  limit?: number;
  recentFdcIds?: number[];
} = {}): Promise<DataAccessResult<FoodCatalogRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(options.limit ?? 40, 40);
  const recentFdcIds = sanitizeRecentFdcIds(options.recentFdcIds ?? []);
  const recentOrder = new Map(recentFdcIds.map((fdcId, index) => [fdcId, index]));
  let recentRows: FoodCatalogRow[] = [];

  if (recentFdcIds.length > 0) {
    const { data, error } = await auth.data.supabase
      .from("food_catalog")
      .select("*")
      .eq("is_active", true)
      .in("fdc_id", recentFdcIds)
      .limit(Math.min(safeLimit, recentFdcIds.length));

    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to load recent common foods.",
        cause: error.message,
      });
    }

    recentRows = [...(data ?? [])].sort((left, right) => {
      const leftRank = recentOrder.get(left.fdc_id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = recentOrder.get(right.fdc_id) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.normalized_name.localeCompare(right.normalized_name);
    });
  }

  const fallbackLimit = Math.max(safeLimit * 2, safeLimit + 40);
  const { data: fallbackRows, error: fallbackError } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("is_active", true)
    .order("normalized_name", { ascending: true })
    .limit(fallbackLimit);

  if (fallbackError) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load featured common foods.",
      cause: fallbackError.message,
    });
  }

  const combined = uniqueRowsById([...(recentRows ?? []), ...((fallbackRows ?? []) as FoodCatalogRow[])]);
  return ok(combined.slice(0, safeLimit));
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

  return getRecentCatalogFdcIdsForAuthenticatedUser(auth.data.user.id, auth.data.supabase, limit);
}

function escapeForIlike(value: string): string {
  return value.replace(/[%_]/g, "");
}

export async function searchActiveFoodCatalog(
  query: string,
  options: { limit?: number } = {},
): Promise<DataAccessResult<FoodCatalogRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(options.limit ?? 40, 40);
  const recentFdcIdsResult = await getRecentCatalogFdcIdsForAuthenticatedUser(
    auth.data.user.id,
    auth.data.supabase,
    40,
  );
  if (recentFdcIdsResult.error) {
    return recentFdcIdsResult;
  }

  const normalizedQuery = normalizeCatalogSearchText(query);
  if (!normalizedQuery) {
    return getFeaturedActiveFoodCatalog({
      limit: safeLimit,
      recentFdcIds: recentFdcIdsResult.data,
    });
  }

  const candidateRows: FoodCatalogRow[] = [];
  const candidateIds = new Set<string>();
  const candidateCap = Math.max(120, safeLimit * 3);

  function appendCandidates(rows: FoodCatalogRow[] | null | undefined) {
    if (!rows?.length) {
      return;
    }
    for (const row of rows) {
      if (candidateIds.size >= candidateCap) {
        break;
      }
      if (candidateIds.has(row.id)) {
        continue;
      }
      candidateIds.add(row.id);
      candidateRows.push(row);
    }
  }

  const trimmedRawQuery = query.trim();
  if (/^\d{4,}$/.test(trimmedRawQuery)) {
    const fdcId = Number(trimmedRawQuery);
    const { data, error } = await auth.data.supabase
      .from("food_catalog")
      .select("*")
      .eq("is_active", true)
      .eq("fdc_id", fdcId)
      .limit(5);
    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to search common foods by FDC ID.",
        cause: error.message,
      });
    }
    appendCandidates(data);
  }

  const { data: exactNameRows, error: exactNameError } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("is_active", true)
    .eq("normalized_name", normalizedQuery)
    .limit(20);

  if (exactNameError) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to search common foods.",
      cause: exactNameError.message,
    });
  }
  appendCandidates(exactNameRows);

  const { data: exactAliasRows, error: exactAliasError } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("is_active", true)
    .contains("aliases", [normalizedQuery])
    .limit(40);

  if (exactAliasError) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to search common-food aliases.",
      cause: exactAliasError.message,
    });
  }
  appendCandidates(exactAliasRows);

  const likeQuery = `%${escapeForIlike(normalizedQuery)}%`;
  const { data: textRows, error: textError } = await auth.data.supabase
    .from("food_catalog")
    .select("*")
    .eq("is_active", true)
    .or(`normalized_name.ilike.${likeQuery},description.ilike.${likeQuery},brand_name.ilike.${likeQuery}`)
    .limit(candidateCap);

  if (textError) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to search common foods by text.",
      cause: textError.message,
    });
  }
  appendCandidates(textRows);

  const terms = normalizedQuery.split(" ").filter(Boolean).slice(0, 4);
  for (const term of terms) {
    if (candidateIds.size >= candidateCap) {
      break;
    }
    const likeTerm = `%${escapeForIlike(term)}%`;
    const { data: termRows, error: termError } = await auth.data.supabase
      .from("food_catalog")
      .select("*")
      .eq("is_active", true)
      .or(`normalized_name.ilike.${likeTerm},description.ilike.${likeTerm}`)
      .limit(60);
    if (termError) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to search common foods by keyword.",
        cause: termError.message,
      });
    }
    appendCandidates(termRows);
  }

  const ranked = rankCatalogSearchItems(
    candidateRows.map((row) => ({
      id: row.id,
      fdc_id: row.fdc_id,
      normalized_name: row.normalized_name,
      description: row.description,
      aliases: row.aliases,
    })),
    normalizedQuery,
    {
      limit: safeLimit,
      recentFdcIds: recentFdcIdsResult.data,
    },
  );

  const byId = new Map(candidateRows.map((row) => [row.id, row]));
  const rows = ranked
    .map((item) => byId.get(item.id))
    .filter((row): row is FoodCatalogRow => row !== undefined);
  return ok(rows);
}
