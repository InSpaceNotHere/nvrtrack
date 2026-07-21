import { getMyExerciseById } from "./exercises";
import { getExerciseCatalogById } from "./exercise-catalog";
import { getAuthenticatedContext } from "./auth-context";
import { asLooseSupabaseClient } from "./untyped-supabase";
import { fail, ok, type DataAccessResult } from "./result";
import {
  normalizeWorkoutExerciseInput,
  normalizeWorkoutInput,
  normalizeWorkoutSetInput,
  type WorkoutInput,
  type WorkoutSetInput,
} from "@/lib/training/validation";
import type {
  WorkoutExerciseRow,
  WorkoutRow,
  WorkoutSetRow,
} from "@/lib/training/types";
import { coerceMuscleIdArray, mapLegacyMuscleGroupToPrimaryMuscles } from "@/lib/training/muscles";
import { isValidDateString } from "@/lib/nutrition/date";

function sanitizeLimit(limit: number, fallback = 20): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }

  return Math.min(limit, 100);
}

function asWorkoutRows(value: unknown): WorkoutRow[] {
  return Array.isArray(value) ? (value as WorkoutRow[]) : [];
}

function asWorkoutRow(value: unknown): WorkoutRow | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as WorkoutRow;
}

function asWorkoutExerciseRows(value: unknown): WorkoutExerciseRow[] {
  return Array.isArray(value) ? (value as WorkoutExerciseRow[]) : [];
}

function asWorkoutExerciseRow(value: unknown): WorkoutExerciseRow | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as WorkoutExerciseRow;
}

function asWorkoutSetRows(value: unknown): WorkoutSetRow[] {
  return Array.isArray(value) ? (value as WorkoutSetRow[]) : [];
}

function asWorkoutSetRow(value: unknown): WorkoutSetRow | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as WorkoutSetRow;
}

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find the") && normalized.includes("column")) ||
    normalized.includes("schema cache")
  );
}

interface WorkoutExerciseMuscleSnapshot {
  source_primary_muscles: string[];
  source_secondary_muscles: string[];
  source_body_region: string | null;
  source_movement_pattern: string | null;
  source_muscle_metadata_version: number | null;
}

function emptyWorkoutExerciseMuscleSnapshot(): WorkoutExerciseMuscleSnapshot {
  return {
    source_primary_muscles: [],
    source_secondary_muscles: [],
    source_body_region: null,
    source_movement_pattern: null,
    source_muscle_metadata_version: null,
  };
}

function toWorkoutExerciseMuscleSnapshot(input: {
  primary_muscles: unknown;
  secondary_muscles: unknown;
  primary_muscle_group?: unknown;
  secondary_muscle_groups?: unknown;
  muscle_group?: unknown;
  body_region: unknown;
  movement_pattern: unknown;
  muscle_metadata_version: unknown;
}): WorkoutExerciseMuscleSnapshot {
  const primaryMusclesFromNewColumns = coerceMuscleIdArray(input.primary_muscles);
  const primaryMuscles =
    primaryMusclesFromNewColumns.length > 0
      ? primaryMusclesFromNewColumns
      : typeof input.primary_muscle_group === "string"
        ? mapLegacyMuscleGroupToPrimaryMuscles(input.primary_muscle_group)
        : typeof input.muscle_group === "string"
          ? mapLegacyMuscleGroupToPrimaryMuscles(input.muscle_group)
          : [];

  const secondaryMuscles = coerceMuscleIdArray(
    coerceMuscleIdArray(input.secondary_muscles).length
      ? input.secondary_muscles
      : input.secondary_muscle_groups,
  ).filter((muscle) => !primaryMuscles.includes(muscle));
  return {
    source_primary_muscles: primaryMuscles,
    source_secondary_muscles: secondaryMuscles,
    source_body_region: typeof input.body_region === "string" ? input.body_region : null,
    source_movement_pattern: typeof input.movement_pattern === "string" ? input.movement_pattern : null,
    source_muscle_metadata_version:
      typeof input.muscle_metadata_version === "number" ? input.muscle_metadata_version : 1,
  };
}

