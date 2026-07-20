"use server";

import { revalidatePath } from "next/cache";

import {
  addExerciseToWorkout,
  createMyWorkout,
  createWorkoutSet,
  deleteMyWorkout,
  deleteWorkoutSet,
  getMyWorkoutById,
  getMyWorkoutExercises,
  getWorkoutSets,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  reorderWorkoutSets,
  updateMyWorkout,
  updateWorkoutSet,
} from "@/lib/data/workouts";
import {
  createMyExercise,
  deleteMyExercise,
  updateMyExercise,
} from "@/lib/data/exercises";
import { buildDuplicateSetInput, countMeaningfulCompletedSets } from "@/lib/training/session";
import { normalizeWorkoutInput } from "@/lib/training/validation";
import type { ExerciseRow, WorkoutExerciseRow, WorkoutRow, WorkoutSetRow } from "@/lib/data/auth-context";

type BaseActionResult = {
  status: "success" | "error";
  message: string;
};

export type TrainingFormErrors = Record<string, string | undefined>;

export interface WorkoutActionResult extends BaseActionResult {
  errors: TrainingFormErrors;
  workout: WorkoutRow | null;
}

export interface ExerciseActionResult extends BaseActionResult {
  errors: TrainingFormErrors;
  exercise: ExerciseRow | null;
}

export interface WorkoutExerciseActionResult extends BaseActionResult {
  errors: TrainingFormErrors;
  workoutExercise: WorkoutExerciseRow | null;
}

export interface WorkoutSetActionResult extends BaseActionResult {
  errors: TrainingFormErrors;
  workoutSet: WorkoutSetRow | null;
}

export interface CompleteWorkoutActionResult extends BaseActionResult {
  requiresConfirmation: boolean;
  workout: WorkoutRow | null;
}

export interface StartWorkoutInput {
  name: string;
  workout_date: string;
  notes?: string;
}

export interface WorkoutMetadataInput {
  name: string;
  workout_date: string;
  notes?: string;
}

export interface ExerciseInputPayload {
  name: string;
  muscle_group?: string;
  equipment?: string;
  notes?: string;
}

export interface SetInputPayload {
  set_type?: string;
  weight?: string;
  weight_unit?: string;
  reps?: string;
  rpe?: string;
  is_completed?: boolean;
  notes?: string;
}

function revalidateTrainingViews(workoutId?: string) {
  revalidatePath("/");
  revalidatePath("/training");
  revalidatePath("/training/start");
  revalidatePath("/training/history");
  revalidatePath("/training/exercises");
  if (workoutId) {
    revalidatePath(`/training/workouts/${workoutId}`);
  }
}

function asActionError(message: string, errors: TrainingFormErrors = {}): {
  status: "error";
  message: string;
  errors: TrainingFormErrors;
} {
  return {
    status: "error",
    message,
    errors,
  };
}

async function getWorkoutSetsForWorkout(workoutId: string): Promise<WorkoutSetRow[] | null> {
  const workoutExercisesResult = await getMyWorkoutExercises(workoutId);
  if (workoutExercisesResult.error) {
    return null;
  }

  const setResults = await Promise.all(
    workoutExercisesResult.data.map((workoutExercise) => getWorkoutSets(workoutExercise.id)),
  );
  const sets: WorkoutSetRow[] = [];
  for (const result of setResults) {
    if (result.error) {
      return null;
    }
    sets.push(...result.data);
  }

  return sets;
}

export async function startWorkoutAction(input: StartWorkoutInput): Promise<WorkoutActionResult> {
  const now = new Date().toISOString();
  const normalized = normalizeWorkoutInput({
    name: input.name,
    workout_date: input.workout_date,
    started_at: now,
    completed_at: null,
    notes: input.notes,
  });

  if (!normalized.data) {
    return {
      ...asActionError("Please fix the highlighted fields.", normalized.errors),
      workout: null,
    };
  }

  const result = await createMyWorkout(normalized.data);
  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workout: null,
    };
  }

  revalidateTrainingViews(result.data.id);
  return {
    status: "success",
    message: "Workout started.",
    errors: {},
    workout: result.data,
  };
}

