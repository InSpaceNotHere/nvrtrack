import { expect, test, type Browser, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { createAndLogCustomFood, fillCustomFoodForm, openCreateCustomFood } from "./custom-food";
import { requiredE2EEnv } from "./e2e-env";

test.setTimeout(120_000);

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-06-${String(day).padStart(2, "0")}`;
}

async function loginPrimary(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(requiredE2EEnv("E2E_TEST_EMAIL"));
  await page.locator('input[autocomplete="current-password"]').fill(passwordFromEnv());
  await page.getByRole("button", { name: "Log In" }).click();
  await completeOnboardingIfNeeded(page);
}

function passwordFromEnv() {
  return requiredE2EEnv("E2E_TEST_PASSWORD");
}

async function signupIsolatedUser(browser: Browser, runId: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `custom-iso-${runId}@example.com`;
  const password = `Cust-${runId}-Aa1!`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await completeOnboardingIfNeeded(page);
  return page;
}

function mealEntry(page: Page, name: string) {
  return page.locator("li").filter({ hasText: name }).first();
}

test("create custom food, validate, log, favorite, edit snapshot, and delete without rewriting history", async ({
  page,
}) => {
  await loginPrimary(page);
  const date = uniqueTestDate();
  const foodName = `Label Yogurt ${Date.now()}`;
  await page.goto(`/nutrition/add?meal=breakfast&date=${date}`);

  await openCreateCustomFood(page);
  await expect(page.getByText(/FDC|USDA|source_description|catalog/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Save Food" }).click();
  await expect(page.getByText("Food name is required.")).toBeVisible();
  await expect(page.getByText("Calories is required.")).toBeVisible();
  await expect(page.getByText("Protein is required.")).toBeVisible();

  await fillCustomFoodForm(page, {
    name: foodName,
    brand: "FAGE",
    servingSize: "0",
    servingUnit: "g",
    calories: "-1",
    protein: "abc",
    carbs: "6",
    fat: "0",
  });
  await page.getByRole("button", { name: "Save Food" }).click();
  await expect(page.getByText("Serving size must be greater than 0.")).toBeVisible();
  await expect(page.getByText(/Calories must be between/)).toBeVisible();
  await expect(page.getByText("Protein must be a number.")).toBeVisible();

  await fillCustomFoodForm(page, {
    name: foodName,
    brand: "FAGE",
    servingSize: "170",
    servingUnit: "g",
    calories: "120",
    protein: "18",
    carbs: "6",
    fat: "0",
  });
  await page.getByRole("button", { name: "Save Food" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(foodName)).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("tab", { name: "My Foods" }).click();
  const myFoods = page.locator("section").filter({ has: page.getByRole("heading", { name: "My Foods" }) });
  await expect(myFoods.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);
  await expect(myFoods.getByRole("button", { name: new RegExp(`^${foodName}`) })).toContainText("FAGE");
  await expect(myFoods.getByRole("button", { name: new RegExp(`^${foodName}`) })).toContainText("170 g");

  await myFoods.getByRole("button", { name: new RegExp(`^${foodName}`) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await expect(mealEntry(page, foodName)).toBeVisible();
  await expect(mealEntry(page, foodName).getByText(/120/)).toBeVisible();

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  const recent = page.locator("section").filter({ has: page.getByRole("heading", { name: "Recent" }) });
  const frequent = page.locator("section").filter({ has: page.getByRole("heading", { name: "Frequent" }) });
  await expect(recent.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);
  await expect(frequent.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);

  await recent.getByRole("button", { name: new RegExp(`Add ${foodName} to favorites`) }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const favorites = page.locator("section").filter({ has: page.getByRole("heading", { name: "Favorites" }) });
  await expect(favorites.getByRole("button", { name: new RegExp(`^${foodName}`) })).toHaveCount(1);

  await page.getByRole("tab", { name: "My Foods" }).click();
  await page.getByRole("link", { name: `Edit ${foodName}` }).click();
  await expect(page.getByRole("heading", { name: "Edit Custom Food" })).toBeVisible();
  await page.getByLabel("Calories").fill("999");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await page.goto(`/nutrition?date=${date}`);
  await expect(mealEntry(page, foodName).getByText(/120/)).toBeVisible();
  await expect(mealEntry(page, foodName).getByText("999")).toHaveCount(0);

  await page.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  await page.getByRole("tab", { name: "My Foods" }).click();
  await page.getByRole("button", { name: `Delete ${foodName}` }).click();
  await page.getByRole("button", { name: `Confirm delete ${foodName}` }).click();
  await expect(page.getByText("Food removed. Logged meals stay as they were.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "My Foods" })).toBeVisible();
  await expect(
    page.locator("section").filter({ has: page.getByRole("heading", { name: "My Foods" }) }).getByRole("button", { name: new RegExp(`^${foodName}`) }),
  ).toHaveCount(0);

  await page.goto(`/nutrition?date=${date}`);
  await expect(mealEntry(page, foodName)).toBeVisible();
  await expect(mealEntry(page, foodName).getByText(/120/)).toBeVisible();
});

test("custom foods stay isolated across users", async ({ page, browser }) => {
  await loginPrimary(page);
  const date = uniqueTestDate();
  const marker = `Iso Custom ${Date.now()}`;
  await page.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  await createAndLogCustomFood(page, {
    name: marker,
    calories: "90",
    protein: "8",
    carbs: "6",
    fat: "2",
  });
  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await page.getByRole("tab", { name: "My Foods" }).click();
  await expect(
    page.locator("section").filter({ has: page.getByRole("heading", { name: "My Foods" }) }).getByRole("button", { name: new RegExp(`^${marker}`) }),
  ).toHaveCount(1);

  const other = await signupIsolatedUser(browser, `${Date.now()}-c`);
  await other.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  await expect(other.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await other.getByRole("tab", { name: "My Foods" }).click();
  await expect(other.getByRole("button", { name: new RegExp(marker) })).toHaveCount(0);
});

test("saving a custom food from My Foods manager stays on My Foods", async ({ page }) => {
  await loginPrimary(page);
  const foodName = `Manager Food ${Date.now()}`;
  await page.goto("/nutrition/foods");
  await page.getByRole("link", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create Custom Food" })).toBeVisible();
  await fillCustomFoodForm(page, {
    name: foodName,
    calories: "80",
    protein: "5",
    carbs: "10",
    fat: "2",
  });
  await page.getByRole("button", { name: "Save Food" }).click();
  await expect(page.getByRole("heading", { name: "My Foods" })).toBeVisible();
  await expect(page.getByText(foodName)).toBeVisible();
});