async function getOwnedWorkoutExerciseById(workoutExerciseId: string): Promise<DataAccessResult<WorkoutExerciseRow | null>> {
  if (!workoutExerciseId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout exercise id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("id", workoutExerciseId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout exercise.",
      cause: error.message,
    });
  }

  return ok(asWorkoutExerciseRow(data));
}

async function getOwnedWorkoutSetById(workoutSetId: string): Promise<DataAccessResult<WorkoutSetRow | null>> {
  if (!workoutSetId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout set id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("id", workoutSetId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout set.",
      cause: error.message,
    });
  }

  return ok(asWorkoutSetRow(data));
}

export async function getMyWorkouts(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<DataAccessResult<WorkoutRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  if (options?.startDate && !isValidDateString(options.startDate)) {
    return fail({
      code: "INVALID_INPUT",
      message: "Start date is invalid.",
    });
  }

  if (options?.endDate && !isValidDateString(options.endDate)) {
    return fail({
      code: "INVALID_INPUT",
      message: "End date is invalid.",
    });
  }

  if (options?.startDate && options?.endDate && options.startDate > options.endDate) {
    return fail({
      code: "INVALID_INPUT",
      message: "Date range is invalid.",
    });
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  let query = supabase
    .from("workouts")
    .select("*")
    .eq("user_id", auth.data.user.id);

  if (options?.startDate) {
    query = query.gte("workout_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("workout_date", options.endDate);
  }

  const { data, error } = await query
    .order("workout_date", { ascending: false })
    .order("started_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workouts.",
      cause: error.message,
    });
  }

  return ok(asWorkoutRows(data));
}

export async function getMyWorkoutById(workoutId: string): Promise<DataAccessResult<WorkoutRow | null>> {
  if (!workoutId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout.",
      cause: error.message,
    });
  }

  return ok(asWorkoutRow(data));
}

export async function getMyRecentWorkouts(limit = 20): Promise<DataAccessResult<WorkoutRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const safeLimit = sanitizeLimit(limit);
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load recent workouts.",
      cause: error.message,
    });
  }

  return ok(asWorkoutRows(data));
}

export async function createMyWorkout(input: WorkoutInput): Promise<DataAccessResult<WorkoutRow>> {
  const normalized = normalizeWorkoutInput(input);
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: auth.data.user.id,
      name: normalized.data.name,
      workout_date: normalized.data.workout_date,
      started_at: normalized.data.started_at,
      completed_at: normalized.data.completed_at,
      notes: normalized.data.notes,
    })
    .select("*")
    .single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create workout.",
      cause: error.message,
    });
  }

  const created = asWorkoutRow(data);
  if (!created) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create workout.",
    });
  }

  return ok(created);
}

export async function updateMyWorkout(
  workoutId: string,
  input: Partial<WorkoutInput>,
): Promise<DataAccessResult<WorkoutRow>> {
  if (!workoutId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout id is required.",
    });
  }

  const existingResult = await getMyWorkoutById(workoutId);
  if (existingResult.error) {
    return existingResult;
  }
  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  const existing = existingResult.data;
  const normalized = normalizeWorkoutInput({
    name: input.name ?? existing.name,
    workout_date: input.workout_date ?? existing.workout_date,
    started_at: input.started_at === undefined ? existing.started_at : input.started_at,
    completed_at: input.completed_at === undefined ? existing.completed_at : input.completed_at,
    notes: input.notes === undefined ? existing.notes : input.notes,
  });

  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workouts")
    .update({
      name: normalized.data.name,
      workout_date: normalized.data.workout_date,
      started_at: normalized.data.started_at,
      completed_at: normalized.data.completed_at,
      notes: normalized.data.notes,
    })
    .eq("id", workoutId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update workout.",
      cause: error.message,
    });
  }

  const updated = asWorkoutRow(data);
  if (!updated) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  return ok(updated);
}