export async function updateWorkoutMetadataAction(
  workoutId: string,
  input: WorkoutMetadataInput,
): Promise<WorkoutActionResult> {
  const result = await updateMyWorkout(workoutId, {
    name: input.name,
    workout_date: input.workout_date,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workout: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Workout details updated.",
    errors: {},
    workout: result.data,
  };
}

export async function completeWorkoutAction(
  workoutId: string,
  input: { notes?: string; forceWithoutMeaningfulSet?: boolean },
): Promise<CompleteWorkoutActionResult> {
  const workoutResult = await getMyWorkoutById(workoutId);
  if (workoutResult.error) {
    return {
      status: "error",
      message: workoutResult.error.message,
      requiresConfirmation: false,
      workout: null,
    };
  }
  if (!workoutResult.data) {
    return {
      status: "error",
      message: "Workout not found.",
      requiresConfirmation: false,
      workout: null,
    };
  }

  const workoutSets = await getWorkoutSetsForWorkout(workoutId);
  if (!workoutSets) {
    return {
      status: "error",
      message: "Unable to load workout sets for completion.",
      requiresConfirmation: false,
      workout: null,
    };
  }

  const meaningfulSetCount = countMeaningfulCompletedSets(workoutSets);
  if (meaningfulSetCount === 0 && !input.forceWithoutMeaningfulSet) {
    return {
      status: "error",
      message: "No completed sets with training data were found. Confirm to complete anyway.",
      requiresConfirmation: true,
      workout: null,
    };
  }

  const updateResult = await updateMyWorkout(workoutId, {
    notes: input.notes ?? workoutResult.data.notes ?? undefined,
    completed_at: new Date().toISOString(),
  });

  if (updateResult.error) {
    return {
      status: "error",
      message: updateResult.error.message,
      requiresConfirmation: false,
      workout: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: meaningfulSetCount
      ? "Workout completed."
      : "Workout completed without meaningful completed sets.",
    requiresConfirmation: false,
    workout: updateResult.data,
  };
}

export async function deleteWorkoutAction(workoutId: string): Promise<BaseActionResult> {
  const result = await deleteMyWorkout(workoutId);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Workout deleted.",
  };
}

export async function createExerciseAction(input: ExerciseInputPayload): Promise<ExerciseActionResult> {
  const result = await createMyExercise(input);
  if (result.error) {
    return {
      ...asActionError(result.error.message),
      exercise: null,
    };
  }

  revalidateTrainingViews();
  return {
    status: "success",
    message: "Exercise created.",
    errors: {},
    exercise: result.data,
  };
}

export async function updateExerciseAction(
  exerciseId: string,
  input: ExerciseInputPayload,
): Promise<ExerciseActionResult> {
  const result = await updateMyExercise(exerciseId, input);
  if (result.error) {
    return {
      ...asActionError(result.error.message),
      exercise: null,
    };
  }

  revalidateTrainingViews();
  return {
    status: "success",
    message: "Exercise updated.",
    errors: {},
    exercise: result.data,
  };
}

export async function deleteExerciseAction(exerciseId: string): Promise<BaseActionResult> {
  const result = await deleteMyExercise(exerciseId);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidateTrainingViews();
  return {
    status: "success",
    message: "Exercise deleted. Historical workout snapshots remain unchanged.",
  };
}

export async function addCatalogExerciseToWorkoutAction(
  workoutId: string,
  input: { catalogExerciseId: string; notes?: string },
): Promise<WorkoutExerciseActionResult> {
  const result = await addExerciseToWorkout(workoutId, {
    catalog_exercise_id: input.catalogExerciseId,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutExercise: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Catalog exercise added to workout.",
    errors: {},
    workoutExercise: result.data,
  };
}

export async function addUserExerciseToWorkoutAction(
  workoutId: string,
  input: { exerciseId: string; notes?: string },
): Promise<WorkoutExerciseActionResult> {
  const result = await addExerciseToWorkout(workoutId, {
    exercise_id: input.exerciseId,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutExercise: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Custom library exercise added to workout.",
    errors: {},
    workoutExercise: result.data,
  };
}

export async function addCustomExerciseToWorkoutAction(
  workoutId: string,
  input: { exerciseName: string; notes?: string },
): Promise<WorkoutExerciseActionResult> {
  const result = await addExerciseToWorkout(workoutId, {
    exercise_name: input.exerciseName,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutExercise: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Custom exercise added to workout.",
    errors: {},
    workoutExercise: result.data,
  };
}

export async function createExerciseAndAddToWorkoutAction(
  workoutId: string,
  input: {
    name: string;
    muscle_group?: string;
    equipment?: string;
    notes?: string;
    workoutExerciseNotes?: string;
  },
): Promise<WorkoutExerciseActionResult> {
  const createExerciseResult = await createMyExercise({
    name: input.name,
    muscle_group: input.muscle_group,
    equipment: input.equipment,
    notes: input.notes,
  });
  if (createExerciseResult.error) {
    return {
      ...asActionError(createExerciseResult.error.message),
      workoutExercise: null,
    };
  }

  const addResult = await addExerciseToWorkout(workoutId, {
    exercise_id: createExerciseResult.data.id,
    notes: input.workoutExerciseNotes,
  });

  if (addResult.error) {
    return {
      ...asActionError(addResult.error.message),
      workoutExercise: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Exercise created and added to workout.",
    errors: {},
    workoutExercise: addResult.data,
  };
}

export async function moveWorkoutExerciseAction(
  workoutId: string,
  workoutExerciseId: string,
  direction: "up" | "down",
): Promise<BaseActionResult> {
  const exercisesResult = await getMyWorkoutExercises(workoutId);
  if (exercisesResult.error) {
    return { status: "error", message: exercisesResult.error.message };
  }

  const exercises = exercisesResult.data;
  const index = exercises.findIndex((exercise) => exercise.id === workoutExerciseId);
  if (index === -1) {
    return { status: "error", message: "Workout exercise not found." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= exercises.length) {
    return { status: "error", message: "Cannot move exercise further." };
  }

  const orderedIds = exercises.map((exercise) => exercise.id);
  [orderedIds[index], orderedIds[swapIndex]] = [orderedIds[swapIndex], orderedIds[index]];
  const reorderResult = await reorderWorkoutExercises(workoutId, orderedIds);
  if (reorderResult.error) {
    return { status: "error", message: reorderResult.error.message };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Exercise order updated.",
  };
}

export async function removeWorkoutExerciseAction(
  workoutId: string,
  workoutExerciseId: string,
): Promise<BaseActionResult> {
  const removeResult = await removeWorkoutExercise(workoutExerciseId);
  if (removeResult.error) {
    return { status: "error", message: removeResult.error.message };
  }

  const remainingResult = await getMyWorkoutExercises(workoutId);
  if (remainingResult.error) {
    return { status: "error", message: remainingResult.error.message };
  }
  if (remainingResult.data.length > 0) {
    const reorderResult = await reorderWorkoutExercises(
      workoutId,
      remainingResult.data.map((exercise) => exercise.id),
    );
    if (reorderResult.error) {
      return { status: "error", message: reorderResult.error.message };
    }
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Exercise removed from workout.",
  };
}

export async function addWorkoutSetAction(
  workoutId: string,
  workoutExerciseId: string,
  input: SetInputPayload,
): Promise<WorkoutSetActionResult> {
  const result = await createWorkoutSet(workoutExerciseId, {
    position: "",
    set_type: input.set_type,
    weight: input.weight,
    weight_unit: input.weight_unit,
    reps: input.reps,
    rpe: input.rpe,
    is_completed: input.is_completed,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutSet: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Set added.",
    errors: {},
    workoutSet: result.data,
  };
}

export async function duplicateWorkoutSetAction(
  workoutId: string,
  workoutExerciseId: string,
  sourceSetId: string,
): Promise<WorkoutSetActionResult> {
  const setsResult = await getWorkoutSets(workoutExerciseId);
  if (setsResult.error) {
    return {
      ...asActionError(setsResult.error.message),
      workoutSet: null,
    };
  }

  const sourceSet = setsResult.data.find((set) => set.id === sourceSetId);
  if (!sourceSet) {
    return {
      ...asActionError("Source set not found."),
      workoutSet: null,
    };
  }

  const nextPosition = setsResult.data.reduce((max, row) => Math.max(max, row.position), -1) + 1;
  const duplicateInput = buildDuplicateSetInput(sourceSet, nextPosition);
  const result = await createWorkoutSet(workoutExerciseId, duplicateInput);
  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutSet: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Set duplicated.",
    errors: {},
    workoutSet: result.data,
  };
}

export async function updateWorkoutSetAction(
  workoutId: string,
  workoutSetId: string,
  input: SetInputPayload,
): Promise<WorkoutSetActionResult> {
  const result = await updateWorkoutSet(workoutSetId, {
    set_type: input.set_type,
    weight: input.weight,
    weight_unit: input.weight_unit,
    reps: input.reps,
    rpe: input.rpe,
    is_completed: input.is_completed,
    notes: input.notes,
  });

  if (result.error) {
    return {
      ...asActionError(result.error.message),
      workoutSet: null,
    };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Set updated.",
    errors: {},
    workoutSet: result.data,
  };
}

export async function moveWorkoutSetAction(
  workoutId: string,
  workoutExerciseId: string,
  workoutSetId: string,
  direction: "up" | "down",
): Promise<BaseActionResult> {
  const setsResult = await getWorkoutSets(workoutExerciseId);
  if (setsResult.error) {
    return { status: "error", message: setsResult.error.message };
  }

  const sets = setsResult.data;
  const index = sets.findIndex((set) => set.id === workoutSetId);
  if (index === -1) {
    return { status: "error", message: "Set not found." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sets.length) {
    return { status: "error", message: "Cannot move set further." };
  }

  const orderedIds = sets.map((set) => set.id);
  [orderedIds[index], orderedIds[swapIndex]] = [orderedIds[swapIndex], orderedIds[index]];
  const reorderResult = await reorderWorkoutSets(workoutExerciseId, orderedIds);
  if (reorderResult.error) {
    return { status: "error", message: reorderResult.error.message };
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Set order updated.",
  };
}

export async function deleteWorkoutSetAction(
  workoutId: string,
  workoutExerciseId: string,
  workoutSetId: string,
): Promise<BaseActionResult> {
  const result = await deleteWorkoutSet(workoutSetId);
  if (result.error) {
    return { status: "error", message: result.error.message };
  }

  const setsResult = await getWorkoutSets(workoutExerciseId);
  if (setsResult.error) {
    return { status: "error", message: setsResult.error.message };
  }

  if (setsResult.data.length > 0) {
    const reorderResult = await reorderWorkoutSets(
      workoutExerciseId,
      setsResult.data.map((set) => set.id),
    );
    if (reorderResult.error) {
      return { status: "error", message: reorderResult.error.message };
    }
  }

  revalidateTrainingViews(workoutId);
  return {
    status: "success",
    message: "Set deleted.",
  };
}
