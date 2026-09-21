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

test("catalog add exercise panel supports select, add, close, and reopen", async ({ page }) => {
  await login(page);

  await page.goto("/training/start");
  await page.getByLabel("Workout name").fill(`E2E Catalog ${Date.now()}`);
  await page.getByRole("button", { name: "Start Workout" }).click();
  await expect(page).toHaveURL(/\/training\/workouts\/[^/?]+(?:\?.*)?$/);

  const addPanel = page.getByTestId("add-exercise-panel");
  const openButton = addPanel.getByRole("button", { name: /^Open$/ });
  await openButton.click();

  const searchInput = addPanel.getByLabel("Search catalog");
  const addCatalogButton = addPanel.getByRole("button", { name: "Add Catalog Exercise" });

  await expect(searchInput).toBeVisible();
  await expect(addCatalogButton).toBeDisabled();

  await searchInput.fill("bench");
  const benchOption = addPanel
    .getByRole("button", { name: /^Barbell Bench Press\b/i })
    .first();

  await benchOption.click();
  await expect(benchOption).toHaveAttribute("aria-pressed", "true");
  await expect(addCatalogButton).toBeEnabled();

  await addCatalogButton.click();
  await expect(addPanel.getByLabel("Search catalog")).toHaveCount(0);
  await expect(addPanel.getByRole("button", { name: /^Open$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Barbell Bench Press" }).first()).toBeVisible();

  await addPanel.getByRole("button", { name: /^Open$/ }).click();
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toHaveValue("");
  await expect(addCatalogButton).toBeDisabled();

  await addPanel.getByRole("button", { name: /^Close$/ }).click();
  await expect(addPanel.getByLabel("Search catalog")).toHaveCount(0);
});