export async function deleteMyWorkout(workoutId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!workoutId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete workout.",
      cause: error.message,
    });
  }

  const deleted = data as { id: string } | null;
  if (!deleted) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  return ok({ id: deleted.id });
}

export async function getMyWorkoutExercises(workoutId: string): Promise<DataAccessResult<WorkoutExerciseRow[]>> {
  if (!workoutId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout id is required.",
    });
  }

  const workoutResult = await getMyWorkoutById(workoutId);
  if (workoutResult.error) {
    return workoutResult;
  }
  if (!workoutResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("workout_id", workoutId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout exercises.",
      cause: error.message,
    });
  }

  return ok(asWorkoutExerciseRows(data));
}

export async function getMyWorkoutExercisesForWorkoutIds(
  workoutIds: string[],
): Promise<DataAccessResult<WorkoutExerciseRow[]>> {
  const uniqueIds = [...new Set(workoutIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return ok([]);
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .in("workout_id", uniqueIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout exercises.",
      cause: error.message,
    });
  }

  return ok(asWorkoutExerciseRows(data));
}

export async function addExerciseToWorkout(
  workoutId: string,
  input: {
    exercise_id?: string | null;
    catalog_exercise_id?: string | null;
    exercise_name?: string;
    position?: number | string;
    notes?: string | null;
  },
): Promise<DataAccessResult<WorkoutExerciseRow>> {
  const workoutResult = await getMyWorkoutById(workoutId);
  if (workoutResult.error) {
    return workoutResult;
  }
  if (!workoutResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  let exerciseId: string | null = null;
  let catalogExerciseId: string | null = null;
  let snapshotName = input.exercise_name?.trim() ?? "";
  let snapshotMetadata = emptyWorkoutExerciseMuscleSnapshot();

  if (input.exercise_id && input.catalog_exercise_id) {
    return fail({
      code: "INVALID_INPUT",
      message: "Only one exercise source can be selected.",
    });
  }

  if (input.exercise_id) {
    const exerciseResult = await getMyExerciseById(input.exercise_id);
    if (exerciseResult.error) {
      return exerciseResult;
    }
    if (!exerciseResult.data) {
      return fail({
        code: "NOT_FOUND",
        message: "Exercise not found.",
      });
    }
    exerciseId = exerciseResult.data.id;
    snapshotName = exerciseResult.data.name;
    snapshotMetadata = toWorkoutExerciseMuscleSnapshot(exerciseResult.data);
  }

  if (input.catalog_exercise_id) {
    const catalogResult = await getExerciseCatalogById(input.catalog_exercise_id);
    if (catalogResult.error) {
      return catalogResult;
    }
    if (!catalogResult.data) {
      return fail({
        code: "NOT_FOUND",
        message: "Catalog exercise not found.",
      });
    }

    catalogExerciseId = catalogResult.data.id;
    snapshotName = catalogResult.data.name;
    snapshotMetadata = toWorkoutExerciseMuscleSnapshot(catalogResult.data);
  }

  const existingResult = await getMyWorkoutExercises(workoutId);
  if (existingResult.error) {
    return existingResult;
  }
  const nextPosition =
    input.position === undefined
      ? existingResult.data.reduce((max, row) => Math.max(max, row.position), -1) + 1
      : input.position;

  const normalized = normalizeWorkoutExerciseInput({
    exercise_id: exerciseId,
    catalog_exercise_id: catalogExerciseId,
    exercise_name: snapshotName,
    position: nextPosition,
    notes: input.notes,
  });
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout exercise input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const insertPayload = {
    user_id: auth.data.user.id,
    workout_id: workoutId,
    exercise_id: normalized.data.exercise_id,
    catalog_exercise_id: normalized.data.catalog_exercise_id,
    exercise_name: normalized.data.exercise_name,
    position: normalized.data.position,
    notes: normalized.data.notes,
    source_primary_muscles: snapshotMetadata.source_primary_muscles,
    source_secondary_muscles: snapshotMetadata.source_secondary_muscles,
    source_body_region: snapshotMetadata.source_body_region,
    source_movement_pattern: snapshotMetadata.source_movement_pattern,
    source_muscle_metadata_version: snapshotMetadata.source_muscle_metadata_version,
  };
  let { data, error } = await supabase
    .from("workout_exercises")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error && isMissingColumnError(error.message)) {
    const legacyRetry = await supabase
      .from("workout_exercises")
      .insert({
        user_id: auth.data.user.id,
        workout_id: workoutId,
        exercise_id: normalized.data.exercise_id,
        catalog_exercise_id: normalized.data.catalog_exercise_id,
        exercise_name: normalized.data.exercise_name,
        position: normalized.data.position,
        notes: normalized.data.notes,
      })
      .select("*")
      .single();
    data = legacyRetry.data;
    error = legacyRetry.error;
  }

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to add exercise to workout.",
      cause: error.message,
    });
  }

  const created = asWorkoutExerciseRow(data);
  if (!created) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to add exercise to workout.",
    });
  }

  return ok(created);
}

