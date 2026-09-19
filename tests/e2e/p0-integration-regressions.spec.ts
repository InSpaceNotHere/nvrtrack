import { expect, test, type Locator, type Page } from "@playwright/test";

function addDays(date: string, delta: number): string {
  const base = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(base + delta * 86400000).toISOString().slice(0, 10);
}

async function signUpFreshUser(page: Page, label: string): Promise<{ email: string; password: string }> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
  const email = `e2e-${label}-${runId}@example.com`;
  const password = `E2E-${label}-${runId}-Aa1!`;
  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL("/", { timeout: 15000 });
  return { email, password };
}

async function openTrainingProgram(page: Page): Promise<void> {
  await page.goto("/training?view=program");
  await expect(page.getByRole("heading", { name: "Workout Planner" })).toBeVisible();
}

async function completeCurrentWorkout(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const completeButton = page.getByRole("button", { name: "Complete Workout" });
    if (!(await completeButton.isVisible().catch(() => false))) {
      break;
    }
    await completeButton.click();
    const confirmButton = page.getByRole("button", { name: "Confirm Complete Without Sets" });
    const confirmVisible = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (confirmVisible) {
      await confirmButton.click();
    }
    await page.waitForTimeout(250);
  }
  await expect(page.getByRole("button", { name: "Complete Workout" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);
}

async function startWorkoutWithDate(page: Page, name: string, date: string): Promise<void> {
  await page.goto("/training/start");
  await page.getByLabel("Workout name").fill(name);
  await page.getByLabel("Workout date").fill(date);
  await page.getByRole("button", { name: "Start Workout" }).click();
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);
}

async function readWorkoutStreakDays(page: Page): Promise<number> {
  const text = (await page.locator("li").filter({ hasText: /Workout streak/i }).first().innerText()).replace(/\s+/g, " ");
  const match = text.match(/Workout streak\s*(\d+)\s*day/i);
  if (!match) {
    throw new Error(`Unable to parse workout streak from: ${text}`);
  }
  return Number(match[1]);
}

async function findScheduledWeeklyRow(page: Page): Promise<Locator> {
  const rows = page.locator("section", { hasText: "Weekly Schedule" }).locator("li");
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const manageToggle = row.getByText("Manage").first();
    if (await manageToggle.count()) {
      await manageToggle.click();
      await page.waitForTimeout(50);
    }
    if (await row.getByRole("button", { name: "Skip" }).count()) {
      return row;
    }
  }
  throw new Error("Unable to find a scheduled weekly row with skip control.");
}

test("P0 planner initialization is explicit and planner schedule mutations remain user-driven", async ({ page }) => {
  await signUpFreshUser(page, "planner");
  await openTrainingProgram(page);

  const createStarterButton = page.getByRole("button", { name: "Create Starter Schedule" });
  await expect(createStarterButton).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Create Starter Schedule" })).toBeVisible();

  await page.goto("/");
  await page.reload();
  await openTrainingProgram(page);
  await expect(page.getByRole("button", { name: "Create Starter Schedule" })).toBeVisible();

  await page.getByRole("button", { name: "Create Starter Schedule" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Starter planner schedule created." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Starter Schedule" })).toHaveCount(0);

  const mondayControl = page.locator("label").filter({ hasText: "Monday" }).first().locator("select");
  await expect(mondayControl).toBeVisible();
  await expect(mondayControl).not.toHaveValue("");

  const moveRow = await findScheduledWeeklyRow(page);
  const moveHeader = (await moveRow.getByText(/• \d{4}-\d{2}-\d{2}/).first().innerText()).trim();
  const moveDate = moveHeader.split("•")[1]?.trim();
  if (!moveDate) {
    throw new Error("Unable to parse move date.");
  }
  const moveTargetDate = addDays(moveDate, 1);

  await moveRow.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Scheduled workout skipped." })).toBeVisible();

  await moveRow.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Schedule override removed." })).toBeVisible();

  await moveRow.locator('input[type="date"]').fill(moveTargetDate);
  await moveRow.getByRole("button", { name: "Move" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Workout moved to a new date." })).toBeVisible();
  await expect(moveRow.getByRole("button", { name: "Reset" })).toBeVisible();

  const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayWeekdayLabel = weekdayLabels[new Date(`${todayDate}T00:00:00.000Z`).getUTCDay()] ?? "Monday";
  const todayControl = page.locator("label").filter({ hasText: todayWeekdayLabel }).first().locator("select");
  const todayOptions = await todayControl.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({ value: (node as HTMLOptionElement).value, label: node.textContent?.trim() ?? "" })),
  );
  const assignableTemplate = todayOptions.find((option) => option.value && option.value !== "__rest__");
  if (!assignableTemplate) {
    throw new Error("No assignable template available for today's weekday.");
  }
  await todayControl.selectOption(assignableTemplate.value);
  await expect(page.getByRole("status").filter({ hasText: "Weekday schedule updated." })).toBeVisible();

  await openTrainingProgram(page);
});

test("P0 strength and streak dashboard signals remain strict for missing tested canonical lifts and duplicate same-day completions", async ({
  page,
}) => {
  await signUpFreshUser(page, "streak");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Strength Snapshot" })).toBeVisible();
  await expect(page.getByText("Bench • Estimated 1RM")).toBeVisible();
  await expect(page.getByText("Squat • Estimated 1RM")).toBeVisible();
  await expect(page.getByText("Deadlift • Estimated 1RM")).toBeVisible();
  await expect(page.getByText("Strength Total • Tested 1RM Only")).toBeVisible();
  await expect(page.getByText("Need tested bench, squat, and deadlift")).toBeVisible();

  const todayDate = new Date().toISOString().slice(0, 10);

  await startWorkoutWithDate(page, `P0 streak workout one ${Date.now()}`, todayDate);
  await completeCurrentWorkout(page);

  await page.goto("/");
  await expect(page.getByText("Workout streak")).toBeVisible();
  const firstStreak = await readWorkoutStreakDays(page);
  await page.goto("/progress");
  await expect(page.getByText("Need tested bench, squat, and deadlift")).toBeVisible();

  await startWorkoutWithDate(page, `P0 streak workout two ${Date.now()}`, todayDate);
  await completeCurrentWorkout(page);

  await page.goto("/");
  const secondStreak = await readWorkoutStreakDays(page);
  expect(secondStreak).toBe(firstStreak);
  await page.goto("/progress");
  await expect(page.getByText("Need tested bench, squat, and deadlift")).toBeVisible();
});
