import { expect, test, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-04-${String(day).padStart(2, "0")}`;
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

test("recent lists newly logged foods and omits empty personal sections", async ({ page }) => {
  await login(page);
  const usdaRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.nal.usda.gov")) {
      usdaRequests.push(request.url());
    }
  });

  const date = uniqueTestDate();
  const foodName = `Speed Layer ${Date.now()}`;
  await page.goto(`/nutrition?date=${date}`);
  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByText("No recent foods")).toHaveCount(0);
  await expect(page.getByText("No frequent foods")).toHaveCount(0);
  await expect(page.getByText("No favorites")).toHaveCount(0);

  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByLabel("Food name").fill(foodName);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("111");
  await page.getByLabel("Protein g").fill("9");
  await page.getByLabel("Carbohydrates g").fill("7");
  await page.getByLabel("Fat g").fill("3");
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await expect(page.locator("li").filter({ hasText: foodName })).toBeVisible();

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  const recentChip = page.getByRole("button", { name: new RegExp(`^${foodName}`) }).first();
  await expect(recentChip).toBeVisible();
  await recentChip.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Search foods").fill("chicken breast");
  await expect(page.getByRole("button", { name: /^Chicken Breast/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);

  await page.getByRole("button", { name: /Add Chicken Breast to favorites/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  expect(usdaRequests).toEqual([]);
});

test("star tap on a result does not open the portion sheet", async ({ page }) => {
  await login(page);
  const date = uniqueTestDate();
  await page.goto(`/nutrition/add?meal=lunch&date=${date}`);
  await page.getByLabel("Search foods").fill("white rice");
  const row = page.getByRole("button", { name: /White Rice/i }).first();
  await expect(row).toBeVisible();
  const star = page.getByRole("button", { name: /White Rice.*favorites/i }).first();
  await star.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
