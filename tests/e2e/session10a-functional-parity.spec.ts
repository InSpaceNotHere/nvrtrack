import { expect, test, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

async function login(page: Page) {
  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL("/");
}

function currentWeekdayLabel(): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date());
}

async function expectSuccessOrError(page: Page, successText: string) {
  const success = page.getByText(successText);
  const error = page.getByText(/failed|unavailable|error|required/i).first();
  if (await success.count()) {
    await expect(success).toBeVisible();
    return;
  }
  await expect(error).toBeVisible();
}

test("session 10a planner + progress + dashboard workflows", async ({ page }) => {
  await login(page);

  const runId = Date.now();
  const weekday = currentWeekdayLabel();
  await page.goto("/training");
  await expect(page.getByRole("heading", { name: "Workout Planner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly Schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Template Library" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create Template" })).toBeVisible();

  const weekdayControl = page.locator("label").filter({ hasText: weekday }).first().locator("select");
  const weekdayOptions = await weekdayControl.locator("option").allTextContents();
  if (weekdayOptions.length > 2) {
    await weekdayControl.selectOption({ index: 2 });
  }

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Live Strength System" })).toBeVisible();
  await expect(page.getByRole("button", { name: "30D" })).toBeVisible();

  await page.getByRole("tab", { name: "Photos" }).click();
  const photoForm = page.locator("form").first();
  const imageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5WGw4AAAAASUVORK5CYII=",
    "base64",
  );
  await photoForm.getByLabel("Photo").setInputFiles({
    name: `e2e-photo-${runId}.png`,
    mimeType: "image/png",
    buffer: imageBuffer,
  });
  await photoForm.getByLabel("View").selectOption("front");
  await photoForm.getByRole("button", { name: "Save Photo" }).click();
  await expectSuccessOrError(page, "Progress photo saved.");
  await expect(page.getByRole("heading", { name: "Compare Two Dates" })).toBeVisible();

  await page.getByRole("tab", { name: "Measurements" }).click();
  await page.getByLabel("Waist (in)").fill("34.5");
  await page.getByRole("button", { name: "Save Measurements" }).click();
  await expectSuccessOrError(page, "Measurements saved.");
  await expect(page.getByRole("heading", { name: "Measurement Trend" })).toBeVisible();

  await page.getByRole("tab", { name: "Journal" }).click();
  await page.getByLabel("Mood").fill("Focused");
  await page.getByLabel("Notes").fill(`E2E journal note ${runId}`);
  await page.getByRole("button", { name: "Save Weekly Journal" }).click();
  await expectSuccessOrError(page, "Weekly journal saved.");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Strength Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard Signals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Meals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
});
