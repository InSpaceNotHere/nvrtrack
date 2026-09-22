import { expect, test, type Page } from "@playwright/test";
import { requiredE2EEnv } from "./e2e-env";

async function login(page: Page) {
  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL("/", { timeout: 20_000 });
}

async function addCatalogBenchPress(page: Page) {
  const panel = page.getByTestId("add-exercise-panel");
  await panel.getByRole("button", { name: /^Open$/ }).click();
  await panel.getByLabel("Search catalog").fill("bench");
  await panel.getByRole("button", { name: /^Barbell Bench Press\b/i }).first().click();
  await panel.getByRole("button", { name: "Add Catalog Exercise" }).click();
  await expect(panel.getByLabel("Search catalog")).toHaveCount(0);
}

async function selectExerciseByName(page: Page, name: string, index = 0) {
  const switcher = page.getByTestId("exercise-switcher");
  const chip = switcher.getByRole("button").filter({ hasText: name }).nth(index);
  await chip.click();
  await expect(page.getByRole("heading", { name }).first()).toBeVisible();
}

async function cleanupWorkout(page: Page) {
  if (!/\/training\/workouts\/[^/?]+(?:\?.*)?$/.test(page.url())) {
    return;
  }

  let deleteButton = page.getByRole("button", { name: "Delete Workout" }).first();
  if ((await deleteButton.count()) === 0) {
    const settingsToggle = page.getByText("Workout Details & Settings").first();
    if ((await settingsToggle.count()) > 0) {
      await settingsToggle.click();
    }
    deleteButton = page.getByRole("button", { name: "Delete Workout" }).first();
  }
  if ((await deleteButton.count()) === 0) {
    return;
  }

  await deleteButton.click();
  await page.getByRole("button", { name: "Confirm Delete Workout" }).first().click();
  await expect(page).toHaveURL("/training");
}

test("remove exercise deletes exact workout_exercises row and keeps duplicates stable", async ({ page }) => {
  await login(page);

  try {
    await page.goto("/training/start");
    await page.getByLabel("Workout name").fill(`E2E Remove ${Date.now()}`);
    await page.getByRole("button", { name: "Start Workout" }).click();
    await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);

    await addCatalogBenchPress(page);
    await addCatalogBenchPress(page);

    const benchSwitches = page.getByTestId("exercise-switcher").getByRole("button").filter({ hasText: "Barbell Bench Press" });
    await expect(benchSwitches).toHaveCount(2);

    await selectExerciseByName(page, "Barbell Bench Press", 1);
    await page.getByText("Exercise actions").first().click();
    await page.getByRole("button", { name: "Remove Exercise" }).first().click();
    await page.getByRole("button", { name: "Confirm Remove Exercise" }).first().click();

    await expect(benchSwitches).toHaveCount(1);
    await expect(page.getByRole("alert").filter({ hasText: "Workout exercise not found." })).toHaveCount(0);

    await page.reload();
    await expect(benchSwitches).toHaveCount(1);

    await selectExerciseByName(page, "Barbell Bench Press", 0);
    await page.getByText("Exercise actions").first().click();
    await page.getByRole("button", { name: "Remove Exercise" }).first().click();
    await page.getByRole("button", { name: "Confirm Remove Exercise" }).first().click();

    await expect(benchSwitches).toHaveCount(0);
    await expect(page.getByText("No exercises in this workout yet.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Workout exercise not found." })).toHaveCount(0);
  } finally {
    await cleanupWorkout(page);
  }
});
