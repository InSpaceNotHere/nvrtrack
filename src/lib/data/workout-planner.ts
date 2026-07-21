import { getExerciseCatalog } from "./exercise-catalog";
import { getAuthenticatedContext } from "./auth-context";
import { getMyProfile } from "./profile";
import { fail, ok, type DataAccessResult } from "./result";
import { getTodayDateString } from "@/lib/nutrition/date";
import { normalizeTimeZone } from "@/lib/timezone";

export type WorkoutTemplateType = "push" | "pull" | "legs" | "upper" | "lower" | "custom";
export type WorkoutScheduleStatus = "scheduled" | "completed" | "skipped" | "moved";

export interface WorkoutTemplateRow {
  id: string;
  user_id: string;
  name: string;
  template_type: WorkoutTemplateType;
  estimated_duration_minutes: number | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutTemplateExerciseRow {
  id: string;
  user_id: string;
  template_id: string;
  exercise_id: string | null;
  catalog_exercise_id: string | null;
  exercise_name: string;
  position: number;
  notes: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  body_region: string | null;
  movement_pattern: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutWeekdayScheduleRow {
  id: string;
  user_id: string;
  weekday: number;
  template_id: string | null;
  is_rest_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutScheduleOverrideRow {
  id: string;
  user_id: string;
  plan_date: string;
  template_id: string | null;
  status: WorkoutScheduleStatus;
  is_rest_day: boolean;
  moved_to_date: string | null;
  moved_from_date: string | null;
  workout_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTemplateInput {
  name: string;
  template_type: WorkoutTemplateType;
  estimated_duration_minutes?: number | null;
  notes?: string | null;
}

interface UpsertTemplateExerciseInput {
  exercise_id?: string | null;
  catalog_exercise_id?: string | null;
  exercise_name: string;
  position: number;
  notes?: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  body_region?: string | null;
  movement_pattern?: string | null;
}

interface SetScheduleOverrideInput {
  status: WorkoutScheduleStatus;
  template_id?: string | null;
  is_rest_day?: boolean;
  moved_to_date?: string | null;
  moved_from_date?: string | null;
  workout_id?: string | null;
  notes?: string | null;
}

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRow<T>(value: unknown): T | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as T;
}

function normalizeTemplateName(value: string): string {
  return value.trim();
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function defaultWeekdayRows(userId: string): Array<Pick<WorkoutWeekdayScheduleRow, "user_id" | "weekday" | "template_id" | "is_rest_day">> {
  return Array.from({ length: 7 }, (_, weekday) => ({
    user_id: userId,
    weekday,
    template_id: null,
    is_rest_day: false,
  }));
}

async function ensureDefaultTemplates(): Promise<DataAccessResult<void>> {
  const existing = await getMyWorkoutTemplates();
  if (existing.error) {
    return existing;
  }
  if (existing.data.length > 0) {
    return ok(undefined);
  }

  const defaults: CreateTemplateInput[] = [
    { name: "Push", template_type: "push", estimated_duration_minutes: 60 },
    { name: "Pull", template_type: "pull", estimated_duration_minutes: 60 },
    { name: "Legs", template_type: "legs", estimated_duration_minutes: 70 },
    { name: "Upper", template_type: "upper", estimated_duration_minutes: 65 },
    { name: "Lower", template_type: "lower", estimated_duration_minutes: 65 },
  ];

  const createdTemplates: WorkoutTemplateRow[] = [];
  for (const template of defaults) {
    const createResult = await createWorkoutTemplate(template);
    if (createResult.error) {
      return createResult;
    }
    createdTemplates.push(createResult.data);
  }

  const catalogResult = await getExerciseCatalog({ limit: 600 });
  if (catalogResult.error) {
    return ok(undefined);
  }
  const catalogByName = new Map(catalogResult.data.map((exercise) => [exercise.name.toLowerCase(), exercise]));

  const defaultTemplateExerciseNames: Record<string, string[]> = {
    push: ["Barbell Bench Press", "Incline Dumbbell Bench Press", "Overhead Press", "Triceps Pushdown"],
    pull: ["Pull-Up", "Barbell Row", "Lat Pulldown", "Barbell Curl"],
    legs: ["Back Squat", "Romanian Deadlift", "Leg Press", "Standing Calf Raise"],
    upper: ["Barbell Bench Press", "Pull-Up", "Seated Cable Row", "Dumbbell Lateral Raise"],
    lower: ["Back Squat", "Conventional Deadlift", "Seated Leg Curl", "Leg Extension"],
  };

  for (const template of createdTemplates) {
    const names = defaultTemplateExerciseNames[template.template_type] ?? [];
    if (!names.length) {
      continue;
    }
    const exercises: UpsertTemplateExerciseInput[] = names.map((name, position) => {
      const catalog = catalogByName.get(name.toLowerCase());
      return {
        catalog_exercise_id: catalog?.id ?? null,
        exercise_name: catalog?.name ?? name,
        position,
        primary_muscles: catalog?.primary_muscles ?? [],
        secondary_muscles: catalog?.secondary_muscles ?? [],
        body_region: catalog?.body_region ?? null,
        movement_pattern: catalog?.movement_pattern ?? null,
      };
    });
    await replaceWorkoutTemplateExercises(template.id, exercises);
  }

  const schedule = await getMyWeekdaySchedule();
  if (schedule.error || schedule.data.length > 0) {
    return ok(undefined);
  }

  const orderedDefaults = ["push", "pull", "legs", "upper", "lower"] as const;
  for (let weekday = 1; weekday <= 5; weekday += 1) {
    const templateType = orderedDefaults[weekday - 1];
    const template = createdTemplates.find((item) => item.template_type === templateType) ?? null;
    if (!template) {
      continue;
    }
    await setWeekdaySchedule(weekday, {
      template_id: template.id,
      is_rest_day: false,
    });
  }
  await setWeekdaySchedule(0, { template_id: null, is_rest_day: true });
  await setWeekdaySchedule(6, { template_id: null, is_rest_day: true });

  return ok(undefined);
}

export async function getMyWorkoutTemplates(): Promise<DataAccessResult<WorkoutTemplateRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout templates.",
      cause: error.message,
    });
  }
  return ok(asRows<WorkoutTemplateRow>(data));
}

