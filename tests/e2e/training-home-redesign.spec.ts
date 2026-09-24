import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredAppEnv } from "./e2e-env";

test.setTimeout(120_000);

async function signUpFreshUser(page: Page): Promise<{ email: string; password: string }> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-training-home-${runId}@example.com`;
  const password = `E2E-train-${runId}-Aa1!`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await completeOnboardingIfNeeded(page);
  return { email, password };
}

async function createAuthedClient(email: string, password: string) {
  const supabase = createClient(requiredAppEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredAppEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.user) {
    throw new Error(signIn.error?.message ?? "sign-in failed");
  }
  return { client: supabase, userId: signIn.data.user.id };
}

test("training home empty state, program management, and remove keep history", async ({ page }) => {
  const account = await signUpFreshUser(page);
  const { client, userId } = await createAuthedClient(account.email, account.password);

  await page.goto("/training");
  await expect(page.getByTestId("training-no-program")).toBeVisible();
  await expect(page.getByTestId("training-choose-plan")).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose a Plan" })).toHaveCount(1);
  await expect(page.getByText("Training Tools")).toHaveCount(0);
  await expect(page.getByText("No completed workouts yet.")).toHaveCount(0);

  await page.getByTestId("training-choose-plan").click();
  await expect(page).toHaveURL(/view=plans/);
  const card = page.locator("article").filter({ hasText: "Classic PPL" }).first();
  await card.getByRole("button", { name: /Preview|Previewing/ }).first().click();
  await page.getByRole("button", { name: "Use Plan" }).click();
  const confirm = page.getByRole("button", { name: "Confirm Replace and Use Plan" });
  if ((await confirm.count()) > 0) {
    await confirm.click();
  }
  await expect(page.getByRole("status").filter({ hasText: /applied to your weekly planner/i })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/training?view=program");
  await page.getByRole("button", { name: "Quick Start" }).click();
  await page.waitForURL(/\/training\/workouts\/[^/?]+/);
  await page.goto("/training");
  await expect(page.getByTestId("training-active-hero")).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume Workout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Workout" })).toHaveCount(0);
  await expect(page.getByTestId("training-current-program")).toBeVisible();
  await expect(page.getByText("Classic PPL").first()).toBeVisible();

  const historyBefore = await client.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const templatesBefore = await client.from("workout_templates").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const setsBefore = await client.from("workout_sets").select("id", { count: "exact", head: true }).eq("user_id", userId);

  await page.getByTestId("training-remove-program").click();
  const dialog = page.getByTestId("training-remove-confirm");
  await expect(dialog).toBeVisible();
  const confirmRemove = dialog.getByRole("button", { name: "Remove Program" });
  await confirmRemove.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByTestId("training-no-program")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: /history is unchanged/i })).toBeVisible();

  const schedule = await client.from("workout_weekday_schedule").select("template_id, is_rest_day").eq("user_id", userId);
  expect((schedule.data ?? []).every((row) => !row.template_id && row.is_rest_day === false)).toBe(true);

  const historyAfter = await client.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const templatesAfter = await client.from("workout_templates").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const setsAfter = await client.from("workout_sets").select("id", { count: "exact", head: true }).eq("user_id", userId);
  expect(historyAfter.count).toBe(historyBefore.count);
  expect(templatesAfter.count).toBe(templatesBefore.count);
  expect(setsAfter.count).toBe(setsBefore.count);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start Workout" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Resume Workout" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto("/training?fixture=active-scheduled");
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_active_390x664.png" });
  await page.goto("/training?fixture=scheduled");
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_scheduled_390x664.png" });
  await page.goto("/training?fixture=rest");
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_rest_390x664.png" });
  await page.goto("/training?fixture=scheduled");
  await page.getByTestId("training-remove-program").click();
  await expect(page.getByTestId("training-remove-confirm")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_remove_confirm_390x664.png" });
  await page.getByRole("button", { name: "Keep Program" }).click();
  await page.goto("/training?fixture=uninitialized");
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_no_program_390x664.png" });
  const currentProgramShot = page.getByTestId("training-current-program");
  await page.goto("/training?fixture=scheduled");
  await expect(currentProgramShot).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/training_redesign_current_program_390x664.png" });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  fs.writeFileSync(
    "/opt/cursor/artifacts/training_redesign_page_height.json",
    JSON.stringify({ afterScrollHeight: height, viewport: "390x664" }, null, 2),
  );
});
