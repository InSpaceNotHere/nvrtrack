import { getAuthenticatedContext } from "./auth-context";
import { asLooseSupabaseClient } from "./untyped-supabase";
import { fail, ok, type DataAccessResult } from "./result";
import {
  normalizeExerciseInput,
  type ExerciseInput,
} from "@/lib/training/validation";
import type { ExerciseRow } from "@/lib/training/types";

export type CreateMyExerciseInput = ExerciseInput;

export interface UpdateMyExerciseInput {
  name?: string;
  muscle_group?: string | null;
  equipment?: string | null;
  notes?: string | null;
}

function sanitizeLimit(limit: number, fallback = 20): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }

  return Math.min(limit, 100);
}

function asExerciseRows(value: unknown): ExerciseRow[] {
  return Array.isArray(value) ? (value as ExerciseRow[]) : [];
}

function asExerciseRow(value: unknown): ExerciseRow | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as ExerciseRow;
}

export async function getMyExercises(): Promise<DataAccessResult<ExerciseRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("name", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load exercises.",
      cause: error.message,
    });
  }

  return ok(asExerciseRows(data));
}

export async function searchMyExercises(query: string, limit = 25): Promise<DataAccessResult<ExerciseRow[]>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return ok([]);
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit, 25);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .or(`name.ilike.%${trimmed}%,muscle_group.ilike.%${trimmed}%,equipment.ilike.%${trimmed}%`)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to search exercises.",
      cause: error.message,
    });
  }

  return ok(asExerciseRows(data));
}

export async function getMyRecentExercises(limit = 20): Promise<DataAccessResult<ExerciseRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent exercises.",
      cause: error.message,
    });
  }

  return ok(asExerciseRows(data));
}

export async function getMyExerciseById(exerciseId: string): Promise<DataAccessResult<ExerciseRow | null>> {
  if (!exerciseId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Exercise id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load exercise.",
      cause: error.message,
    });
  }

  return ok(asExerciseRow(data));
}

export async function createMyExercise(input: CreateMyExerciseInput): Promise<DataAccessResult<ExerciseRow>> {
  const normalized = normalizeExerciseInput(input);
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid exercise input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: auth.data.user.id,
      name: normalized.data.name,
      muscle_group: normalized.data.muscle_group,
      equipment: normalized.data.equipment,
      notes: normalized.data.notes,
    })
    .select("*")
    .single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create exercise.",
      cause: error.message,
    });
  }

  const created = asExerciseRow(data);
  if (!created) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create exercise.",
    });
  }

  return ok(created);
}

export async function updateMyExercise(
  exerciseId: string,
  input: UpdateMyExerciseInput,
): Promise<DataAccessResult<ExerciseRow>> {
  if (!exerciseId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Exercise id is required.",
    });
  }

  const existingResult = await getMyExerciseById(exerciseId);
  if (existingResult.error) {
    return existingResult;
  }
  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Exercise not found.",
    });
  }

  const existing = existingResult.data;
  const normalized = normalizeExerciseInput({
    name: input.name ?? existing.name,
    muscle_group: input.muscle_group ?? existing.muscle_group,
    equipment: input.equipment ?? existing.equipment,
    notes: input.notes ?? existing.notes,
  });

  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid exercise input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .update({
      name: normalized.data.name,
      muscle_group: normalized.data.muscle_group,
      equipment: normalized.data.equipment,
      notes: normalized.data.notes,
    })
    .eq("id", exerciseId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update exercise.",
      cause: error.message,
    });
  }

  const updated = asExerciseRow(data);
  if (!updated) {
    return fail({
      code: "NOT_FOUND",
      message: "Exercise not found.",
    });
  }

  return ok(updated);
}

export async function deleteMyExercise(exerciseId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!exerciseId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Exercise id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete exercise.",
      cause: error.message,
    });
  }

  const deleted = data as { id: string } | null;
  if (!deleted) {
    return fail({
      code: "NOT_FOUND",
      message: "Exercise not found.",
    });
  }

  return ok({ id: deleted.id });
}
