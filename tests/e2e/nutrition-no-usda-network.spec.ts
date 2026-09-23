import { expect, test, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-08-${String(day).padStart(2, "0")}`;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(requiredE2EEnv("E2E_TEST_EMAIL"));
  await page.locator('input[autocomplete="current-password"]').fill(requiredE2EEnv("E2E_TEST_PASSWORD"));
  await page.getByRole("button", { name: "Log In" }).click();
  await completeOnboardingIfNeeded(page);
}

test("Add Food never calls USDA or the retired live-search route", async ({ page }) => {
  await login(page);
  const usdaRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("api.nal.usda.gov") || url.includes("/api/usda/search") || url.includes("fdc/v1")) {
      usdaRequests.push(url);
    }
  });

  const date = uniqueTestDate();
  await page.goto(`/nutrition/add?meal=lunch&date=${date}`);
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByText("Search USDA")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Common" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Foods" })).toBeVisible();
  await page.getByLabel("Search foods").fill("chicken breast");
  await expect(page.getByRole("button", { name: /^Chicken Breast/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /^Chicken Breast/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("tab", { name: "Custom" }).click();
  await expect(page.getByRole("link", { name: "Create Custom Food" })).toBeVisible();

  expect(usdaRequests).toEqual([]);
});
