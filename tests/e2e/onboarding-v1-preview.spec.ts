import { expect, test, type Page } from "@playwright/test";

async function signUpFreshUser(page: Page, label: string): Promise<void> {
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-onboarding-${label}-${runId}@example.com`;
  const password = `E2E-onboarding-${label}-${runId}-Aa1!`;

  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/(|onboarding)(?:\?.*)?$/, { timeout: 20_000 });
}

test("onboarding v1 renders mobile-first welcome and 3-step surfaces", async ({ page }) => {
  await signUpFreshUser(page, "preview");
  await page.setViewportSize({ width: 390, height: 664 });

  await page.goto("/onboarding?previewStep=1");
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's set up NVRTRACK" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_welcome_step1_390x664.png", fullPage: true });

  await page.goto("/onboarding?previewStep=2");
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await expect(page.getByText("How many days per week would you ideally like to train?")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_step2_routine_390x664.png", fullPage: true });

  await page.goto("/onboarding?previewStep=3");
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await expect(page.getByText("How tall are you?")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_step3_about_you_390x664.png", fullPage: true });

  await page.goto("/onboarding?previewStep=1&previewExisting=1");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Your existing workouts and progress won't change.")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_existing_user_welcome_back_390x664.png", fullPage: true });
});

