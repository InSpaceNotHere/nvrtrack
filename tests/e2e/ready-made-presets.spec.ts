import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { requiredAppEnv } from "./e2e-env";

interface UserScopedCounts {
  templates: number;
  templateExercises: number;
  scheduleOverrides: number;
  workouts: number;
  workoutExercises: number;
  workoutSets: number;
}

const PRESET_TITLES = [
  "Full Body Basics",
  "Classic PPL",
  "PPL + Upper/Lower",
  "Glute Killer",
  "Arms Killer",
] as const;

const FULL_BODY_EXPECTED_ORDER = [
  "Dumbbell Goblet Squat",
  "Dumbbell Bench Press",
  "Lat Pulldown",
  "Dumbbell Romanian Deadlift",
  "Seated Cable Row",
  "Crunch",
] as const;

async function signUpFreshUser(page: Page, label: string): Promise<{ email: string; password: string }> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-ready-made-${label}-${runId}@example.com`;
  const password = `E2E-ready-${label}-${runId}-Aa1!`;

  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL("/", { timeout: 20000 });
  return { email, password };
}

async function createAuthedClient(email: string, password: string): Promise<{
  client: ReturnType<typeof createClient>;
  userId: string;
}> {
  const supabase = createClient(
    requiredAppEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredAppEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.user) {
    throw new Error(`Unable to sign in test user for DB verification: ${signIn.error?.message ?? "unknown error"}`);
  }

  return { client: supabase, userId: signIn.data.user.id };
}

async function countUserRows(
  client: ReturnType<typeof createClient>,
  table: keyof UserScopedCounts extends never ? never : string,
  userId: string,
): Promise<number> {
  const response = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (response.error) {
    throw new Error(`Failed to count rows in ${table}: ${response.error.message}`);
  }
  return response.count ?? 0;
}

async function getUserCounts(client: ReturnType<typeof createClient>, userId: string): Promise<UserScopedCounts> {
  return {
    templates: await countUserRows(client, "workout_templates", userId),
    templateExercises: await countUserRows(client, "workout_template_exercises", userId),
    scheduleOverrides: await countUserRows(client, "workout_schedule_overrides", userId),
    workouts: await countUserRows(client, "workouts", userId),
    workoutExercises: await countUserRows(client, "workout_exercises", userId),
    workoutSets: await countUserRows(client, "workout_sets", userId),
  };
}

async function getScheduleAssignments(
  client: ReturnType<typeof createClient>,
  userId: string,
): Promise<Array<{ weekday: number; template_id: string | null; is_rest_day: boolean }>> {
  const response = await client
    .from("workout_weekday_schedule")
    .select("weekday, template_id, is_rest_day")
    .eq("user_id", userId)
    .order("weekday", { ascending: true });
  if (response.error) {
    throw new Error(`Failed to read weekday schedule: ${response.error.message}`);
  }
  return response.data ?? [];
}

test("ready-made presets preserve no-write browse, safe scheduling, and structured prescriptions", async ({ page }) => {
  const account = await signUpFreshUser(page, "flow");
  const { client, userId } = await createAuthedClient(account.email, account.password);

  await page.goto("/training?view=program#ready-made-plans");
  await expect(page.getByText("Ready-Made Plans & Workouts")).toBeVisible();

  const countsBeforeBrowse = await getUserCounts(client, userId);
  const scheduleBeforeBrowse = await getScheduleAssignments(client, userId);

  for (const title of PRESET_TITLES) {
    const card = page.getByRole("button").filter({ hasText: title }).first();
    await card.click();
    await expect(page.getByText(title).first()).toBeVisible();
  }

  const countsAfterBrowse = await getUserCounts(client, userId);
  const scheduleAfterBrowse = await getScheduleAssignments(client, userId);
  expect(countsAfterBrowse).toEqual(countsBeforeBrowse);
  expect(scheduleAfterBrowse).toEqual(scheduleBeforeBrowse);

  await page.getByRole("button").filter({ hasText: "Full Body Basics" }).first().click();
  await expect(page.getByText("Proposed weekly schedule")).toBeVisible();
  await expect(page.getByText(/2 x 8-12 reps; rest 2-3 min/).first()).toBeVisible();

  await page.getByRole("button", { name: "Save Templates Only" }).click();
  await expect(page.getByRole("status").filter({ hasText: "templates saved" })).toBeVisible();

  const scheduleBeforePlanApply = await getScheduleAssignments(client, userId);
  expect(scheduleBeforePlanApply.every((entry) => entry.template_id === null && entry.is_rest_day === false)).toBe(
    true,
  );

  const fullBodyTemplates = await client
    .from("workout_templates")
    .select("id, name")
    .eq("user_id", userId)
    .eq("name", "Full Body Basics - Full Body");
  expect(fullBodyTemplates.error).toBeNull();
  expect(fullBodyTemplates.data?.length ?? 0).toBe(1);

  const fullBodyTemplateId = fullBodyTemplates.data?.[0]?.id;
  if (!fullBodyTemplateId) {
    throw new Error("Missing expected Full Body Basics template");
  }

  const templateExercises = await client
    .from("workout_template_exercises")
    .select(
      "position, exercise_name, notes, working_sets, rep_range_min, rep_range_max, rest_seconds_min, rest_seconds_max, is_per_leg",
    )
    .eq("user_id", userId)
    .eq("template_id", fullBodyTemplateId)
    .order("position", { ascending: true });
  expect(templateExercises.error).toBeNull();
  expect(templateExercises.data?.map((entry) => entry.exercise_name)).toEqual(FULL_BODY_EXPECTED_ORDER);
  for (const entry of templateExercises.data ?? []) {
    expect(entry.working_sets).toBeGreaterThanOrEqual(1);
    expect(entry.rep_range_min).toBeGreaterThanOrEqual(1);
    expect(entry.rep_range_max).toBeGreaterThanOrEqual(entry.rep_range_min ?? 1);
    expect(entry.rest_seconds_min).toBeGreaterThanOrEqual(30);
    expect(entry.rest_seconds_max).toBeGreaterThanOrEqual(entry.rest_seconds_min ?? 30);
    expect(entry.notes?.toLowerCase()).toContain("working sets x");
    expect(entry.notes?.toLowerCase()).toContain("rest");
  }

  const mondayControl = page.locator("label").filter({ hasText: "Monday" }).first().locator("select");
  await mondayControl.selectOption("__rest__");
  await expect(page.getByRole("status").filter({ hasText: "Weekday schedule updated." })).toBeVisible();

  await page.getByRole("button", { name: "Use Plan" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "replaces your current weekday assignments" })).toBeVisible();

  const scheduleAfterConfirmPrompt = await getScheduleAssignments(client, userId);
  const mondayBeforeConfirm = scheduleAfterConfirmPrompt.find((entry) => entry.weekday === 1);
  expect(mondayBeforeConfirm?.is_rest_day).toBe(true);

  await page.getByRole("button", { name: "Confirm Replace and Use Plan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "applied to your weekly planner" })).toBeVisible();

  const scheduleAfterApply = await getScheduleAssignments(client, userId);
  const expectedWeekdayPattern: Record<number, "workout" | "rest"> = {
    0: "rest",
    1: "workout",
    2: "rest",
    3: "workout",
    4: "rest",
    5: "workout",
    6: "rest",
  };
  for (const entry of scheduleAfterApply) {
    const expectedKind = expectedWeekdayPattern[entry.weekday];
    if (expectedKind === "workout") {
      expect(entry.template_id).toBeTruthy();
      expect(entry.is_rest_day).toBe(false);
    } else {
      expect(entry.template_id).toBeNull();
      expect(entry.is_rest_day).toBe(true);
    }
  }

  await page.getByRole("button").filter({ hasText: "Glute Killer" }).first().click();
  await page.getByRole("button", { name: "Save Workout" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Glute Killer saved to your templates." })).toBeVisible();

  await page.getByRole("button").filter({ hasText: "Arms Killer" }).first().click();
  await page.getByRole("button", { name: "Save Workout" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Arms Killer saved to your templates." })).toBeVisible();

  const scheduleAfterFocusedSaves = await getScheduleAssignments(client, userId);
  expect(scheduleAfterFocusedSaves).toEqual(scheduleAfterApply);

  await page.getByRole("button", { name: "Quick Start" }).click();
  await page.waitForURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);

  const workoutId = page.url().split("/training/workouts/")[1]?.split(/[?#]/)[0];
  if (!workoutId) {
    throw new Error(`Failed to parse workout id from URL: ${page.url()}`);
  }

  await expect(page.getByText(/6 Exercises/i)).toBeVisible();
  await expect(page.getByText(/0 completed sets/i)).toBeVisible();
  await expect(page.getByText(/^0 (lb|kg)$/i)).toBeVisible();
  await expect(page.getByText(/working sets x 8-12 reps; rest 2-3 min\./i)).toBeVisible();
  await expect(page.getByText(/potential estimated pr/i)).toHaveCount(0);

  const workoutExercises = await client
    .from("workout_exercises")
    .select("id, position, exercise_name")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .order("position", { ascending: true });
  expect(workoutExercises.error).toBeNull();
  expect(workoutExercises.data?.map((entry) => entry.exercise_name)).toEqual(FULL_BODY_EXPECTED_ORDER);

  const exerciseIds = (workoutExercises.data ?? []).map((entry) => entry.id);
  if (exerciseIds.length === 0) {
    throw new Error("Expected imported workout exercises to exist");
  }

  const workoutSets = await client
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("workout_exercise_id", exerciseIds);
  expect(workoutSets.error).toBeNull();
  expect(workoutSets.count ?? 0).toBe(0);

  const workout = await client
    .from("workouts")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("id", workoutId)
    .maybeSingle();
  expect(workout.error).toBeNull();
  expect(workout.data?.completed_at).toBeNull();
});
