import { aggregateWorkoutMuscles, type WorkoutMuscleAggregation } from "./muscle-aggregation";

export const PLANNER_WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type PlannerWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type PlannerTemplateType = "push" | "pull" | "legs" | "upper" | "lower" | "custom";
export type PlannerDayStatus = "none" | "rest" | "scheduled" | "completed" | "skipped" | "moved";

export interface PlannerTemplate {
  id: string;
  name: string;
  template_type: PlannerTemplateType;
  estimated_duration_minutes: number | null;
}

export interface PlannerTemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string | null;
  catalog_exercise_id: string | null;
  exercise_name: string;
  position: number;
  primary_muscles: string[];
  secondary_muscles: string[];
}

export interface PlannerWeekdayScheduleRow {
  id: string;
  weekday: number;
  template_id: string | null;
  is_rest_day: boolean;
}

export interface PlannerScheduleOverrideRow {
  id: string;
  plan_date: string;
  template_id: string | null;
  status: PlannerDayStatus | string;
  is_rest_day: boolean;
  moved_to_date: string | null;
  moved_from_date: string | null;
  workout_id: string | null;
}

export interface PlannerCompletedWorkout {
  id: string;
  workout_date: string;
  name: string;
}

export interface PlannerDayPlan {
  date: string;
  weekday: PlannerWeekday;
  weekday_label: string;
  status: PlannerDayStatus;
  template_id: string | null;
  template_name: string | null;
  template_type: PlannerTemplateType | null;
  estimated_duration_minutes: number | null;
  exercise_count: number;
  muscle_targeting: WorkoutMuscleAggregation;
  workout_id: string | null;
  moved_to_date: string | null;
  moved_from_date: string | null;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getWeekStartMonday(referenceDate = new Date()): string {
  const date = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const weekday = date.getUTCDay();
  const distanceFromMonday = (weekday + 6) % 7;
  date.setUTCDate(date.getUTCDate() - distanceFromMonday);
  return toDateOnly(date);
}

export function buildWeekDates(referenceDate = new Date()): string[] {
  const monday = new Date(`${getWeekStartMonday(referenceDate)}T00:00:00.000Z`);
  const dates: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    dates.push(toDateOnly(date));
  }
  return dates;
}

export function weekdayFromDate(date: string): PlannerWeekday {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const weekday = parsed.getUTCDay();
  return (weekday >= 0 && weekday <= 6 ? weekday : 0) as PlannerWeekday;
}

function normalizeStatus(value: string | null | undefined): PlannerDayStatus {
  if (value === "rest" || value === "scheduled" || value === "completed" || value === "skipped" || value === "moved") {
    return value;
  }
  return "none";
}

function fallbackEstimatedDuration(exerciseCount: number): number {
  return Math.max(15, exerciseCount * 8);
}

export function buildPlannerWeek(params: {
  referenceDate?: Date;
  templates: PlannerTemplate[];
  templateExercises: PlannerTemplateExercise[];
  weekdayScheduleRows: PlannerWeekdayScheduleRow[];
  scheduleOverrideRows: PlannerScheduleOverrideRow[];
  completedWorkouts: PlannerCompletedWorkout[];
}): PlannerDayPlan[] {
  const {
    referenceDate = new Date(),
    templates,
    templateExercises,
    weekdayScheduleRows,
    scheduleOverrideRows,
    completedWorkouts,
  } = params;

  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const exercisesByTemplateId = new Map<string, PlannerTemplateExercise[]>();
  for (const exercise of templateExercises) {
    const list = exercisesByTemplateId.get(exercise.template_id);
    if (list) {
      list.push(exercise);
    } else {
      exercisesByTemplateId.set(exercise.template_id, [exercise]);
    }
  }
  const scheduleByWeekday = new Map<number, PlannerWeekdayScheduleRow>();
  for (const row of weekdayScheduleRows) {
    scheduleByWeekday.set(row.weekday, row);
  }
  const overrideByDate = new Map(scheduleOverrideRows.map((row) => [row.plan_date, row]));
  const completedByDate = new Map(completedWorkouts.map((workout) => [workout.workout_date, workout]));
  const weekDates = buildWeekDates(referenceDate);

  return weekDates.map((date) => {
    const weekday = weekdayFromDate(date);
    const weekdayLabel = PLANNER_WEEKDAY_LABELS[weekday];
    const scheduled = scheduleByWeekday.get(weekday);
    const override = overrideByDate.get(date);
    const completedWorkout = completedByDate.get(date) ?? null;

    const baseTemplateId = scheduled?.template_id ?? null;
    const baseRestDay = scheduled?.is_rest_day ?? false;
    const templateId = override?.template_id ?? baseTemplateId;
    const isRestDay = override ? override.is_rest_day : baseRestDay;

    let status: PlannerDayStatus = "none";
    if (isRestDay) {
      status = "rest";
    } else if (templateId) {
      status = "scheduled";
    }

    const overrideStatus = normalizeStatus(override?.status);
    if (overrideStatus !== "none") {
      status = overrideStatus;
    }
    if (isRestDay) {
      status = "rest";
    }
    if (completedWorkout) {
      status = "completed";
    }

    const template = templateId ? templatesById.get(templateId) ?? null : null;
    const templateExerciseList = templateId ? exercisesByTemplateId.get(templateId) ?? [] : [];
    const exerciseCount = templateExerciseList.length;
    const estimatedDurationMinutes =
      template?.estimated_duration_minutes ??
      (status === "scheduled" || status === "completed" ? fallbackEstimatedDuration(exerciseCount) : null);
    const muscleTargeting = aggregateWorkoutMuscles(
      templateExerciseList.map((exercise) => ({
        exercise_id: exercise.id,
        exercise_name: exercise.exercise_name,
        primary_muscles: exercise.primary_muscles,
        secondary_muscles: exercise.secondary_muscles,
      })),
    );

    return {
      date,
      weekday,
      weekday_label: weekdayLabel,
      status,
      template_id: template?.id ?? null,
      template_name: template?.name ?? null,
      template_type: template?.template_type ?? null,
      estimated_duration_minutes: estimatedDurationMinutes,
      exercise_count: exerciseCount,
      muscle_targeting: muscleTargeting,
      workout_id: completedWorkout?.id ?? override?.workout_id ?? null,
      moved_to_date: override?.moved_to_date ?? null,
      moved_from_date: override?.moved_from_date ?? null,
    };
  });
}

export function findPlannerDayForDate(plans: PlannerDayPlan[], date: string): PlannerDayPlan | null {
  return plans.find((plan) => plan.date === date) ?? null;
}
