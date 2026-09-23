import { expect, test } from "@playwright/test";

import { completeOnboardingIfNeeded } from "./complete-onboarding";
import { requiredE2EEnv } from "./e2e-env";

test.setTimeout(120_000);

test("privacy page is public and linked from login, signup, onboarding, and profile", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page).toHaveURL(/\/privacy\/?$/);
  await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
  await expect(page.getByText("Last updated: September 23, 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "privacy@nvrtrack.com" }).first()).toHaveAttribute(
    "href",
    "mailto:privacy@nvrtrack.com",
  );
  await expect(page.getByLabel("Contact").getByRole("link", { name: "privacy@nvrtrack.com" })).toHaveAttribute(
    "href",
    "mailto:privacy@nvrtrack.com",
  );
  await expect(page.getByRole("link", { name: "support@nvrtrack.com" })).toHaveAttribute(
    "href",
    "mailto:support@nvrtrack.com",
  );
  await expect(page.locator("body")).not.toContainText(/gmail\.com/i);
  await expect(page.locator("body")).not.toContainText("OWNER_LEGAL_REVIEW_DRAFT");
  await expect(page.locator("body")).not.toContainText("Owner / legal review");
  await expect(page.getByText("does not currently provide self-service account deletion")).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy\/?$/);

  await page.goto("/signup");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy\/?$/);

  const email = requiredE2EEnv("E2E_TEST_EMAIL");
  const password = requiredE2EEnv("E2E_TEST_PASSWORD");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });

  if (/\/onboarding/.test(new URL(page.url()).pathname)) {
    await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByText("Your answers are saved to your NVRTRACK profile.")).toBeVisible();
    await page.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy\/?$/);
    await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
    await page.goto("/onboarding");
    await expect(page).not.toHaveURL(/\/login/);
  }

  await completeOnboardingIfNeeded(page);
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
  await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});

test("onboarding URLs include only step ids, not selected answers", async ({ page }) => {
  await page.goto("/signup");
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;
  const email = `e2e-privacy-url-${runId}@example.com`;
  const password = `E2E-privacy-url-${runId}-Aa1!`;
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="new-password"]').first().fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");

  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(page).toHaveURL(/q=goal/);
  expect(page.url()).not.toMatch(/build_muscle|lose_fat|get_stronger/);

  const goalButton = page.getByRole("button", { name: "Build muscle" });
  await expect(goalButton).toBeEnabled({ timeout: 10_000 });
  await goalButton.click();
  await expect(page).toHaveURL(/q=experience/, { timeout: 15_000 });
  expect(page.url()).not.toMatch(/build_muscle/);
});
