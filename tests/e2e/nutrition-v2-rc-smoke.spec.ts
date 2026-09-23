import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { createAndLogCustomFood, openCreateCustomFood } from "./custom-food";

test.setTimeout(240_000);

const ARTIFACTS = "/opt/cursor/artifacts";

async function signupIsolated(page: Page) {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `rc-iso-${runId}@example.com`;
  const password = `Rc-${runId}-Aa1!`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await completeOnboardingIfNeeded(page);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
    };
  });
  expect(overflow.scrollWidth, `horizontal overflow at ${overflow.clientWidth}px`).toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  );
}

async function shot(page: Page, name: string) {
  const localDir = path.join(process.cwd(), "test-results", "rc-screenshots");
  fs.mkdirSync(localDir, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const localPath = path.join(localDir, name);
  await page.screenshot({ path: localPath, fullPage: true });
  fs.copyFileSync(localPath, path.join(ARTIFACTS, name));
}

async function calorieFigure(page: Page) {
  const text = await page.locator("section").filter({ hasText: "Calories" }).first().innerText();
  const match = text.match(/(\d+)/);
  return match?.[1] ?? text;
}

test("Nutrition V2 RC isolated account smoke, viewports, and no USDA", async ({ page }) => {
  const usdaRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("api.nal.usda.gov") || url.includes("/api/usda/search") || url.includes("fdc/v1")) {
      usdaRequests.push(url);
    }
  });

  await page.setViewportSize({ width: 390, height: 664 });
  await signupIsolated(page);

  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lunch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dinner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Snacks" })).toBeVisible();
  await expect(page.getByText("No food entries logged for this date.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);
  await shot(page, "nutrition_today_empty_390.png");
  await assertNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Previous day" }).click();
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await page.getByRole("link", { name: "Next day" }).click();
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await expect(page.getByText("No food entries logged for this date.")).toBeVisible();

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByText("Add to Breakfast")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Frequent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Favorites" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Common" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Foods" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Custom" })).toBeVisible();
  await shot(page, "add_food_empty_personal_390.png");
  await assertNoHorizontalOverflow(page);

  await page.getByRole("tab", { name: "My Foods" }).click();
  await expect(page.getByRole("heading", { name: "My Foods" })).toBeVisible();
  await shot(page, "add_food_my_foods_empty_390.png");

  await page.getByRole("tab", { name: "Custom" }).click();
  await expect(page.getByRole("link", { name: "Create Custom Food" })).toBeVisible();
  await shot(page, "add_food_custom_tab_390.png");

  await page.getByRole("tab", { name: "Common" }).click();
  await page.getByLabel("Search foods").fill("chicken breast");
  await expect(page.getByRole("button", { name: /^Chicken Breast/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Chicken Breast, cooked/i })).toHaveCount(0);
  await expect(page.getByText(/Chicken, broiler/i)).toHaveCount(0);
  await expect(page.getByText(/FDC/i)).toHaveCount(0);
  await shot(page, "add_food_search_grouped_390.png");

  await page.getByRole("button", { name: /^Chicken Breast/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("radio", { name: "g", exact: true }).click();
  await page.getByLabel("Amount").fill("100");
  await expect(page.getByText(/kcal/i).first()).toBeVisible();
  await page.getByRole("radio", { name: "oz", exact: true }).click();
  await page.getByRole("radio", { name: "serving", exact: true }).click();
  await page.getByRole("radio", { name: "g", exact: true }).click();
  await shot(page, "portion_sheet_390.png");
  await page.getByRole("button", { name: "Add to Breakfast" }).click();

  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await expect(page.locator("li").filter({ hasText: "Chicken Breast" }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);
  await shot(page, "nutrition_today_populated_390.png");

  const nutritionCalories = await calorieFigure(page);
  await page.goto("/");
  await expect(page.getByText("Calories")).toBeVisible();
  const homeCalories = await calorieFigure(page);
  expect(homeCalories).toBe(nutritionCalories);

  await page.goto("/nutrition");
  await page.getByRole("link", { name: "Add Food to Lunch" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frequent" })).toBeVisible();
  const chickenStar = page.getByRole("button", { name: /Add Chicken Breast to favorites/i }).first();
  if ((await chickenStar.count()) > 0) {
    await chickenStar.click();
  }
  await expect(page.getByRole("button", { name: /Remove Chicken Breast from favorites/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
  await shot(page, "add_food_favorites_390.png");
  await page.getByRole("button", { name: /Remove Chicken Breast from favorites/i }).first().click();

  await openCreateCustomFood(page);
  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await shot(page, "custom_food_form_390.png");
  await page.getByRole("button", { name: "Back" }).or(page.getByRole("link", { name: "Back" })).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await createAndLogCustomFood(
    page,
    {
      name: `RC Yogurt ${Date.now()}`,
      calories: "120",
      protein: "18",
      carbs: "6",
      fat: "0",
    },
    "Add to Lunch",
  );
  await expect(page.locator("li").filter({ hasText: "RC Yogurt" }).first()).toBeVisible();

  for (const size of [
    { width: 360, height: 640, file: "nutrition_today_360.png" },
    { width: 430, height: 932, file: "nutrition_today_430.png" },
  ] as const) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/nutrition");
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await shot(page, size.file);
    await page.goto("/nutrition/add?meal=dinner");
    await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  }

  await page.goto("/privacy");
  await expect(
    page.getByText(
      "NVRTRACK uses Supabase for authentication, database, and file storage, and Vercel to host the web application.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/receive information as needed/i)).toHaveCount(0);

  expect(usdaRequests).toEqual([]);
});