export async function getMyWorkoutTemplateExercises(
  templateIds?: string[],
): Promise<DataAccessResult<WorkoutTemplateExerciseRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  let query = supabase
    .from("workout_template_exercises")
    .select("*")
    .eq("user_id", auth.data.user.id);
  if (Array.isArray(templateIds) && templateIds.length > 0) {
    query = query.in("template_id", templateIds);
  }
  const { data, error } = await query.order("position", { ascending: true });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load workout template exercises.",
      cause: error.message,
    });
  }
  return ok(asRows<WorkoutTemplateExerciseRow>(data));
}

export async function getMyWeekdaySchedule(): Promise<DataAccessResult<WorkoutWeekdayScheduleRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_weekday_schedule")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("weekday", { ascending: true });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weekday schedule.",
      cause: error.message,
    });
  }

  let rows = asRows<WorkoutWeekdayScheduleRow>(data);
  if (rows.length === 0) {
    const seed = await supabase
      .from("workout_weekday_schedule")
      .insert(defaultWeekdayRows(auth.data.user.id))
      .select("*");
    if (seed.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to initialize weekday schedule.",
        cause: seed.error.message,
      });
    }
    rows = asRows<WorkoutWeekdayScheduleRow>(seed.data).sort((left, right) => left.weekday - right.weekday);
  }

  return ok(rows);
}

export async function getMyScheduleOverridesForRange(
  startDate: string,
  endDate: string,
): Promise<DataAccessResult<WorkoutScheduleOverrideRow[]>> {
  if (!isValidDateString(startDate) || !isValidDateString(endDate) || startDate > endDate) {
    return fail({
      code: "INVALID_INPUT",
      message: "Schedule override date range is invalid.",
    });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_schedule_overrides")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .gte("plan_date", startDate)
    .lte("plan_date", endDate)
    .order("plan_date", { ascending: true });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load schedule overrides.",
      cause: error.message,
    });
  }
  return ok(asRows<WorkoutScheduleOverrideRow>(data));
}

