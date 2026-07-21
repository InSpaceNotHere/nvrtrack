import {
  mapLegacyMuscleGroupToPrimaryMuscles,
  normalizeExerciseMuscleMetadata,
  toLegacyPrimaryMuscleGroup,
  type BodyRegion,
  type MovementPattern,
  type MuscleId,
} from "./muscles";
import type { TrainingWeightUnit, WorkoutSetType } from "./types";

export const EXERCISE_NAME_MAX_LENGTH = 120;
export const EXERCISE_META_MAX_LENGTH = 80;
export const EXERCISE_NOTES_MAX_LENGTH = 1000;
export const WORKOUT_NAME_MAX_LENGTH = 120;
export const WORKOUT_NOTES_MAX_LENGTH = 2000;
export const WORKOUT_EXERCISE_NOTES_MAX_LENGTH = 1000;
export const WORKOUT_SET_NOTES_MAX_LENGTH = 1000;
export const WORKOUT_POSITION_MAX = 5000;
export const WORKOUT_SET_POSITION_MAX = 10000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SET_TYPES: WorkoutSetType[] = ["warmup", "working", "top", "backoff", "drop", "failure"];
const WEIGHT_UNITS: TrainingWeightUnit[] = ["lb", "kg"];

type NumberLike = number | string | null | undefined;
type IntegerLike = number | string | null | undefined;
type BooleanLike = boolean | string | null | undefined;

export interface ExerciseInput {
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  notes?: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  body_region?: string | null;
  movement_pattern?: string | null;
}

export interface ExerciseNormalized {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  notes: string | null;
  primary_muscles: MuscleId[];
  secondary_muscles: MuscleId[];
  body_region: BodyRegion | null;
  movement_pattern: MovementPattern | null;
}

export interface WorkoutInput {
  name: string;
  workout_date: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
}

