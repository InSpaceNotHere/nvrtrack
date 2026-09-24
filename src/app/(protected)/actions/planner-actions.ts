"use server";

import { revalidatePath } from "next/cache";

import {
  clearScheduleOverride,
  clearWeekdayProgramSchedule,
  createWorkoutTemplate,
  duplicateWorkoutTemplate,
  getMyScheduleOverridesForRange,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
  initializePlannerDefaults,
  replaceWorkoutTemplateExercises,
  setScheduleOverride,
  setWeekdaySchedule,
  type WorkoutTemplateType,
} from "@/lib/data/workout-planner";
import { hasAssignedWeeklyProgram } from "@/lib/training/current-program";
import { importReadyMadePreset } from "@/lib/data/ready-made-presets";
import { getMyProfile } from "@/lib/data/profile";
import {
  addExerciseToWorkout,
  createMyWorkout,
  getMyActiveWorkout,
  getMyCompletedWorkouts,
  getMyWorkouts,
} from "@/lib/data/workouts";
import { getTodayDateString } from "@/lib/nutrition/date";
import { normalizeTimeZone } from "@/lib/timezone";
import type { ReadyMadePresetId } from "@/lib/training/ready-made-presets";
import { buildPlannerWeek, buildWeekDates, findPlannerDayForDate } from "@/lib/training/planner";
import { resolveHomeTodayWorkout } from "@/lib/training/home-today-workout";

export interface PlannerActionResult {
  status: "success" | "error";
  message: string;
}

function revalidatePlannerViews() {
  revalidatePath("/");
  revalidatePath("/training");
  revalidatePath("/training/start");
}

function parseDuration(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}