export async function createWorkoutTemplate(input: CreateTemplateInput): Promise<DataAccessResult<WorkoutTemplateRow>> {
  const name = normalizeTemplateName(input.name);
  if (!name) {
    return fail({ code: "INVALID_INPUT", message: "Template name is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({
      user_id: auth.data.user.id,
      name,
      template_type: input.template_type,
      estimated_duration_minutes: input.estimated_duration_minutes ?? null,
      notes: input.notes?.trim() || null,
      is_archived: false,
    })
    .select("*")
    .single();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create workout template.",
      cause: error.message,
    });
  }
  return ok(asRow<WorkoutTemplateRow>(data)!);
}

export async function updateWorkoutTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput> & { is_archived?: boolean },
): Promise<DataAccessResult<WorkoutTemplateRow>> {
  if (!templateId) {
    return fail({ code: "INVALID_INPUT", message: "Template id is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_templates")
    .update({
      name: input.name ? normalizeTemplateName(input.name) : undefined,
      template_type: input.template_type,
      estimated_duration_minutes: input.estimated_duration_minutes,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      is_archived: input.is_archived,
    })
    .eq("id", templateId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update workout template.",
      cause: error.message,
    });
  }
  const updated = asRow<WorkoutTemplateRow>(data);
  if (!updated) {
    return fail({ code: "NOT_FOUND", message: "Workout template not found." });
  }
  return ok(updated);
}

export async function replaceWorkoutTemplateExercises(
  templateId: string,
  exercises: UpsertTemplateExerciseInput[],
): Promise<DataAccessResult<WorkoutTemplateExerciseRow[]>> {
  if (!templateId) {
    return fail({ code: "INVALID_INPUT", message: "Template id is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const remove = await supabase
    .from("workout_template_exercises")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", auth.data.user.id);
  if (remove.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to replace template exercises.",
      cause: remove.error.message,
    });
  }

  if (exercises.length === 0) {
    return ok([]);
  }

  const insertRows = exercises.map((exercise, index) => ({
    user_id: auth.data.user.id,
    template_id: templateId,
    exercise_id: exercise.exercise_id ?? null,
    catalog_exercise_id: exercise.catalog_exercise_id ?? null,
    exercise_name: exercise.exercise_name.trim(),
    position: exercise.position ?? index,
    notes: exercise.notes?.trim() || null,
    primary_muscles: exercise.primary_muscles ?? [],
    secondary_muscles: exercise.secondary_muscles ?? [],
    body_region: exercise.body_region ?? null,
    movement_pattern: exercise.movement_pattern ?? null,
  }));

  const created = await supabase
    .from("workout_template_exercises")
    .insert(insertRows)
    .select("*");
  if (created.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to save template exercises.",
      cause: created.error.message,
    });
  }
  return ok(asRows<WorkoutTemplateExerciseRow>(created.data));
}

export async function duplicateWorkoutTemplate(templateId: string): Promise<DataAccessResult<WorkoutTemplateRow>> {
  const templates = await getMyWorkoutTemplates();
  if (templates.error) {
    return templates;
  }
  const source = templates.data.find((template) => template.id === templateId);
  if (!source) {
    return fail({ code: "NOT_FOUND", message: "Template not found." });
  }
  const create = await createWorkoutTemplate({
    name: `${source.name} Copy`,
    template_type: source.template_type,
    estimated_duration_minutes: source.estimated_duration_minutes,
    notes: source.notes,
  });
  if (create.error) {
    return create;
  }
  const sourceExercises = await getMyWorkoutTemplateExercises([templateId]);
  if (sourceExercises.error) {
    return sourceExercises;
  }
  const copyRows = sourceExercises.data.map((exercise) => ({
    exercise_id: exercise.exercise_id,
    catalog_exercise_id: exercise.catalog_exercise_id,
    exercise_name: exercise.exercise_name,
    position: exercise.position,
    notes: exercise.notes,
    primary_muscles: exercise.primary_muscles,
    secondary_muscles: exercise.secondary_muscles,
    body_region: exercise.body_region,
    movement_pattern: exercise.movement_pattern,
  }));
  const replace = await replaceWorkoutTemplateExercises(create.data.id, copyRows);
  if (replace.error) {
    return replace;
  }
  return create;
}

