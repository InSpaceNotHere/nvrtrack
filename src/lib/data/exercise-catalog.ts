import { getAuthenticatedContext } from "./auth-context";
import { asLooseSupabaseClient } from "./untyped-supabase";
import { fail, ok, type DataAccessResult } from "./result";
import { filterCatalogExercises } from "@/lib/training/catalog";

export interface ExerciseCatalogRow {
  id: string;
  name: string;
  normalized_name: string;
  aliases: string[];
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  body_region: string | null;
  equipment: string;
  movement_pattern: string;
  muscle_metadata_version: number;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function sanitizeLimit(limit: number, fallback = 250): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, 1000);
}

function asCatalogRows(value: unknown): ExerciseCatalogRow[] {
  return Array.isArray(value) ? (value as ExerciseCatalogRow[]) : [];
}

function asCatalogRow(value: unknown): ExerciseCatalogRow | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as ExerciseCatalogRow;
}

export async function getExerciseCatalogById(exerciseCatalogId: string): Promise<DataAccessResult<ExerciseCatalogRow | null>> {
  if (!exerciseCatalogId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Catalog exercise id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercise_catalog")
    .select("*")
    .eq("id", exerciseCatalogId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load exercise catalog entry.",
      cause: error.message,
    });
  }

  return ok(asCatalogRow(data));
}

export async function getExerciseCatalog(options?: {
  query?: string;
  muscle?: string;
  body_region?: string;
  movement_pattern?: string;
  limit?: number;
}): Promise<DataAccessResult<ExerciseCatalogRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(options?.limit ?? 250);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const query = supabase
    .from("exercise_catalog")
    .select("*")
    .eq("is_active", true);

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load exercise catalog.",
      cause: error.message,
    });
  }

  const rows = asCatalogRows(data);
  const filtered = filterCatalogExercises(rows, {
    query: options?.query,
    muscle: options?.muscle,
    body_region: options?.body_region,
    movement_pattern: options?.movement_pattern,
  });

  return ok(filtered);
}

export async function getRecentlyUsedCatalogExerciseIds(limit = 12): Promise<DataAccessResult<string[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 12);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("catalog_exercise_id,created_at")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent catalog exercise usage.",
      cause: error.message,
    });
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of (Array.isArray(data) ? data : []) as Array<{ catalog_exercise_id: string | null }>) {
    if (!row.catalog_exercise_id) {
      continue;
    }
    if (seen.has(row.catalog_exercise_id)) {
      continue;
    }
    seen.add(row.catalog_exercise_id);
    ids.push(row.catalog_exercise_id);
    if (ids.length >= safeLimit) {
      break;
    }
  }

  return ok(ids);
}

export async function getFrequentCatalogExerciseIds(limit = 12): Promise<DataAccessResult<string[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 12);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("catalog_exercise_id")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load frequent catalog exercise usage.",
      cause: error.message,
    });
  }

  const counts = new Map<string, number>();
  for (const row of (Array.isArray(data) ? data : []) as Array<{ catalog_exercise_id: string | null }>) {
    if (!row.catalog_exercise_id) {
      continue;
    }
    counts.set(row.catalog_exercise_id, (counts.get(row.catalog_exercise_id) ?? 0) + 1);
  }

  return ok(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, safeLimit)
      .map(([id]) => id),
  );
}