export async function updateWorkoutExercise(
  workoutExerciseId: string,
  input: {
    exercise_id?: string | null;
    catalog_exercise_id?: string | null;
    exercise_name?: string;
    position?: number | string;
    notes?: string | null;
  },
): Promise<DataAccessResult<WorkoutExerciseRow>> {
  const existingResult = await getOwnedWorkoutExerciseById(workoutExerciseId);
  if (existingResult.error) {
    return existingResult;
  }
  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  const existing = existingResult.data;
  let exerciseId = existing.exercise_id;
  let catalogExerciseId = (existing as WorkoutExerciseRow & { catalog_exercise_id?: string | null }).catalog_exercise_id ?? null;
  let snapshotName = existing.exercise_name;
  let snapshotMetadata: WorkoutExerciseMuscleSnapshot = {
    source_primary_muscles: existing.source_primary_muscles ?? [],
    source_secondary_muscles: existing.source_secondary_muscles ?? [],
    source_body_region: existing.source_body_region ?? null,
    source_movement_pattern: existing.source_movement_pattern ?? null,
    source_muscle_metadata_version: existing.source_muscle_metadata_version ?? null,
  };

  if (input.exercise_id !== undefined && input.catalog_exercise_id !== undefined && input.exercise_id && input.catalog_exercise_id) {
    return fail({
      code: "INVALID_INPUT",
      message: "Only one exercise source can be selected.",
    });
  }

  if (input.exercise_id !== undefined) {
    if (input.exercise_id === null) {
      exerciseId = null;
      snapshotName = input.exercise_name?.trim() || snapshotName;
      if (!catalogExerciseId) {
        snapshotMetadata = emptyWorkoutExerciseMuscleSnapshot();
      }
    } else {
      const exerciseResult = await getMyExerciseById(input.exercise_id);
      if (exerciseResult.error) {
        return exerciseResult;
      }
      if (!exerciseResult.data) {
        return fail({
          code: "NOT_FOUND",
          message: "Exercise not found.",
        });
      }
      exerciseId = exerciseResult.data.id;
      catalogExerciseId = null;
      snapshotName = exerciseResult.data.name;
      snapshotMetadata = toWorkoutExerciseMuscleSnapshot(exerciseResult.data);
    }
  } else if (input.exercise_name && !exerciseId) {
    snapshotName = input.exercise_name.trim();
  }

  if (input.catalog_exercise_id !== undefined) {
    if (input.catalog_exercise_id === null) {
      catalogExerciseId = null;
      if (!exerciseId) {
        snapshotName = input.exercise_name?.trim() || snapshotName;
        snapshotMetadata = emptyWorkoutExerciseMuscleSnapshot();
      }
    } else {
      const catalogResult = await getExerciseCatalogById(input.catalog_exercise_id);
      if (catalogResult.error) {
        return catalogResult;
      }
      if (!catalogResult.data) {
        return fail({
          code: "NOT_FOUND",
          message: "Catalog exercise not found.",
        });
      }
      catalogExerciseId = catalogResult.data.id;
      exerciseId = null;
      snapshotName = catalogResult.data.name;
      snapshotMetadata = toWorkoutExerciseMuscleSnapshot(catalogResult.data);
    }
  }

  const normalized = normalizeWorkoutExerciseInput({
    exercise_id: exerciseId,
    catalog_exercise_id: catalogExerciseId,
    exercise_name: snapshotName,
    position: input.position ?? existing.position,
    notes: input.notes === undefined ? existing.notes : input.notes,
  });
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout exercise input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const updatePayload = {
    exercise_id: normalized.data.exercise_id,
    catalog_exercise_id: normalized.data.catalog_exercise_id,
    exercise_name: normalized.data.exercise_name,
    position: normalized.data.position,
    notes: normalized.data.notes,
    source_primary_muscles: snapshotMetadata.source_primary_muscles,
    source_secondary_muscles: snapshotMetadata.source_secondary_muscles,
    source_body_region: snapshotMetadata.source_body_region,
    source_movement_pattern: snapshotMetadata.source_movement_pattern,
    source_muscle_metadata_version: snapshotMetadata.source_muscle_metadata_version,
  };
  let { data, error } = await supabase
    .from("workout_exercises")
    .update(updatePayload)
    .eq("id", workoutExerciseId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error && isMissingColumnError(error.message)) {
    const legacyRetry = await supabase
      .from("workout_exercises")
      .update({
        exercise_id: normalized.data.exercise_id,
        catalog_exercise_id: normalized.data.catalog_exercise_id,
        exercise_name: normalized.data.exercise_name,
        position: normalized.data.position,
        notes: normalized.data.notes,
      })
      .eq("id", workoutExerciseId)
      .eq("user_id", auth.data.user.id)
      .select("*")
      .maybeSingle();
    data = legacyRetry.data;
    error = legacyRetry.error;
  }

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update workout exercise.",
      cause: error.message,
    });
  }

  const updated = asWorkoutExerciseRow(data);
  if (!updated) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  return ok(updated);
}