export async function createWorkoutTemplateAction(input: {
  name: string;
  templateType: WorkoutTemplateType;
  estimatedDurationMinutes?: string;
  notes?: string;
  exercises: Array<{
    exercise_id?: string | null;
    catalog_exercise_id?: string | null;
    exercise_name: string;
    primary_muscles?: string[];
    secondary_muscles?: string[];
    body_region?: string | null;
    movement_pattern?: string | null;
    working_sets?: number | null;
    rep_range_min?: number | null;
    rep_range_max?: number | null;
    rest_seconds_min?: number | null;
    rest_seconds_max?: number | null;
    is_per_leg?: boolean | null;
  }>;
}): Promise<PlannerActionResult> {
  const created = await createWorkoutTemplate({
    name: input.name,
    template_type: input.templateType,
    estimated_duration_minutes: parseDuration(input.estimatedDurationMinutes),
    notes: input.notes ?? null,
  });
  if (created.error) {
    return {
      status: "error",
      message: created.error.message,
    };
  }
  const replace = await replaceWorkoutTemplateExercises(
    created.data.id,
    input.exercises.map((exercise, index) => ({
      ...exercise,
      position: index,
    })),
  );
  if (replace.error) {
    return {
      status: "error",
      message: replace.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Workout template created.",
  };
}

export async function initializePlannerDefaultsAction(): Promise<PlannerActionResult> {
  const result = await initializePlannerDefaults();
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidatePlannerViews();
  if (!result.data.created) {
    return {
      status: "success",
      message: "Planner already configured. No starter schedule was applied.",
    };
  }

  return {
    status: "success",
    message: "Starter planner schedule created.",
  };
}

export async function duplicateWorkoutTemplateAction(templateId: string): Promise<PlannerActionResult> {
  const duplicated = await duplicateWorkoutTemplate(templateId);
  if (duplicated.error) {
    return {
      status: "error",
      message: duplicated.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Template duplicated.",
  };
}

export async function removeCurrentProgramAction(): Promise<PlannerActionResult> {
  const current = await getMyWeekdaySchedule();
  if (current.error) {
    return {
      status: "error",
      message: current.error.message,
    };
  }
  if (!hasAssignedWeeklyProgram(current.data)) {
    revalidatePlannerViews();
    return {
      status: "success",
      message: "No program is currently assigned.",
    };
  }

  const cleared = await clearWeekdayProgramSchedule();
  if (cleared.error) {
    return {
      status: "error",
      message: cleared.error.message,
    };
  }

  revalidatePlannerViews();
  return {
    status: "success",
    message: "Program removed from your schedule. Workout history is unchanged.",
  };
}

export async function assignTemplateToWeekdayAction(
  weekday: number,
  input: { templateId: string | null; isRestDay: boolean },
): Promise<PlannerActionResult> {
  const result = await setWeekdaySchedule(weekday, {
    template_id: input.templateId,
    is_rest_day: input.isRestDay,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Weekday schedule updated.",
  };
}

export async function skipScheduledWorkoutAction(planDate: string): Promise<PlannerActionResult> {
  const result = await setScheduleOverride(planDate, {
    status: "skipped",
    template_id: null,
    is_rest_day: false,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Scheduled workout skipped.",
  };
}

export async function clearScheduleOverrideAction(planDate: string): Promise<PlannerActionResult> {
  const result = await clearScheduleOverride(planDate);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Schedule override removed.",
  };
}

export async function moveScheduledWorkoutAction(input: {
  fromDate: string;
  toDate: string;
  templateId: string | null;
}): Promise<PlannerActionResult> {
  const fromResult = await setScheduleOverride(input.fromDate, {
    status: "moved",
    template_id: input.templateId,
    moved_to_date: input.toDate,
    moved_from_date: null,
    is_rest_day: false,
  });
  if (fromResult.error) {
    return {
      status: "error",
      message: fromResult.error.message,
    };
  }
  const toResult = await setScheduleOverride(input.toDate, {
    status: "scheduled",
    template_id: input.templateId,
    moved_to_date: null,
    moved_from_date: input.fromDate,
    is_rest_day: false,
  });
  if (toResult.error) {
    return {
      status: "error",
      message: toResult.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Workout moved to a new date.",
  };
}

export async function markScheduleCompletedAction(input: {
  planDate: string;
  workoutId: string;
  templateId: string | null;
}): Promise<PlannerActionResult> {
  const result = await setScheduleOverride(input.planDate, {
    status: "completed",
    template_id: input.templateId,
    workout_id: input.workoutId,
    is_rest_day: false,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidatePlannerViews();
  return {
    status: "success",
    message: "Scheduled workout marked completed.",
  };
}

export async function quickStartWorkoutFromTemplateAction(input: {
  templateId: string;
  templateName: string;
  workoutDate?: string;
}): Promise<{ status: "success" | "error"; message: string; workoutId: string | null }> {
  const templateExercisesResult = await getMyWorkoutTemplateExercises([input.templateId]);
  if (templateExercisesResult.error) {
    return {
      status: "error",
      message: templateExercisesResult.error.message,
      workoutId: null,
    };
  }
  const templateExercises = templateExercisesResult.data
    .filter((exercise) => exercise.template_id === input.templateId)
    .sort((left, right) => left.position - right.position);

  if (templateExercises.length === 0) {
    return {
      status: "error",
      message: "Template has no exercises. Add exercises before starting this workout.",
      workoutId: null,
    };
  }

  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const createResult = await createMyWorkout({
    name: input.templateName,
    workout_date: input.workoutDate ?? getTodayDateString(profileTimeZone),
    started_at: new Date().toISOString(),
    notes: null,
    completed_at: null,
  });
  if (createResult.error) {
    return {
      status: "error",
      message: createResult.error.message,
      workoutId: null,
    };
  }

  for (const exercise of templateExercises) {
    const addResult = await addExerciseToWorkout(createResult.data.id, {
      exercise_id: exercise.exercise_id,
      catalog_exercise_id: exercise.catalog_exercise_id,
      exercise_name: exercise.exercise_name,
      notes: exercise.notes ?? null,
    });
    if (addResult.error) {
      return {
        status: "error",
        message: addResult.error.message,
        workoutId: null,
      };
    }
  }

  revalidatePlannerViews();
  return {
    status: "success",
    message: "Workout started from template.",
    workoutId: createResult.data.id,
  };
}

export async function startOrResumeTodayScheduledWorkoutAction(): Promise<{
  status: "success" | "error";
  message: string;
  workoutId: string | null;
}> {
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const weekDates = buildWeekDates(referenceDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const [
    activeWorkoutResult,
    completedWorkoutsResult,
    templatesResult,
    templateExercisesResult,
    weekdayScheduleResult,
    scheduleOverridesResult,
  ] = await Promise.all([
    getMyActiveWorkout(),
    getMyCompletedWorkouts({ startDate: weekStart, endDate: weekEnd }),
    getMyWorkoutTemplates(),
    getMyWorkoutTemplateExercises(),
    getMyWeekdaySchedule(),
    getMyScheduleOverridesForRange(weekStart, weekEnd),
  ]);

  const dataError =
    activeWorkoutResult.error?.message ??
    completedWorkoutsResult.error?.message ??
    templatesResult.error?.message ??
    templateExercisesResult.error?.message ??
    weekdayScheduleResult.error?.message ??
    scheduleOverridesResult.error?.message ??
    null;
  if (dataError) {
    return {
      status: "error",
      message: dataError,
      workoutId: null,
    };
  }

  const existingActiveWorkout = activeWorkoutResult.data ?? null;
  if (existingActiveWorkout) {
    return {
      status: "success",
      message: "Workout already in progress. Resuming it.",
      workoutId: existingActiveWorkout.id,
    };
  }

  const plannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: (completedWorkoutsResult.data ?? []).map((workout) => ({
      id: workout.id,
      workout_date: workout.workout_date,
      name: workout.name,
    })),
    referenceDate,
  });
  const todayPlan = findPlannerDayForDate(plannerWeek, todayDate);
  const plannerUninitialized = !hasAssignedWeeklyProgram(weekdayScheduleResult.data ?? []);

  const todaysCompletedWorkout = [...(completedWorkoutsResult.data ?? [])]
    .filter((workout) => workout.workout_date === todayDate && workout.completed_at !== null)
    .sort((left, right) => Date.parse(right.completed_at ?? right.created_at) - Date.parse(left.completed_at ?? left.created_at))[0] ?? null;

  const resolved = resolveHomeTodayWorkout({
    todayDate,
    weekdayLabel: todayPlan?.weekday_label ?? referenceDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    todayPlan,
    activeWorkout: null,
    todaysCompletedWorkout: todaysCompletedWorkout
      ? {
          id: todaysCompletedWorkout.id,
          name: todaysCompletedWorkout.name,
          workout_date: todaysCompletedWorkout.workout_date,
        }
      : null,
    plannerUninitialized,
  });

  if (resolved.state === "completed") {
    return {
      status: "error",
      message: "Today’s scheduled workout is already completed.",
      workoutId: null,
    };
  }

  if (resolved.state !== "scheduled" || !resolved.templateId || !todayPlan?.template_name) {
    return {
      status: "error",
      message:
        resolved.state === "no_program"
          ? "No program is configured yet. Choose a plan first."
          : "No scheduled workout is available to start for today.",
      workoutId: null,
    };
  }

  const todayWorkoutsResult = await getMyWorkouts({
    startDate: todayDate,
    endDate: todayDate,
  });
  if (todayWorkoutsResult.error) {
    return {
      status: "error",
      message: todayWorkoutsResult.error.message,
      workoutId: null,
    };
  }

  const resumedExistingWorkout = [...(todayWorkoutsResult.data ?? [])]
    .filter(
      (workout) =>
        workout.completed_at === null &&
        workout.name.trim().toLowerCase() === todayPlan.template_name!.trim().toLowerCase(),
    )
    .sort((left, right) => Date.parse(right.started_at ?? right.created_at) - Date.parse(left.started_at ?? left.created_at))[0];

  if (resumedExistingWorkout) {
    return {
      status: "success",
      message: "Resuming today’s scheduled workout.",
      workoutId: resumedExistingWorkout.id,
    };
  }

  return quickStartWorkoutFromTemplateAction({
    templateId: resolved.templateId,
    templateName: todayPlan.template_name,
    workoutDate: todayDate,
  });
}

export async function saveReadyMadePresetAction(
  presetId: ReadyMadePresetId,
): Promise<PlannerActionResult> {
  const result = await importReadyMadePreset({
    presetId,
    applySchedule: false,
    confirmScheduleReplace: false,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  revalidatePlannerViews();
  if (result.data.kind === "focused_workout") {
    return {
      status: "success",
      message: `${result.data.presetTitle} saved to your templates.`,
    };
  }

  return {
    status: "success",
    message: `${result.data.presetTitle} templates saved. Apply the weekly schedule when you are ready.`,
  };
}

export async function applyReadyMadePresetAction(input: {
  presetId: ReadyMadePresetId;
  confirmScheduleReplace: boolean;
}): Promise<{
  status: "success" | "error" | "confirm";
  message: string;
}> {
  const result = await importReadyMadePreset({
    presetId: input.presetId,
    applySchedule: true,
    confirmScheduleReplace: input.confirmScheduleReplace,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }

  if (result.data.requiresScheduleConfirmation) {
    return {
      status: "confirm",
      message: "Applying this program replaces your current weekday assignments. Confirm to continue.",
    };
  }

  revalidatePlannerViews();
  return {
    status: "success",
    message: result.data.appliedSchedule
      ? `${result.data.presetTitle} applied to your weekly planner.`
      : `${result.data.presetTitle} is already applied.`,
  };
}
