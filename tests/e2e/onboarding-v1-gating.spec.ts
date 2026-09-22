import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { requiredAppEnv } from "./e2e-env";

test.setTimeout(90_000);

async function signUpFreshUser(page: Page, label: string): Promise<{ email: string; password: string }> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-onboarding-gate-${label}-${runId}@example.com`;
  const password = `E2E-onboarding-gate-${label}-${runId}-Aa1!`;

  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });
  return { email, password };
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
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

test("onboarding gate only allows matching active workout route for incomplete users", async ({ page }) => {
  const account = await signUpFreshUser(page, "active-workout");
  const { client, userId } = await createAuthedClient(account.email, account.password);

  const createWorkout = await client
    .from("workouts")
    .insert({
      user_id: userId,
      name: "Onboarding continuity workout",
      workout_date: new Date().toISOString().slice(0, 10),
      started_at: new Date().toISOString(),
      completed_at: null,
    })
    .select("id")
    .single();
  expect(createWorkout.error).toBeNull();
  const workoutId = createWorkout.data?.id;
  if (!workoutId) {
    throw new Error("Failed to create active workout for onboarding continuity test.");
  }

  const createExercise = await client.from("workout_exercises").insert({
    user_id: userId,
    workout_id: workoutId,
    exercise_name: "Continuity Bench",
    position: 0,
  });
  expect(createExercise.error).toBeNull();

  await page.goto(`/training/workouts/${workoutId}`);
  await expect(page.getByRole("heading", { name: "Workout Logger" })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/, { timeout: 15_000 });

  const completeWorkout = await client
    .from("workouts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", userId);
  expect(completeWorkout.error).toBeNull();

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/, { timeout: 15_000 });
});

test("logout/login mid-onboarding returns user to onboarding", async ({ page }) => {
  const account = await signUpFreshUser(page, "logout-midflow");
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /Get Started|Continue/ }).click();
  await expect(page.getByRole("heading", { name: "What are you working toward?" })).toBeVisible();
  await page.getByRole("button", { name: "Build muscle" }).click();
  await expect(page.getByRole("heading", { name: "How experienced are you with training?" })).toBeVisible();

  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 15_000 });

  await login(page, account.email, account.password);
  await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/, { timeout: 20_000 });
});

test("onboarding shows visible save errors and profile preferences show save success", async ({ page }) => {
  await signUpFreshUser(page, "feedback");
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /Get Started|Continue/ }).click();

  await page.getByRole("button", { name: "Build muscle" }).click();
  await expect(page.getByRole("heading", { name: "How experienced are you with training?" })).toBeVisible();
  await page.getByRole("button", { name: "Some experience" }).click();

  await expect(page.getByRole("heading", { name: "How many days per week would you like to train?" })).toBeVisible();
  await page.getByRole("button", { name: "4" }).click();

  await expect(page.getByRole("heading", { name: "Where do you usually train?" })).toBeVisible();
  await page.getByRole("button", { name: "Mixed" }).click();

  await expect(page.getByRole("heading", { name: "How tall are you?" })).toBeVisible();
  await page.locator('input[placeholder="5"]').fill("9");
  await page.locator('input[placeholder="8"]').fill("11");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Please fix your height input before continuing.")).toBeVisible();
  await expect(page.getByText("Feet must be between 3 and 8.")).toBeVisible();

  await page.locator('input[placeholder="5"]').fill("");
  await page.locator('input[placeholder="8"]').fill("");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "How did you hear about NVRTRACK?" })).toBeVisible();
  await page.getByRole("button", { name: "Google / Search" }).click();
  await expect(page.getByRole("heading", { name: "You’re all set." })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  await page.goto("/profile?view=training-preferences");
  await page.getByRole("button", { name: "Save Preferences" }).click();
  await expect(page.getByText("Training preferences saved.")).toBeVisible();
});
