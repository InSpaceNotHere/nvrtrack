import { expect, test, type Browser, type Page } from "@playwright/test";

import { requiredE2EEnv } from "./e2e-env";

async function loginPrimaryUser(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(requiredE2EEnv("E2E_TEST_EMAIL"));
  await page.locator('input[autocomplete="current-password"]').fill(requiredE2EEnv("E2E_TEST_PASSWORD"));
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

async function createSecondaryUserContext(browser: Browser, runId: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const password = `Pass-${runId}-Aa1!`;
  const email = `session10b-rls-${runId}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL("/", { timeout: 15000 });
  return page;
}

function uniqueDate(seed: number): string {
  const month = (seed % 12) + 1;
  const day = (Math.floor(seed / 17) % 28) + 1;
  return `2099-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function buildAuthenticatedStorageUrlFromSignedSrc(src: string | null): string | null {
  if (!src) {
    return null;
  }
  try {
    const url = new URL(src);
    const marker = "/storage/v1/object/sign/progress-photos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }
    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    const decodedPath = decodeURIComponent(encodedPath);
    return `${url.origin}/storage/v1/object/authenticated/progress-photos/${encodeURIComponent(decodedPath)}`;
  } catch {
    return null;
  }
}

test("progress photo storage remains private across users", async ({ page, browser }) => {
  await loginPrimaryUser(page);

  const runIdNumber = Date.now();
  const runId = `${runIdNumber}`;
  const photoDate = uniqueDate(runIdNumber);
  const photoNote = `session10b-rls-photo-${runId}`;
  let secondaryPage: Page | null = null;

  try {
    await page.goto("/progress");
    await page.getByRole("tab", { name: "Photos" }).click();

    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5WGw4AAAAASUVORK5CYII=",
      "base64",
    );
    const photoForm = page.locator("form").first();
    await photoForm.getByLabel("Date").fill(photoDate);
    await photoForm.getByLabel("View").selectOption("front");
    await photoForm.getByLabel("Notes").fill(photoNote);
    await photoForm.locator('input[type="file"][name="photo"]').setInputFiles({
      name: `session10b-rls-${runId}.png`,
      mimeType: "image/png",
      buffer: imageBuffer,
    });
    await photoForm.getByRole("button", { name: "Save Photo" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Progress photo saved." })).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "Photos" }).click();
    const timelineItem = page.locator("li").filter({ hasText: photoNote }).first();
    await expect(timelineItem).toBeVisible();
    const signedSrc = await timelineItem.locator("img").first().getAttribute("src");
    const authenticatedUrl = buildAuthenticatedStorageUrlFromSignedSrc(signedSrc);

    secondaryPage = await createSecondaryUserContext(browser, runId);
    await secondaryPage.goto("/progress");
    await secondaryPage.getByRole("tab", { name: "Photos" }).click();
    await expect(secondaryPage.locator("li").filter({ hasText: photoNote })).toHaveCount(0);

    if (authenticatedUrl) {
      const response = await secondaryPage.request.get(authenticatedUrl);
      expect(response.ok()).toBe(false);
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  } finally {
    await page.goto("/progress");
    await page.getByRole("tab", { name: "Photos" }).click();
    const deleteButton = page.locator("li").filter({ hasText: photoNote }).first().getByRole("button", { name: "Delete" });
    if (await deleteButton.count()) {
      await deleteButton.click();
      await expect(page.getByRole("status").filter({ hasText: "Progress photo deleted." })).toBeVisible();
    }
    if (secondaryPage) {
      await secondaryPage.context().close();
    }
  }
});
