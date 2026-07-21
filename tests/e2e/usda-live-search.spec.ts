import { expect, test, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

const BRANDED_LABEL = "Protein Bar, Chocolate Peanut Butter";
const GENERIC_LABEL = "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw";

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
  await expect(page).toHaveURL("/");
}

async function openComposer(page: Page) {
  await page.getByRole("button", { name: "Add Food" }).first().click();
}

async function openUsdaMode(page: Page) {
  await openComposer(page);
  await page.getByRole("button", { name: "Search USDA", exact: true }).click();
}

async function removeEntryByName(page: Page, foodName: string) {
  const allEntries = page.locator("li").filter({ hasText: foodName });
  const before = await allEntries.count();
  if (before === 0) {
    return;
  }
  const entry = allEntries.first();
  await entry.getByRole("button", { name: "Delete" }).click();
  await entry.getByRole("button", { name: "Confirm Delete" }).click();
  await expect.poll(async () => await allEntries.count()).toBeLessThan(before);
}

async function removeSavedFoodByName(page: Page, foodName: string) {
  const rows = page.locator("li").filter({ hasText: foodName });
  const before = await rows.count();
  if (before === 0) {
    return;
  }
  const row = rows.first();
  await row.getByRole("button", { name: "Delete saved food" }).click();
  await row.getByRole("button", { name: "Confirm Delete" }).click();
  await expect.poll(async () => await rows.count()).toBeLessThan(before);
}

async function removeAllMatching(page: Page, foodName: string, removeOne: (page: Page, name: string) => Promise<void>) {
  for (let index = 0; index < 8; index += 1) {
    const count = await page.locator("li").filter({ hasText: foodName }).count();
    if (count === 0) {
      return;
    }
    await removeOne(page, foodName);
  }
}

test("USDA live search and trusted logging flow", async ({ page }) => {
  await login(page);

  const usdaNetworkRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.nal.usda.gov")) {
      usdaNetworkRequests.push(request.url());
    }
  });

  const date = uniqueTestDate();
  await page.goto("/nutrition/foods");
  await removeAllMatching(page, BRANDED_LABEL, removeSavedFoodByName);

  await page.goto(`/nutrition?date=${date}`);
  await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
  await removeAllMatching(page, BRANDED_LABEL, removeEntryByName);

  await openUsdaMode(page);
  const usdaResults = page.locator("div.max-h-56").first();
  await page.getByLabel("Search USDA foods").fill("chicken breast raw");
  await expect(usdaResults.getByText(GENERIC_LABEL).first()).toBeVisible();

  await page.getByLabel("Group").selectOption("branded");
  await page.getByLabel("Search USDA foods").fill("protein bar");
  await expect(usdaResults.getByText(BRANDED_LABEL).first()).toBeVisible();

  const brandedResult = usdaResults
    .locator("button")
    .filter({ hasText: BRANDED_LABEL })
    .first();
  await brandedResult.click();
  await expect(page.getByText("Source: USDA Branded • FDC ID 2000001")).toBeVisible();
  await expect(page.getByText("GTIN/UPC: 0123456789012")).toBeVisible();

  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Unit").selectOption("g");
  await page.getByRole("button", { name: "Log USDA Food" }).click();

  const usdaEntry = page.locator("li").filter({ hasText: BRANDED_LABEL }).first();
  await expect(usdaEntry).toBeVisible();
  await expect(usdaEntry.getByText("USDA Branded snapshot • FDC 2000001")).toBeVisible();

  await page.reload();
  await expect(usdaEntry).toBeVisible();

  await usdaEntry.getByRole("button", { name: "Edit" }).click();
  await usdaEntry.getByLabel("Amount").fill("4");
  await usdaEntry.getByLabel("Unit").selectOption("oz");
  await usdaEntry.getByRole("button", { name: "Save Entry" }).click();
  await expect(usdaEntry.getByText("4 oz")).toBeVisible();

  await page.reload();
  await expect(usdaEntry.getByText("4 oz")).toBeVisible();

  await openUsdaMode(page);
  await page.getByLabel("Group").selectOption("branded");
  await page.getByLabel("Search USDA foods").fill("protein bar");
  await expect(usdaResults.getByText(BRANDED_LABEL).first()).toBeVisible();
  await usdaResults
    .locator("button")
    .filter({ hasText: BRANDED_LABEL })
    .first()
    .click();
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Unit").selectOption("g");
  await page.getByLabel("Save this USDA food to My Foods").check();
  await page.getByRole("button", { name: "Log USDA Food" }).click();
  await expect(page.getByText(/saved to My Foods/i)).toBeVisible();

  await page.goto("/nutrition/foods");
  await expect(page.getByText(BRANDED_LABEL).first()).toBeVisible();
  await expect(page.getByText("USDA Live • FDC 2000001").first()).toBeVisible();

  const savedFood = page.locator("li").filter({ hasText: BRANDED_LABEL }).first();
  await savedFood.getByRole("button", { name: "Edit saved food" }).click();
  await page.getByLabel(/^Calories$/).fill("401");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("USDA Modified • FDC 2000001").first()).toBeVisible();

  await page.goto(`/nutrition?date=${date}`);
  await openComposer(page);
  await page.getByRole("button", { name: "My Foods", exact: true }).click();
  await page.getByLabel("Search My Foods").fill("Protein Bar");
  await page
    .locator("button")
    .filter({ hasText: BRANDED_LABEL })
    .first()
    .click();
  await page.getByRole("button", { name: "Log Saved Food" }).click();
  await expect(page.locator("li").filter({ hasText: BRANDED_LABEL })).toHaveCount(3);

  await openUsdaMode(page);
  await page.getByLabel("Search USDA foods").fill("fixture rate limit");
  await expect(page.getByText(/temporarily rate-limited/i)).toBeVisible();
  await page.getByLabel("Search USDA foods").fill("fixture unavailable");
  await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await openComposer(page);
  await page.getByRole("button", { name: "Common", exact: true }).click();
  await page.getByLabel("Search Common foods").fill("chicken breast");
  await expect(page.getByText(/Chicken, broiler or fryers, breast/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await openComposer(page);
  await page.getByRole("button", { name: "Manual Label", exact: true }).click();
  await page.getByLabel("Food name").fill(`Manual USDA E2E ${Date.now()}`);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("120");
  await page.getByLabel("Protein g").fill("10");
  await page.getByLabel("Carbohydrates g").fill("8");
  await page.getByLabel("Fat g").fill("4");
  await page.getByRole("button", { name: "Log Custom Entry" }).click();

  await removeAllMatching(page, BRANDED_LABEL, removeEntryByName);
  await removeAllMatching(page, "Manual USDA E2E", removeEntryByName);

  await page.goto("/nutrition/foods");
  await removeAllMatching(page, BRANDED_LABEL, removeSavedFoodByName);
  await expect(page.locator("li").filter({ hasText: BRANDED_LABEL })).toHaveCount(0);

  expect(usdaNetworkRequests).toEqual([]);
});