export interface WorkoutNormalized {
  name: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface WorkoutExerciseInput {
  exercise_id?: string | null;
  catalog_exercise_id?: string | null;
  exercise_name: string;
  position: IntegerLike;
  notes?: string | null;
}

export interface WorkoutExerciseNormalized {
  exercise_id: string | null;
  catalog_exercise_id: string | null;
  exercise_name: string;
  position: number;
  notes: string | null;
}

export interface WorkoutSetInput {
  position: IntegerLike;
  set_type?: string | null;
  weight?: NumberLike;
  weight_unit?: string | null;
  reps?: IntegerLike;
  rpe?: NumberLike;
  is_completed?: BooleanLike;
  notes?: string | null;
}

export interface WorkoutSetNormalized {
  position: number;
  set_type: WorkoutSetType;
  weight: number | null;
  weight_unit: TrainingWeightUnit | null;
  reps: number | null;
  rpe: number | null;
  is_completed: boolean;
  notes: string | null;
}

export interface ValidationResult<T, F extends string> {
  data: T | null;
  errors: Partial<Record<F, string>>;
}

export type ExerciseField =
  | "name"
  | "muscle_group"
  | "equipment"
  | "notes"
  | "primary_muscles"
  | "secondary_muscles"
  | "body_region"
  | "movement_pattern";
export type WorkoutField = "name" | "workout_date" | "started_at" | "completed_at" | "notes";
export type WorkoutExerciseField = "exercise_id" | "catalog_exercise_id" | "exercise_name" | "position" | "notes";
export type WorkoutSetField =
  | "position"
  | "set_type"
  | "weight"
  | "weight_unit"
  | "reps"
  | "rpe"
  | "is_completed"
  | "notes";

function parseRequiredText(value: string, fieldLabel: string, maxLength: number): { value: string | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: `${fieldLabel} is required.` };
  }
  if (trimmed.length > maxLength) {
    return { value: null, error: `${fieldLabel} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed, error: null };
}

function parseOptionalText(
  value: string | null | undefined,
  fieldLabel: string,
  maxLength: number,
): { value: string | null; error: string | null } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (trimmed.length > maxLength) {
    return { value: null, error: `${fieldLabel} must be ${maxLength} characters or fewer.` };
  }
  return { value: trimmed, error: null };
}

function parseNumber(
  value: NumberLike,
  fieldLabel: string,
  options: { required: boolean; min: number; max?: number; allowZero?: boolean },
): { value: number | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    if (!options.required) {
      return { value: null, error: null };
    }
    return { value: null, error: `${fieldLabel} is required.` };
  }

  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) {
    return { value: null, error: `${fieldLabel} must be a number.` };
  }
  if (options.allowZero === false && numeric <= 0) {
    return { value: null, error: `${fieldLabel} must be greater than 0.` };
  }
  if (numeric < options.min) {
    return { value: null, error: `${fieldLabel} must be at least ${options.min}.` };
  }
  if (options.max !== undefined && numeric > options.max) {
    return { value: null, error: `${fieldLabel} must be at most ${options.max}.` };
  }
  return { value: numeric, error: null };
}

function parseInteger(
  value: IntegerLike,
  fieldLabel: string,
  options: { required: boolean; min: number; max?: number },
): { value: number | null; error: string | null } {
  const numeric = parseNumber(value, fieldLabel, { required: options.required, min: options.min, max: options.max });
  if (numeric.error || numeric.value === null) {
    return numeric;
  }
  if (!Number.isInteger(numeric.value)) {
    return { value: null, error: `${fieldLabel} must be a whole number.` };
  }
  return { value: numeric.value, error: null };
}

function parseBoolean(value: BooleanLike): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  return false;
}

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isValidTimestampString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isWorkoutSetType(value: string): value is WorkoutSetType {
  return SET_TYPES.includes(value as WorkoutSetType);
}

function isWeightUnit(value: string): value is TrainingWeightUnit {
  return WEIGHT_UNITS.includes(value as TrainingWeightUnit);
}

export interface ExerciseValidationOptions {
  require_primary_muscles?: boolean;
}

export function normalizeExerciseInput(
  input: ExerciseInput,
  options: ExerciseValidationOptions = {},
): ValidationResult<ExerciseNormalized, ExerciseField> {
  const errors: Partial<Record<ExerciseField, string>> = {};
  const name = parseRequiredText(input.name, "Exercise name", EXERCISE_NAME_MAX_LENGTH);
  if (name.error) errors.name = name.error;

  const muscleGroup = parseOptionalText(input.muscle_group, "Muscle group", EXERCISE_META_MAX_LENGTH);
  if (muscleGroup.error) errors.muscle_group = muscleGroup.error;

  const equipment = parseOptionalText(input.equipment, "Equipment", EXERCISE_META_MAX_LENGTH);
  if (equipment.error) errors.equipment = equipment.error;

  const notes = parseOptionalText(input.notes, "Notes", EXERCISE_NOTES_MAX_LENGTH);
  if (notes.error) errors.notes = notes.error;

  const legacyPrimaryMuscles =
    input.primary_muscles === undefined && input.secondary_muscles === undefined
      ? mapLegacyMuscleGroupToPrimaryMuscles(muscleGroup.value)
      : [];
  const muscles = normalizeExerciseMuscleMetadata({
    primary_muscles: input.primary_muscles ?? legacyPrimaryMuscles,
    secondary_muscles: input.secondary_muscles ?? [],
    body_region: input.body_region,
    movement_pattern: input.movement_pattern,
    require_primary_muscles: options.require_primary_muscles,
  });

  if (muscles.errors.primary_muscles) errors.primary_muscles = muscles.errors.primary_muscles;
  if (muscles.errors.secondary_muscles) errors.secondary_muscles = muscles.errors.secondary_muscles;
  if (muscles.errors.body_region) errors.body_region = muscles.errors.body_region;
  if (muscles.errors.movement_pattern) errors.movement_pattern = muscles.errors.movement_pattern;

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  const normalizedMuscles = muscles.data!;
  const legacyMuscleGroup = toLegacyPrimaryMuscleGroup(normalizedMuscles.primary_muscles);

  return {
    data: {
      name: name.value!,
      muscle_group: legacyMuscleGroup ?? muscleGroup.value,
      equipment: equipment.value,
      notes: notes.value,
      primary_muscles: normalizedMuscles.primary_muscles,
      secondary_muscles: normalizedMuscles.secondary_muscles,
      body_region: normalizedMuscles.body_region,
      movement_pattern: normalizedMuscles.movement_pattern,
    },
    errors: {},
  };
}

export function normalizeWorkoutInput(input: WorkoutInput): ValidationResult<WorkoutNormalized, WorkoutField> {
  const errors: Partial<Record<WorkoutField, string>> = {};
  const name = parseRequiredText(input.name, "Workout name", WORKOUT_NAME_MAX_LENGTH);
  if (name.error) errors.name = name.error;

  if (!isValidDateString(input.workout_date)) {
    errors.workout_date = "Workout date must be valid.";
  }

  const startedAt = parseOptionalText(input.started_at, "Started time", 64);
  if (startedAt.error) errors.started_at = startedAt.error;
  if (startedAt.value && !isValidTimestampString(startedAt.value)) {
    errors.started_at = "Started time must be a valid timestamp.";
  }

  const completedAt = parseOptionalText(input.completed_at, "Completed time", 64);
  if (completedAt.error) errors.completed_at = completedAt.error;
  if (completedAt.value && !isValidTimestampString(completedAt.value)) {
    errors.completed_at = "Completed time must be a valid timestamp.";
  }

  const notes = parseOptionalText(input.notes, "Notes", WORKOUT_NOTES_MAX_LENGTH);
  if (notes.error) errors.notes = notes.error;

  if (startedAt.value && completedAt.value) {
    const startedMs = Date.parse(startedAt.value);
    const completedMs = Date.parse(completedAt.value);
    if (completedMs < startedMs) {
      errors.completed_at = "Completed time cannot be before started time.";
    }
  }

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      name: name.value!,
      workout_date: input.workout_date,
      started_at: startedAt.value,
      completed_at: completedAt.value,
      notes: notes.value,
    },
    errors: {},
  };
}

export function normalizeWorkoutExerciseInput(
  input: WorkoutExerciseInput,
): ValidationResult<WorkoutExerciseNormalized, WorkoutExerciseField> {
  const errors: Partial<Record<WorkoutExerciseField, string>> = {};

  const exerciseName = parseRequiredText(input.exercise_name, "Exercise snapshot name", EXERCISE_NAME_MAX_LENGTH);
  if (exerciseName.error) errors.exercise_name = exerciseName.error;

  const position = parseInteger(input.position, "Exercise position", {
    required: true,
    min: 0,
    max: WORKOUT_POSITION_MAX,
  });
  if (position.error) errors.position = position.error;

  let exerciseId: string | null = null;
  const maybeExerciseId = input.exercise_id?.trim() ?? "";
  if (maybeExerciseId) {
    if (!UUID_PATTERN.test(maybeExerciseId)) {
      errors.exercise_id = "Exercise id must be a valid UUID.";
    } else {
      exerciseId = maybeExerciseId;
    }
  }

  let catalogExerciseId: string | null = null;
  const maybeCatalogExerciseId = input.catalog_exercise_id?.trim() ?? "";
  if (maybeCatalogExerciseId) {
    if (!UUID_PATTERN.test(maybeCatalogExerciseId)) {
      errors.catalog_exercise_id = "Catalog exercise id must be a valid UUID.";
    } else {
      catalogExerciseId = maybeCatalogExerciseId;
    }
  }

  if (exerciseId && catalogExerciseId) {
    errors.exercise_id = "Only one exercise source can be selected.";
    errors.catalog_exercise_id = "Only one exercise source can be selected.";
  }

  const notes = parseOptionalText(input.notes, "Notes", WORKOUT_EXERCISE_NOTES_MAX_LENGTH);
  if (notes.error) errors.notes = notes.error;

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      exercise_id: exerciseId,
      catalog_exercise_id: catalogExerciseId,
      exercise_name: exerciseName.value!,
      position: position.value!,
      notes: notes.value,
    },
    errors: {},
  };
}

export function normalizeWorkoutSetInput(input: WorkoutSetInput): ValidationResult<WorkoutSetNormalized, WorkoutSetField> {
  const errors: Partial<Record<WorkoutSetField, string>> = {};

  const position = parseInteger(input.position, "Set position", {
    required: true,
    min: 0,
    max: WORKOUT_SET_POSITION_MAX,
  });
  if (position.error) errors.position = position.error;

  const rawSetType = input.set_type?.trim().toLowerCase() || "working";
  if (!isWorkoutSetType(rawSetType)) {
    errors.set_type = "Set type must be warmup, working, top, backoff, drop, or failure.";
  }

  const weight = parseNumber(input.weight, "Weight", { required: false, min: 0 });
  if (weight.error) errors.weight = weight.error;

  const rawWeightUnit = input.weight_unit?.trim().toLowerCase() ?? "";
  let weightUnit: TrainingWeightUnit | null = null;
  if (rawWeightUnit) {
    if (!isWeightUnit(rawWeightUnit)) {
      errors.weight_unit = "Weight unit must be lb or kg.";
    } else {
      weightUnit = rawWeightUnit;
    }
  }
  if (weightUnit && weight.value === null) {
    errors.weight = "Weight is required when weight unit is provided.";
  }

  const reps = parseInteger(input.reps, "Reps", { required: false, min: 0 });
  if (reps.error) errors.reps = reps.error;

  const rpe = parseNumber(input.rpe, "RPE", { required: false, min: 1, max: 10 });
  if (rpe.error) errors.rpe = rpe.error;

  const notes = parseOptionalText(input.notes, "Notes", WORKOUT_SET_NOTES_MAX_LENGTH);
  if (notes.error) errors.notes = notes.error;

  const isCompleted = parseBoolean(input.is_completed);
  if (isCompleted && reps.value === null && weight.value === null && !notes.value) {
    errors.is_completed = "Completed sets require reps, weight, or a note.";
  }

  if (Object.keys(errors).length) {
    return { data: null, errors };
  }

  return {
    data: {
      position: position.value!,
      set_type: rawSetType as WorkoutSetType,
      weight: weight.value,
      weight_unit: weightUnit,
      reps: reps.value,
      rpe: rpe.value,
      is_completed: isCompleted,
      notes: notes.value,
    },
    errors: {},
  };
}
