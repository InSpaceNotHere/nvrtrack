import { expect, test, type Page } from "@playwright/test";
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

async function addCatalogBenchPress(page: Page) {
  const panel = page.getByTestId("add-exercise-panel");
  await panel.getByRole("button", { name: /^Open$/ }).click();
  await panel.getByLabel("Search catalog").fill("bench");
  await panel.getByRole("button", { name: /^Barbell Bench Press\b/i }).first().click();
  await panel.getByRole("button", { name: "Add Catalog Exercise" }).click();
  await expect(panel.getByLabel("Search catalog")).toHaveCount(0);
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

    const benchExerciseCards = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Barbell Bench Press" }) });

    await expect(benchExerciseCards).toHaveCount(2);

    const secondCard = benchExerciseCards.nth(1);
    const switchSecond = secondCard.getByRole("button", { name: "Switch to Exercise" });
    if ((await switchSecond.count()) > 0) {
      await switchSecond.click();
    }
    await secondCard.getByRole("button", { name: "Remove Exercise" }).click();
    await secondCard.getByRole("button", { name: "Confirm Remove" }).click();

    await expect(benchExerciseCards).toHaveCount(1);
    await expect(page.getByRole("alert").filter({ hasText: "Workout exercise not found." })).toHaveCount(0);

    await page.reload();
    await expect(benchExerciseCards).toHaveCount(1);

    const finalCard = benchExerciseCards.nth(0);
    const switchFinal = finalCard.getByRole("button", { name: "Switch to Exercise" });
    if ((await switchFinal.count()) > 0) {
      await switchFinal.click();
    }
    await finalCard.getByRole("button", { name: "Remove Exercise" }).click();
    await finalCard.getByRole("button", { name: "Confirm Remove" }).click();

    await expect(benchExerciseCards).toHaveCount(0);
    await expect(page.getByText("No exercises in this workout yet.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Workout exercise not found." })).toHaveCount(0);
  } finally {
    await cleanupWorkout(page);
  }
});
