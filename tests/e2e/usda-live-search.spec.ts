import { expect, test, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-02-${String(day).padStart(2, "0")}`;
}

async function login(page: Page) {
  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  await completeOnboardingIfNeeded(page);
}

test("live USDA search is removed from the Nutrition UI", async ({ page }) => {
  await login(page);
  const usdaNetworkRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.nal.usda.gov") || request.url().includes("/api/usda/search")) {
      usdaNetworkRequests.push(request.url());
    }
  });

  const date = uniqueTestDate();
  await page.goto(`/nutrition?date=${date}`);
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search USDA", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Search USDA foods")).toHaveCount(0);

  await page.getByRole("link", { name: "Add Food to Lunch" }).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByText("Search USDA")).toHaveCount(0);
  await expect(page.getByText(/FDC/i)).toHaveCount(0);
  await expect(page.getByText(/SR Legacy/i)).toHaveCount(0);
  await page.getByLabel("Search foods").fill("chicken breast");
  await expect(page.getByRole("button", { name: /Chicken Breast/i }).first()).toBeVisible();
  await expect(page.getByText(/Chicken, broiler/i)).toHaveCount(0);

  expect(usdaNetworkRequests).toEqual([]);
});
