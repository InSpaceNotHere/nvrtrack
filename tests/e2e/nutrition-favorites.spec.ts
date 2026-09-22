import { expect, test, type Browser, type Page } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

test.setTimeout(90_000);

function uniqueTestDate(): string {
  const day = (Math.floor(Date.now() / 1000) % 27) + 1;
  return `2031-05-${String(day).padStart(2, "0")}`;
}

async function loginPrimary(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(requiredE2EEnv("E2E_TEST_EMAIL"));
  await page.locator('input[autocomplete="current-password"]').fill(requiredE2EEnv("E2E_TEST_PASSWORD"));
  await page.getByRole("button", { name: "Log In" }).click();
  await completeOnboardingIfNeeded(page);
}

async function signupIsolatedUser(browser: Browser, runId: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `fav-iso-${runId}@example.com`;
  const password = `Fav-${runId}-Aa1!`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await completeOnboardingIfNeeded(page);
  return page;
}

function rail(page: Page, title: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

function railFood(page: Page, title: string, name: RegExp) {
  return rail(page, title).getByRole("button", { name });
}

async function starCatalogFood(page: Page, foodName: string) {
  const add = page.getByRole("button", { name: new RegExp(`Add ${foodName} to favorites`, "i") }).first();
  if ((await add.count()) > 0) {
    await add.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: new RegExp(`Remove ${foodName} from favorites`, "i") }).first()).toBeVisible();
}

async function assertNoInternalCopy(page: Page) {
  await expect(page.getByRole("main").getByText("nutrition_food_favorites")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(/schema cache|PGRST205|Favorites are waiting/i)).toHaveCount(0);
}

test("favorites persist from Common, search, Recent, and Frequent without opening the portion sheet", async ({
  page,
}) => {
  await loginPrimary(page);
  const usdaRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.nal.usda.gov")) {
      usdaRequests.push(request.url());
    }
  });

  const date = uniqueTestDate();
  const customName = `Fav Layer ${Date.now()}`;
  await page.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await assertNoInternalCopy(page);

  const commonStar = page.getByRole("button", { name: /Add Chicken Breast to favorites/i }).first();
  const alreadyStarred = page.getByRole("button", { name: /Remove Chicken Breast from favorites/i }).first();
  if ((await commonStar.count()) > 0) {
    await commonStar.click();
  } else {
    await expect(alreadyStarred).toBeVisible();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(railFood(page, "Favorites", /^Chicken Breast \d/)).toHaveCount(1);

  await page.reload();
  await expect(railFood(page, "Favorites", /^Chicken Breast \d/)).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Remove Chicken Breast from favorites/i }).first()).toBeVisible();

  await railFood(page, "Common", /^Chicken Breast \d/).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Search foods").fill("white rice");
  await starCatalogFood(page, "White Rice");
  await page.getByLabel("Search foods").fill("");
  await expect(railFood(page, "Favorites", /^White Rice \d/)).toHaveCount(1);

  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByLabel("Food name").fill(customName);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("111");
  await page.getByLabel("Protein g").fill("9");
  await page.getByLabel("Carbohydrates g").fill("7");
  await page.getByLabel("Fat g").fill("3");
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await expect(page.locator("li").filter({ hasText: customName })).toBeVisible();

  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  const recentStar = rail(page, "Recent").getByRole("button", { name: new RegExp(`Add ${customName} to favorites`) });
  await recentStar.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(railFood(page, "Favorites", new RegExp(`^${customName}`))).toHaveCount(1);

  const frequentStar = rail(page, "Frequent").getByRole("button", { name: /Add Chicken Breast to favorites|Remove Chicken Breast from favorites/ });
  await expect(frequentStar).toBeVisible();
  if ((await frequentStar.getAttribute("aria-pressed")) !== "true") {
    await frequentStar.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  await page.getByRole("button", { name: /Remove White Rice from favorites/i }).first().click();
  await expect(railFood(page, "Favorites", /^White Rice \d/)).toHaveCount(0);
  await assertNoInternalCopy(page);
  expect(usdaRequests).toEqual([]);
});

test("new users omit empty personal rails and show Favorites only after starring", async ({ browser }) => {
  const page = await signupIsolatedUser(browser, `${Date.now()}`);
  const date = uniqueTestDate();
  await page.goto(`/nutrition/add?meal=lunch&date=${date}`);
  await expect(page.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Frequent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Favorites" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Common" })).toBeVisible();
  await expect(page.getByText("No recent foods")).toHaveCount(0);
  await expect(page.getByText("No frequent foods")).toHaveCount(0);
  await expect(page.getByText("No favorites")).toHaveCount(0);
  await assertNoInternalCopy(page);

  await page.getByRole("button", { name: /Add Apple to favorites/i }).first().click();
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
  await expect(railFood(page, "Favorites", /^Apple \d/)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Frequent" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Common" })).toBeVisible();
});

test("favorites stay isolated across users", async ({ page, browser }) => {
  await loginPrimary(page);
  const date = uniqueTestDate();
  await page.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  const marker = `Iso Fav ${Date.now()}`;
  await page.getByRole("tab", { name: "Custom" }).click();
  await page.getByLabel("Food name").fill(marker);
  await page.getByLabel("Serving size").fill("1");
  await page.getByLabel("Serving unit").fill("serving");
  await page.getByLabel("Calories/serving").fill("90");
  await page.getByLabel("Protein g").fill("8");
  await page.getByLabel("Carbohydrates g").fill("6");
  await page.getByLabel("Fat g").fill("2");
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await page.getByRole("link", { name: "Add Food to Breakfast" }).click();
  await rail(page, "Recent").getByRole("button", { name: new RegExp(`Add ${marker} to favorites`) }).click();
  await expect(railFood(page, "Favorites", new RegExp(`^${marker}`))).toHaveCount(1);

  const other = await signupIsolatedUser(browser, `${Date.now()}-b`);
  await other.goto(`/nutrition/add?meal=breakfast&date=${date}`);
  await expect(other.getByRole("heading", { name: "Add Food" })).toBeVisible();
  await expect(other.getByRole("button", { name: new RegExp(marker) })).toHaveCount(0);
  await expect(other.getByRole("heading", { name: "Favorites" })).toHaveCount(0);
});
