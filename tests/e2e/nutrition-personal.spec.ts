import { expect, test, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { createAndLogCustomFood } from "./custom-food";
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

async function logCustomFood(page: Page, foodName: string, { create = true }: { create?: boolean } = {}) {
  if (create) {
    await createAndLogCustomFood(page, {
      name: foodName,
      calories: "111",
      protein: "9",
      carbs: "7",
      fat: "3",
    });
    return;
  }
  await page.getByRole("tab", { name: "My Foods" }).click();
  await page.locator("section").filter({ has: page.getByRole("heading", { name: "My Foods" }) }).getByRole("button", { name: new RegExp(`^${foodName}`) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
}

test("recent lists equivalent custom logs once and keeps Frequent aggregation", async ({ page }) => {
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
  await expect(page.getByRole("main").getByText("nutrition_food_favorites")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(/schema cache|PGRST205|Favorites are waiting/i)).toHaveCount(0);

  await logCustomFood(page, foodName);
  await expect(page.locator("li").filter({ hasText: foodName })).toBeVisible();

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await logCustomFood(page, foodName, { create: false });
  await expect(page.locator("li").filter({ hasText: foodName })).toHaveCount(2);

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frequent" })).toBeVisible();
  const recent = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent" }) });
  const frequent = page.locator("section").filter({ has: page.getByRole("heading", { name: "Frequent" }) });
  await expect(recent.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);
  await expect(frequent.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);

  const recentChip = recent.getByRole("button", { name: new RegExp(`^${foodName}`) }).first();
  await recentChip.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Search foods").fill("chicken breast");
  await expect(page.getByRole("button", { name: /^Chicken Breast/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);

  expect(usdaRequests).toEqual([]);
});

test("star tap on a result does not open the portion sheet", async ({ page }) => {
  await login(page);
  const date = uniqueTestDate();
  await page.goto(`/nutrition/add?meal=lunch&date=${date}`);
  await page.getByLabel("Search foods").fill("white rice");
  const row = page.getByRole("button", { name: /^White Rice/i }).first();
  await expect(row).toBeVisible();
  const star = page.getByRole("button", { name: /White Rice.*favorites/i }).first();
  await star.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
