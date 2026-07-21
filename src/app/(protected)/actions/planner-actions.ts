"use server";

import { revalidatePath } from "next/cache";

import {
  clearScheduleOverride,
  createWorkoutTemplate,
  duplicateWorkoutTemplate,
  replaceWorkoutTemplateExercises,
  setScheduleOverride,
  setWeekdaySchedule,
  type WorkoutTemplateType,
} from "@/lib/data/workout-planner";
import { getMyProfile } from "@/lib/data/profile";
import { addExerciseToWorkout, createMyWorkout } from "@/lib/data/workouts";
import { getTodayDateString } from "@/lib/nutrition/date";
import { normalizeTimeZone } from "@/lib/timezone";

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
  exercises: Array<{ exercise_id: string | null; catalog_exercise_id: string | null; exercise_name: string }>;
}): Promise<{ status: "success" | "error"; message: string; workoutId: string | null }> {
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

  for (const exercise of input.exercises) {
    const addResult = await addExerciseToWorkout(createResult.data.id, exercise);
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
