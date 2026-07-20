import { expect, test, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

const COOKED_CHICKEN_LABEL = "Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised";
const RAW_CHICKEN_LABEL = "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw";
const POULTRY_EXPANDED_LABEL = "Chicken, broilers or fryers, wing, meat and skin, cooked, roasted";
const GROUND_BEEF_85_LABEL = "Beef, ground, 85% lean meat / 15% fat, raw (Includes foods for USDA's Food Distribution Program)";
const RICE_EXPANDED_LABEL = "Rice, white, medium-grain, enriched, cooked";
const FRUIT_EXPANDED_LABEL = "Blueberries, raw";
const DAIRY_EXPANDED_LABEL = "Yogurt, Greek, plain, lowfat";
const SALMON_RAW_LABEL = "Fish, salmon, Atlantic, farmed, raw";
const SALMON_COOKED_LABEL = "Fish, salmon, Atlantic, farmed, cooked, dry heat";

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
  await expect(page).toHaveURL("/");
}

async function openComposer(page: Page) {
  await page.getByRole("button", { name: "Add Food" }).first().click();
  await page.getByRole("button", { name: "Common", exact: true }).click();
}

test("common catalog logging flow with amount edit/delete and manual fallback", async ({ page }) => {
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

  await openComposer(page);
  const commonResults = page.locator("div.max-h-56");
  const initialCommonButtons = commonResults.locator("button");
  const initialCount = await initialCommonButtons.count();
  expect(initialCount).toBeGreaterThan(0);
  expect(initialCount).toBeLessThanOrEqual(40);

  await page.getByLabel("Search Common foods").fill("chicken wing cooked");
  await expect(commonResults.getByText(POULTRY_EXPANDED_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("ground beef 85");
  await expect(commonResults.getByText(GROUND_BEEF_85_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("rice medium");
  await expect(commonResults.getByText(RICE_EXPANDED_LABEL).first()).toBeVisible();

  await page.getByLabel("Search Common foods").fill("blueberries");
  await expect(commonResults.getByText(FRUIT_EXPANDED_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("greek yogurt lowfat");
  await expect(commonResults.getByText(DAIRY_EXPANDED_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("salmon atlantic farmed");
  await expect(commonResults.getByText(SALMON_RAW_LABEL)).toBeVisible();
  await expect(commonResults.getByText(SALMON_COOKED_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("chicken breast");

  await expect(commonResults.getByText(COOKED_CHICKEN_LABEL)).toBeVisible();
  await expect(commonResults.getByText(RAW_CHICKEN_LABEL)).toBeVisible();

  await page.getByLabel("Search Common foods").fill("ground beef 85");
  const groundBeefOption = commonResults.locator("button").filter({
    hasText: "Beef, ground, 85% lean meat / 15% fat, raw",
  });
  await expect(groundBeefOption.first()).toBeVisible();
  await groundBeefOption.first().click();
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Unit").selectOption("g");
  await expect(page.getByText(/Calories:/i)).toBeVisible();
  await page.getByRole("button", { name: "Log Common Food" }).click();

  const cookedEntry = page.locator("li").filter({ has: page.getByText(GROUND_BEEF_85_LABEL) }).first();
  await expect(cookedEntry).toBeVisible();
  await expect(cookedEntry.getByText("100 g")).toBeVisible();

  await page.reload();
  await expect(cookedEntry).toBeVisible();

  await cookedEntry.getByRole("button", { name: "Edit" }).click();
  await cookedEntry.getByLabel("Amount").fill("4");
  await cookedEntry.getByLabel("Unit").selectOption("oz");
  await cookedEntry.getByRole("button", { name: "Save Entry" }).click();
  await expect(cookedEntry.getByText("4 oz")).toBeVisible();

  await page.reload();
  await expect(cookedEntry.getByText("4 oz")).toBeVisible();

  await cookedEntry.getByRole("button", { name: "Delete" }).click();
  await cookedEntry.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.getByText(GROUND_BEEF_85_LABEL)).toHaveCount(0);
  await expect(page.getByText("No food entries logged for this date.")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /database|failed|stack/i })).toHaveCount(0);

  await openComposer(page);
  await page.getByRole("button", { name: "Manual Label", exact: true }).click();
  await page.getByLabel("Food name").fill(`Manual E2E ${Date.now()}`);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("120");
  await page.getByLabel("Protein g").fill("10");
  await page.getByLabel("Carbohydrates g").fill("8");
  await page.getByLabel("Fat g").fill("4");
  await page.getByRole("button", { name: "Log Custom Entry" }).click();

  const manualEntry = page.locator("li").filter({ hasText: "Manual E2E" }).first();
  await expect(manualEntry).toBeVisible();
  await manualEntry.getByRole("button", { name: "Delete" }).click();
  await manualEntry.getByRole("button", { name: "Confirm Delete" }).click();
  await expect(page.locator("li").filter({ hasText: "Manual E2E" })).toHaveCount(0);
  expect(usdaRequests).toEqual([]);
});
