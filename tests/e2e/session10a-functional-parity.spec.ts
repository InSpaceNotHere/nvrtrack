import { expect, test, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

async function login(page: Page) {
  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  try {
    await page.waitForURL("**/", { timeout: 10000 });
  } catch {
    if (new URL(page.url()).pathname === "/login") {
      await page.getByRole("button", { name: "Log In" }).click();
      await page.waitForURL("**/", { timeout: 10000 });
    }
  }
  await expect(page).toHaveURL("/", { timeout: 15000 });
}

function buildUniqueDate(seed: number, dayOffset = 0): string {
  const month = (seed % 12) + 1;
  const day = ((Math.floor(seed / 13) + dayOffset) % 28) + 1;
  return `2099-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function buildWeekStartMonday(baseDate: string): string {
  const utc = new Date(`${baseDate}T00:00:00.000Z`);
  const distance = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - distance);
  return utc.toISOString().slice(0, 10);
}

async function expectNoUnexpectedErrorAlert(page: Page) {
  const alert = page.getByRole("alert").filter({ hasText: /failed|error|unable|required|must be/i });
  await expect(alert).toHaveCount(0);
}

test("session 10a planner + progress + dashboard workflows", async ({ page }) => {
  await login(page);

  const runIdNumber = Date.now();
  const runId = `${runIdNumber}`;
  const photoDate = buildUniqueDate(runIdNumber, 0);
  const measurementDate = buildUniqueDate(runIdNumber, 1);
  const journalWeekStart = buildWeekStartMonday(buildUniqueDate(runIdNumber, 7));
  const photoView = (["front", "side", "back"] as const)[runIdNumber % 3];
  const photoNote = `session10b-photo-${runId}`;
  const measurementNote = `session10b-measurement-${runId}`;
  const journalNote = `session10b-journal-${runId}`;
  const weekdayLabel = "Monday";
  let originalWeekdayValue: string | null = null;
  let updatedWeekdayValue: string | null = null;

  try {
    await page.goto("/training");
    await expect(page.getByRole("heading", { name: "Workout Planner" })).toBeVisible();

    const weekdayControl = page.locator("label").filter({ hasText: weekdayLabel }).first().locator("select");
    await expect(weekdayControl).toBeVisible();
    originalWeekdayValue = await weekdayControl.inputValue();
    const options = await weekdayControl.locator("option").evaluateAll((nodes) =>
      nodes.map((node) => ({ value: (node as HTMLOptionElement).value, label: node.textContent?.trim() ?? "" })),
    );
    const preferredOption =
      options.find((option) => option.value !== "" && option.value !== "__rest__" && option.value !== originalWeekdayValue) ??
      options.find((option) => option.value !== "" && option.value !== "__rest__");
    if (!preferredOption) {
      throw new Error("No assignable weekday template option found.");
    }
    updatedWeekdayValue = preferredOption.value;
    await weekdayControl.selectOption(updatedWeekdayValue);
    await expect(page.getByRole("status").filter({ hasText: "Weekday schedule updated." })).toBeVisible();
    await expectNoUnexpectedErrorAlert(page);

    await page.reload();
    await expect(page.locator("label").filter({ hasText: weekdayLabel }).first().locator("select")).toHaveValue(
      updatedWeekdayValue,
    );

    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: "Live Strength System" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30D" })).toBeVisible();

    await page.getByRole("tab", { name: "Photos" }).click();
    const photoForm = page.locator("form").first();
    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5WGw4AAAAASUVORK5CYII=",
      "base64",
    );
    await photoForm.getByLabel("Date").fill(photoDate);
    await photoForm.getByLabel("View").selectOption(photoView);
    await photoForm.getByLabel("Notes").fill(photoNote);
    await photoForm.locator('input[type="file"][name="photo"]').setInputFiles({
      name: `session10b-photo-${runId}.png`,
      mimeType: "image/png",
      buffer: imageBuffer,
    });
    await photoForm.getByRole("button", { name: "Save Photo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Progress photo saved." })).toBeVisible();
    await expectNoUnexpectedErrorAlert(page);

    await page.reload();
    await page.getByRole("tab", { name: "Photos" }).click();
    const photoTimelineItem = page.locator("li").filter({ hasText: photoNote }).first();
    await expect(photoTimelineItem).toBeVisible();
    await expect(photoTimelineItem.locator("img")).toHaveCount(1);

    await page.getByRole("tab", { name: "Measurements" }).click();
    await page.getByLabel("Entry date").fill(measurementDate);
    await page.getByLabel("Waist (in)").fill("34.5");
    await page.getByLabel("Notes").fill(measurementNote);
    await page.getByRole("button", { name: "Save Measurements" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Measurements saved." })).toBeVisible();
    await expectNoUnexpectedErrorAlert(page);

    await page.reload();
    await page.getByRole("tab", { name: "Measurements" }).click();
    await expect(page.locator("li").filter({ hasText: measurementNote }).first()).toBeVisible();

    await page.getByRole("tab", { name: "Journal" }).click();
    await page.getByLabel("Week start").fill(journalWeekStart);
    await page.getByLabel("Mood").fill("Focused");
    await page.getByLabel("Notes").fill(journalNote);
    await page.getByRole("button", { name: "Save Weekly Journal" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Weekly journal saved." })).toBeVisible();
    await expectNoUnexpectedErrorAlert(page);

    await page.reload();
    await page.getByRole("tab", { name: "Journal" }).click();
    await expect(page.locator("li").filter({ hasText: journalNote }).first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Strength Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard Signals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Meals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
  } finally {
    await page.goto("/training");
    const weekdayControl = page.locator("label").filter({ hasText: weekdayLabel }).first().locator("select");
    if (originalWeekdayValue !== null) {
      const options = await weekdayControl.locator("option").evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLOptionElement).value),
      );
      if (options.includes(originalWeekdayValue)) {
        await weekdayControl.selectOption(originalWeekdayValue);
        await expect(page.getByRole("status").filter({ hasText: "Weekday schedule updated." })).toBeVisible();
      }
    }

    await page.goto("/progress");
    await page.getByRole("tab", { name: "Photos" }).click();
    const photoDeleteButton = page.locator("li").filter({ hasText: photoNote }).first().getByRole("button", { name: "Delete" });
    if (await photoDeleteButton.count()) {
      await photoDeleteButton.click();
      await expect(page.getByRole("status").filter({ hasText: "Progress photo deleted." })).toBeVisible();
    }

    await page.getByRole("tab", { name: "Measurements" }).click();
    const measurementDeleteButton = page
      .locator("li")
      .filter({ hasText: measurementNote })
      .first()
      .getByRole("button", { name: "Delete" });
    if (await measurementDeleteButton.count()) {
      await measurementDeleteButton.click();
      await expect(page.getByRole("status").filter({ hasText: "Measurement entry deleted." })).toBeVisible();
    }

    await page.getByRole("tab", { name: "Journal" }).click();
    const journalDeleteButton = page.locator("li").filter({ hasText: journalNote }).first().getByRole("button", { name: "Delete" });
    if (await journalDeleteButton.count()) {
      await journalDeleteButton.click();
      await expect(page.getByRole("status").filter({ hasText: "Weekly journal deleted." })).toBeVisible();
    }
  }
});
