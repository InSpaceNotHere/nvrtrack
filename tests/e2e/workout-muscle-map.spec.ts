import { expect, test, type Locator, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

async function login(page: Page) {
  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL("/");
}

async function startWorkout(page: Page, workoutName: string) {
  await page.goto("/training/start");
  await page.getByLabel("Workout name").fill(workoutName);
  await page.getByRole("button", { name: "Start Workout" }).click();
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);
}

async function openAddPanel(page: Page): Promise<Locator> {
  const panel = page.getByTestId("add-exercise-panel");
  const closeButton = panel.getByRole("button", { name: /^Close$/ });
  if ((await closeButton.count()) > 0) {
    return panel;
  }
  await panel.getByRole("button", { name: /^Open$/ }).click();
  await expect(panel.getByRole("button", { name: /^Close$/ })).toBeVisible();
  return panel;
}

async function addCatalogExercise(page: Page, searchTerm: string, optionName: RegExp) {
  const panel = await openAddPanel(page);
  await panel.getByLabel("Search catalog").fill(searchTerm);
  await panel.getByRole("button", { name: optionName }).first().click();
  await panel.getByRole("button", { name: "Add Catalog Exercise" }).click();
  await expect(page.getByRole("heading", { name: optionName }).first()).toBeVisible();
  const closeButton = panel.getByRole("button", { name: /^Close$/ });
  if ((await closeButton.count()) > 0) {
    await closeButton.click();
  }
  await expect(panel.getByRole("button", { name: /^Open$/ })).toBeVisible();
}

async function removeExerciseCardByName(page: Page, name: string) {
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name }) })
    .first();
  await card.getByRole("button", { name: "Remove Exercise" }).click();
  await card.getByRole("button", { name: "Confirm Remove" }).click();
}

async function completeWorkout(page: Page) {
  await page.getByRole("button", { name: "Complete Workout" }).click();
  const confirmButton = page.getByRole("button", { name: "Confirm Complete Without Sets" });
  if (await confirmButton.count()) {
    await confirmButton.click();
  }
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);
  if (!/view=summary/.test(page.url())) {
    await page.goto(`${page.url()}?view=summary`);
  }
  await expect(page).toHaveURL(/view=summary/);
}

async function deleteWorkoutByName(page: Page, workoutName: string) {
  await page.goto("/training/history");
  const item = page.locator("li").filter({ hasText: workoutName }).first();
  if ((await item.count()) === 0) {
    return;
  }
  await item.getByRole("button", { name: "Delete" }).click();
  await item.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(item).toHaveCount(0);
}

async function createCustomExercise(page: Page, customExerciseName: string) {
  await page.goto("/training/exercises");
  const createSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Create Custom Exercise" }) }).first();

  await createSection.getByLabel("Name").fill(customExerciseName);
  await createSection.getByLabel("Body region").selectOption("upper_body");
  await createSection.getByLabel("Movement pattern").selectOption("horizontal_press");

  const fieldsets = createSection.locator("fieldset");
  const primaryFieldset = fieldsets.filter({ hasText: "Primary muscles" });
  const secondaryFieldset = fieldsets.filter({ hasText: "Secondary muscles" });
  await primaryFieldset.getByLabel("Chest").check();
  await secondaryFieldset.getByLabel("Triceps").check();

  await createSection.getByRole("button", { name: "Create custom exercise" }).click();
  await expect(page.getByText("Custom exercise created.")).toBeVisible();
}

async function deleteCustomExercise(page: Page, customExerciseName: string) {
  await page.goto("/training/exercises");
  const item = page.locator("li").filter({ hasText: customExerciseName }).first();
  if ((await item.count()) === 0) {
    return;
  }
  await item.getByRole("button", { name: "Delete" }).click();
  await expect(item).toHaveCount(0);
}

test("workout muscle map updates live and persists to summary", async ({ page }) => {
  await login(page);

  const runId = Date.now();
  const primaryWorkoutName = `E2E Muscle Map ${runId}`;
  const customExerciseName = `E2E Custom Press ${runId}`;
  const customWorkoutName = `E2E Custom Workout ${runId}`;

  try {
    await startWorkout(page, primaryWorkoutName);

    await addCatalogExercise(page, "bench", /^Barbell Bench Press\b/i);
    await addCatalogExercise(page, "pushdown", /^Triceps Pushdown\b/i);

    const rankedList = page.getByTestId("workout-muscle-ranked-list");
    await expect(rankedList).toContainText("Chest");
    await expect(rankedList).toContainText("Triceps");

    await addCatalogExercise(page, "pull-up", /^Pull-Up\b/i);
    await expect(rankedList).toContainText("Upper back");

    await removeExerciseCardByName(page, "Pull-Up");
    await expect(rankedList).not.toContainText("Upper back");

    await page.reload();
    await expect(rankedList).toContainText("Chest");
    await expect(rankedList).toContainText("Triceps");
    await expect(rankedList).not.toContainText("Upper back");

    await completeWorkout(page);
    await expect(page.getByTestId("workout-muscle-map")).toBeVisible();
    await expect(page.getByText(/Derived from exercise muscle metadata snapshots/i)).toBeVisible();

    await createCustomExercise(page, customExerciseName);

    await startWorkout(page, customWorkoutName);
    const panel = await openAddPanel(page);
    await panel.getByRole("button", { name: "Custom Fallback" }).click();
    await panel.getByLabel("Use existing custom exercise (optional)").selectOption({ label: customExerciseName });
    await panel.getByRole("button", { name: "Add Custom Exercise" }).click();
    await expect(page.getByRole("heading", { name: customExerciseName }).first()).toBeVisible();

    await expect(rankedList).toContainText("Chest");
  } finally {
    await deleteWorkoutByName(page, customWorkoutName);
    await deleteWorkoutByName(page, primaryWorkoutName);
    await deleteCustomExercise(page, customExerciseName);
  }
});