export async function reorderWorkoutExercises(
  workoutId: string,
  orderedWorkoutExerciseIds: string[],
): Promise<DataAccessResult<WorkoutExerciseRow[]>> {
  const existingResult = await getMyWorkoutExercises(workoutId);
  if (existingResult.error) {
    return existingResult;
  }

  const existing = existingResult.data;
  if (!existing.length) {
    return ok([]);
  }

  const uniqueIds = new Set(orderedWorkoutExerciseIds);
  const existingIds = new Set(existing.map((row) => row.id));
  const sameLength = orderedWorkoutExerciseIds.length === existing.length;
  const sameMembers =
    sameLength && [...existingIds].every((id) => uniqueIds.has(id)) && [...uniqueIds].every((id) => existingIds.has(id));

  if (!sameMembers) {
    return fail({
      code: "INVALID_INPUT",
      message: "Reorder list must include each workout exercise exactly once.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const baseOffset = 100000;

  for (let index = 0; index < orderedWorkoutExerciseIds.length; index += 1) {
    const exerciseId = orderedWorkoutExerciseIds[index];
    const { error } = await supabase
      .from("workout_exercises")
      .update({ position: baseOffset + index })
      .eq("id", exerciseId)
      .eq("user_id", auth.data.user.id)
      .eq("workout_id", workoutId);

    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to reorder workout exercises.",
        cause: error.message,
      });
    }
  }

  for (let index = 0; index < orderedWorkoutExerciseIds.length; index += 1) {
    const exerciseId = orderedWorkoutExerciseIds[index];
    const { error } = await supabase
      .from("workout_exercises")
      .update({ position: index })
      .eq("id", exerciseId)
      .eq("user_id", auth.data.user.id)
      .eq("workout_id", workoutId);

    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to reorder workout exercises.",
        cause: error.message,
      });
    }
  }

  return getMyWorkoutExercises(workoutId);
}

