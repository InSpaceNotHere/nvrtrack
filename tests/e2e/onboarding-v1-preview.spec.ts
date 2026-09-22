import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

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

test("onboarding v1 renders welcome and one-question-per-screen flow surfaces", async ({ page }) => {
  await signUpFreshUser(page, "preview");
  await page.setViewportSize({ width: 390, height: 664 });

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Let’s build your setup." })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_welcome_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=goal");
  await expect(page.getByText("1 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What are you working toward?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_goal_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=experience");
  await expect(page.getByText("2 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How experienced are you with training?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_experience_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=days");
  await expect(page.getByText("3 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How many days per week would you like to train?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_days_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=environment");
  await expect(page.getByText("4 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where do you usually train?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_environment_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=height");
  await expect(page.getByText("5 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How tall are you?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_height_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=discovery");
  await expect(page.getByText("6 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How did you hear about NVRTRACK?" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_discovery_390x664.png", fullPage: true });

  await page.goto("/onboarding?q=complete");
  await expect(page.getByRole("heading", { name: "You’re all set." })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_completion_390x664.png", fullPage: true });

  await page.goto("/onboarding?previewExisting=1");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Your workouts, progress, meals, and existing data are staying exactly where they are.")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/opt/cursor/artifacts/onboarding_v2_welcome_back_390x664.png", fullPage: true });
});

