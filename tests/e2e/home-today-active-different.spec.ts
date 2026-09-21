import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { requiredAppEnv } from "./e2e-env";

async function signUpFreshUser(page: Page, label: string): Promise<{ email: string; password: string }> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-home-${label}-${runId}@example.com`;
  const password = `E2E-home-${label}-${runId}-Aa1!`;

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

async function applyClassicPpl(page: Page): Promise<void> {
  await page.goto("/training?view=plans#ready-made-plans");
  const card = page.locator("article").filter({ hasText: "Classic PPL" }).first();
  await card.getByRole("button", { name: /Preview|Previewing/ }).first().click();

  await page.getByRole("button", { name: "Use Plan" }).first().click();
  const confirm = page.getByRole("button", { name: "Confirm Replace and Use Plan" });
  if ((await confirm.count()) > 0) {
    await confirm.first().click();
  }

  await expect
    .poll(async () => {
      const useText = await page.getByRole("button", { name: /Applying|Use Plan/ }).first().innerText();
      return useText.includes("Use Plan");
    }, { timeout: 30000 })
    .toBe(true);
}

async function assignTodayToPush(page: Page): Promise<void> {
  const weekdayLabel = await page.evaluate(() =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()),
  );

  await page.goto("/training?view=program");
  const row = page.locator("label").filter({ hasText: weekdayLabel }).first();
  await row.locator("select").selectOption({ label: "Classic PPL - Push" });
  await expect
    .poll(async () => row.locator("select").inputValue())
    .not.toBe("");
}

async function getActiveWorkouts(
  client: ReturnType<typeof createClient>,
  userId: string,
): Promise<Array<{ id: string; name: string; workout_date: string }>> {
  const response = await client
    .from("workouts")
    .select("id,name,workout_date")
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("started_at", { ascending: false });
  if (response.error) {
    throw new Error(`Failed to read active workouts: ${response.error.message}`);
  }
  return response.data ?? [];
}

test("home scheduled start does not duplicate workouts on repeated taps", async ({ page }) => {
  const account = await signUpFreshUser(page, "repeat-taps");
  const { client, userId } = await createAuthedClient(account.email, account.password);

  await applyClassicPpl(page);
  await assignTodayToPush(page);

  await page.goto("/");
  await expect(page.getByTestId("home-workout-name")).toContainText("Classic PPL - Push");
  const startButton = page.getByRole("button", { name: "Start Workout" }).first();
  await expect(startButton).toBeVisible();

  await Promise.allSettled([startButton.click(), startButton.click()]);
  await expect
    .poll(async () => (await getActiveWorkouts(client, userId)).length, { timeout: 30000 })
    .toBe(1);

  const activeWorkouts = await getActiveWorkouts(client, userId);
  expect(activeWorkouts).toHaveLength(1);
  expect(activeWorkouts[0]?.name.toLowerCase()).toContain("push");

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Resume Workout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Workout" })).toHaveCount(0);
});

test("home prioritizes different active workout and returns to scheduled start when completed", async ({ page }) => {
  const account = await signUpFreshUser(page, "active-different");
  const { client, userId } = await createAuthedClient(account.email, account.password);

  await applyClassicPpl(page);
  await assignTodayToPush(page);

  await page.goto("/training/start");
  await page.getByLabel("Workout name").fill("Hotel Pump");
  await page.getByRole("button", { name: "Start Workout" }).click();
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);

  const activeBeforeHome = await getActiveWorkouts(client, userId);
  expect(activeBeforeHome).toHaveLength(1);
  const activeWorkoutId = activeBeforeHome[0]?.id;
  if (!activeWorkoutId) {
    throw new Error("Missing active workout id");
  }

  await page.goto("/");
  await expect(page.getByTestId("home-workout-name")).toHaveText("Hotel Pump");
  await expect(page.getByTestId("home-workout-status")).toContainText("Workout in progress");
  await expect(page.getByTestId("home-workout-context")).toContainText("Scheduled today: Classic PPL - Push");
  await expect(page.getByRole("link", { name: "Resume Workout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Workout" })).toHaveCount(0);
  await page.screenshot({ path: "/opt/cursor/artifacts/home_active_different_390x664_safety_fix.png", fullPage: true });

  await page.getByRole("link", { name: "Resume Workout" }).click();
  await expect(page).toHaveURL(new RegExp(`/training/workouts/${activeWorkoutId}(?:\\?.*)?$`));

  const removeResponse = await client
    .from("workouts")
    .delete()
    .eq("id", activeWorkoutId)
    .eq("user_id", userId);
  expect(removeResponse.error).toBeNull();

  await page.goto("/");
  await expect
    .poll(async () => (await getActiveWorkouts(client, userId)).length, { timeout: 30000 })
    .toBe(0);
  await expect(page.getByTestId("home-workout-name")).toContainText("Classic PPL - Push");
  await expect(page.getByRole("button", { name: "Start Workout" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume Workout" })).toHaveCount(0);
});