export async function removeWorkoutExercise(
  workoutId: string,
  workoutExerciseId: string,
): Promise<DataAccessResult<{ id: string }>> {
  if (!workoutId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout id is required.",
    });
  }
  if (!workoutExerciseId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout exercise id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const workoutResult = await getMyWorkoutById(workoutId);
  if (workoutResult.error) {
    return workoutResult;
  }
  if (!workoutResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout not found.",
    });
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data: existingRow, error: existingRowError } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("id", workoutExerciseId)
    .eq("workout_id", workoutId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();

  if (existingRowError) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout exercise.",
      cause: existingRowError.message,
    });
  }
  if (!existingRow) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  const { data, error } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("id", workoutExerciseId)
    .eq("workout_id", workoutId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to remove workout exercise.",
      cause: error.message,
    });
  }

  const deleted = data as { id: string } | null;
  if (!deleted) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  return ok({ id: deleted.id });
}

export async function getWorkoutSets(workoutExerciseId: string): Promise<DataAccessResult<WorkoutSetRow[]>> {
  const workoutExerciseResult = await getOwnedWorkoutExerciseById(workoutExerciseId);
  if (workoutExerciseResult.error) {
    return workoutExerciseResult;
  }
  if (!workoutExerciseResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("workout_exercise_id", workoutExerciseId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout sets.",
      cause: error.message,
    });
  }

  return ok(asWorkoutSetRows(data));
}

export async function getWorkoutSetsForWorkoutExerciseIds(
  workoutExerciseIds: string[],
): Promise<DataAccessResult<WorkoutSetRow[]>> {
  const uniqueIds = [...new Set(workoutExerciseIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return ok([]);
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .in("workout_exercise_id", uniqueIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout sets.",
      cause: error.message,
    });
  }

  return ok(asWorkoutSetRows(data));
}

export async function createWorkoutSet(
  workoutExerciseId: string,
  input: WorkoutSetInput,
): Promise<DataAccessResult<WorkoutSetRow>> {
  const workoutExerciseResult = await getOwnedWorkoutExerciseById(workoutExerciseId);
  if (workoutExerciseResult.error) {
    return workoutExerciseResult;
  }
  if (!workoutExerciseResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout exercise not found.",
    });
  }

  const existingSetsResult = await getWorkoutSets(workoutExerciseId);
  if (existingSetsResult.error) {
    return existingSetsResult;
  }
  const nextPosition =
    input.position === undefined || input.position === null || input.position === ""
      ? existingSetsResult.data.reduce((max, row) => Math.max(max, row.position), -1) + 1
      : input.position;

  const normalized = normalizeWorkoutSetInput({
    ...input,
    position: nextPosition,
  });
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout set input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      user_id: auth.data.user.id,
      workout_exercise_id: workoutExerciseId,
      position: normalized.data.position,
      set_type: normalized.data.set_type,
      weight: normalized.data.weight,
      weight_unit: normalized.data.weight_unit,
      reps: normalized.data.reps,
      rpe: normalized.data.rpe,
      is_completed: normalized.data.is_completed,
      notes: normalized.data.notes,
    })
    .select("*")
    .single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create workout set.",
      cause: error.message,
    });
  }

  const created = asWorkoutSetRow(data);
  if (!created) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create workout set.",
    });
  }

  return ok(created);
}

