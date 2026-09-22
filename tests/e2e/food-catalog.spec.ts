import { expect, test, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-01-${String(day).padStart(2, "0")}`;
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

test("common catalog logging flow with amount edit/delete and custom fallback", async ({ page }) => {
  await login(page);
  const usdaRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.nal.usda.gov")) {
      usdaRequests.push(request.url());
    }
  });

  const date = uniqueTestDate();
  await page.goto(`/nutrition?date=${date}`);
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await expect(page.getByText("Search USDA")).toHaveCount(0);

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByText("Add to Breakfast")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Common" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Foods" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Custom" })).toBeVisible();

  const search = page.getByLabel("Search foods");
  await search.fill("chicken wing cooked");
  await expect(page.getByRole("button", { name: /Chicken Wing/i }).first()).toBeVisible();

  await search.fill("ground beef 85");
  await expect(page.getByRole("button", { name: /Ground Beef 85\/15/i }).first()).toBeVisible();

  await search.fill("rice");
  await expect(page.getByRole("button", { name: /White Rice/i }).first()).toBeVisible();

  await search.fill("blueberries");
  await expect(page.getByRole("button", { name: /Blueberries/i })).toBeVisible();

  await search.fill("greek yogurt");
  await expect(page.getByRole("button", { name: /Greek Yogurt/i }).first()).toBeVisible();

  await search.fill("salmon");
  await expect(page.getByRole("button", { name: /Salmon, farmed/i }).first()).toBeVisible();

  await search.fill("chicken breast");
  await expect(page.getByRole("button", { name: /^Chicken Breast/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Chicken Breast, cooked/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Chicken Breast, raw/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Chicken Wing/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Chicken thigh/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ground chicken/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Turkey/i })).toHaveCount(0);
  await expect(page.getByText(/Chicken, broiler/i)).toHaveCount(0);
  await expect(page.getByText(/FDC/i)).toHaveCount(0);

  await search.fill("ground beef 85");
  await page.getByRole("button", { name: /Ground Beef 85\/15/i }).first().click();
  await page.getByLabel("Amount").fill("100");
  await page.getByRole("radio", { name: "g", exact: true }).click();
  await expect(page.getByText(/kcal/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();

  const logged = page.locator("li").filter({ hasText: "Ground Beef 85/15" }).first();
  await expect(logged).toBeVisible();
  await expect(logged.getByText("100 g")).toBeVisible();
  await expect(page.getByText(/FDC/i)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);

  await page.reload();
  await expect(logged).toBeVisible();

  await logged.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Amount").fill("4");
  await page.getByRole("radio", { name: "oz", exact: true }).click();
  await page.getByRole("button", { name: "Save Entry" }).click();
  await expect(logged.getByText("4 oz")).toBeVisible();

  await page.reload();
  await expect(logged.getByText("4 oz")).toBeVisible();

  await logged.getByRole("button", { name: "Delete" }).click();
  await logged.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.getByText("Ground Beef 85/15")).toHaveCount(0);
  await expect(page.getByText("No food entries logged for this date.")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /database|failed|stack/i })).toHaveCount(0);

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByLabel("Food name").fill(`Manual E2E ${Date.now()}`);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("120");
  await page.getByLabel("Protein g").fill("10");
  await page.getByLabel("Carbohydrates g").fill("8");
  await page.getByLabel("Fat g").fill("4");
  await page.getByRole("button", { name: "Add to Breakfast" }).click();

  const manualEntry = page.locator("li").filter({ hasText: "Manual E2E" }).first();
  await expect(manualEntry).toBeVisible();
  await manualEntry.getByRole("button", { name: "Delete" }).click();
  await manualEntry.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.locator("li").filter({ hasText: "Manual E2E" })).toHaveCount(0);
  expect(usdaRequests).toEqual([]);
});