export async function setWeekdaySchedule(
  weekday: number,
  input: { template_id: string | null; is_rest_day: boolean },
): Promise<DataAccessResult<WorkoutWeekdayScheduleRow>> {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return fail({ code: "INVALID_INPUT", message: "Weekday must be between 0 and 6." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const existing = await supabase
    .from("workout_weekday_schedule")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("weekday", weekday)
    .maybeSingle();
  if (existing.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weekday schedule row.",
      cause: existing.error.message,
    });
  }

  const payload = {
    template_id: input.template_id,
    is_rest_day: input.is_rest_day,
  };
  if (existing.data) {
    const updated = await supabase
      .from("workout_weekday_schedule")
      .update(payload)
      .eq("id", (existing.data as WorkoutWeekdayScheduleRow).id)
      .eq("user_id", auth.data.user.id)
      .select("*")
      .maybeSingle();
    if (updated.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to update weekday schedule row.",
        cause: updated.error.message,
      });
    }
    const row = asRow<WorkoutWeekdayScheduleRow>(updated.data);
    if (!row) {
      return fail({ code: "NOT_FOUND", message: "Weekday schedule row not found." });
    }
    return ok(row);
  }

  const created = await supabase
    .from("workout_weekday_schedule")
    .insert({
      user_id: auth.data.user.id,
      weekday,
      ...payload,
    })
    .select("*")
    .single();
  if (created.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create weekday schedule row.",
      cause: created.error.message,
    });
  }
  return ok(asRow<WorkoutWeekdayScheduleRow>(created.data)!);
}

export async function setScheduleOverride(
  planDate: string,
  input: SetScheduleOverrideInput,
): Promise<DataAccessResult<WorkoutScheduleOverrideRow>> {
  if (!isValidDateString(planDate)) {
    return fail({ code: "INVALID_INPUT", message: "Plan date must be valid." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const existing = await supabase
    .from("workout_schedule_overrides")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (existing.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load schedule override.",
      cause: existing.error.message,
    });
  }
  const payload = {
    template_id: input.template_id ?? null,
    status: input.status,
    is_rest_day: input.is_rest_day ?? false,
    moved_to_date: input.moved_to_date ?? null,
    moved_from_date: input.moved_from_date ?? null,
    workout_id: input.workout_id ?? null,
    notes: input.notes?.trim() || null,
  };
  if (existing.data) {
    const updated = await supabase
      .from("workout_schedule_overrides")
      .update(payload)
      .eq("id", (existing.data as WorkoutScheduleOverrideRow).id)
      .eq("user_id", auth.data.user.id)
      .select("*")
      .maybeSingle();
    if (updated.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to update schedule override.",
        cause: updated.error.message,
      });
    }
    return ok(asRow<WorkoutScheduleOverrideRow>(updated.data)!);
  }

  const created = await supabase
    .from("workout_schedule_overrides")
    .insert({
      user_id: auth.data.user.id,
      plan_date: planDate,
      ...payload,
    })
    .select("*")
    .single();
  if (created.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create schedule override.",
      cause: created.error.message,
    });
  }
  return ok(asRow<WorkoutScheduleOverrideRow>(created.data)!);
}

export async function clearScheduleOverride(planDate: string): Promise<DataAccessResult<{ id: string }>> {
  if (!isValidDateString(planDate)) {
    return fail({ code: "INVALID_INPUT", message: "Plan date must be valid." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("workout_schedule_overrides")
    .delete()
    .eq("user_id", auth.data.user.id)
    .eq("plan_date", planDate)
    .select("id")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to clear schedule override.",
      cause: error.message,
    });
  }
  const row = asRow<{ id: string }>(data);
  if (!row) {
    return ok({ id: "" });
  }
  return ok(row);
}

export async function getTodayWeekPlannerSeed(): Promise<DataAccessResult<{ startDate: string; endDate: string }>> {
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const today = getTodayDateString(profileTimeZone);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const weekday = todayDate.getUTCDay();
  const distanceFromMonday = (weekday + 6) % 7;
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - distanceFromMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return ok({
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
  });
}

export async function initializePlannerDefaultsIfNeeded(): Promise<DataAccessResult<void>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  return ensureDefaultTemplates();
}