export async function updateWorkoutSet(
  workoutSetId: string,
  input: Partial<WorkoutSetInput>,
): Promise<DataAccessResult<WorkoutSetRow>> {
  const existingResult = await getOwnedWorkoutSetById(workoutSetId);
  if (existingResult.error) {
    return existingResult;
  }
  if (!existingResult.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout set not found.",
    });
  }

  const existing = existingResult.data;
  const normalized = normalizeWorkoutSetInput({
    position: input.position ?? existing.position,
    set_type: input.set_type ?? existing.set_type,
    weight: input.weight === undefined ? existing.weight : input.weight,
    weight_unit: input.weight_unit === undefined ? existing.weight_unit : input.weight_unit,
    reps: input.reps === undefined ? existing.reps : input.reps,
    rpe: input.rpe === undefined ? existing.rpe : input.rpe,
    is_completed: input.is_completed === undefined ? existing.is_completed : input.is_completed,
    notes: input.notes === undefined ? existing.notes : input.notes,
  });
  if (!normalized.data) {
    return fail({
      code: "INVALID_INPUT",
      message: Object.values(normalized.errors)[0] ?? "Invalid workout set input.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .update({
      position: normalized.data.position,
      set_type: normalized.data.set_type,
      weight: normalized.data.weight,
      weight_unit: normalized.data.weight_unit,
      reps: normalized.data.reps,
      rpe: normalized.data.rpe,
      is_completed: normalized.data.is_completed,
      notes: normalized.data.notes,
    })
    .eq("id", workoutSetId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update workout set.",
      cause: error.message,
    });
  }

  const updated = asWorkoutSetRow(data);
  if (!updated) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout set not found.",
    });
  }

  return ok(updated);
}

export async function deleteWorkoutSet(workoutSetId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!workoutSetId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Workout set id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", workoutSetId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete workout set.",
      cause: error.message,
    });
  }

  const deleted = data as { id: string } | null;
  if (!deleted) {
    return fail({
      code: "NOT_FOUND",
      message: "Workout set not found.",
    });
  }

  return ok({ id: deleted.id });
}

export async function reorderWorkoutSets(
  workoutExerciseId: string,
  orderedSetIds: string[],
): Promise<DataAccessResult<WorkoutSetRow[]>> {
  const existingResult = await getWorkoutSets(workoutExerciseId);
  if (existingResult.error) {
    return existingResult;
  }

  const existing = existingResult.data;
  if (!existing.length) {
    return ok([]);
  }

  const uniqueIds = new Set(orderedSetIds);
  const existingIds = new Set(existing.map((row) => row.id));
  const sameLength = orderedSetIds.length === existing.length;
  const sameMembers =
    sameLength && [...existingIds].every((id) => uniqueIds.has(id)) && [...uniqueIds].every((id) => existingIds.has(id));

  if (!sameMembers) {
    return fail({
      code: "INVALID_INPUT",
      message: "Reorder list must include each workout set exactly once.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const baseOffset = 100000;

  for (let index = 0; index < orderedSetIds.length; index += 1) {
    const setId = orderedSetIds[index];
    const { error } = await supabase
      .from("workout_sets")
      .update({ position: baseOffset + index })
      .eq("id", setId)
      .eq("user_id", auth.data.user.id)
      .eq("workout_exercise_id", workoutExerciseId);

    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to reorder workout sets.",
        cause: error.message,
      });
    }
  }

  for (let index = 0; index < orderedSetIds.length; index += 1) {
    const setId = orderedSetIds[index];
    const { error } = await supabase
      .from("workout_sets")
      .update({ position: index })
      .eq("id", setId)
      .eq("user_id", auth.data.user.id)
      .eq("workout_exercise_id", workoutExerciseId);

    if (error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to reorder workout sets.",
        cause: error.message,
      });
    }
  }

  return getWorkoutSets(workoutExerciseId);
}
