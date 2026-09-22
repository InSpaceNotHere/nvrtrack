import { expect, type Page } from "@playwright/test";

export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });
  if (!/\/onboarding/.test(new URL(page.url()).pathname)) {
    await expect(page).toHaveURL("/", { timeout: 20_000 });
    return;
  }

  const startButton = page.getByRole("button", { name: /Get Started|Continue/ });
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
  }

  await expect(page.getByRole("heading", { name: "What are you working toward?" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Build muscle" }).click();
  await expect(page.getByRole("heading", { name: "How experienced are you with training?" })).toBeVisible();
  await page.getByRole("button", { name: "Some experience" }).click();
  await expect(page.getByRole("heading", { name: "How many days per week would you like to train?" })).toBeVisible();
  await page.getByRole("button", { name: "3" }).click();
  await expect(page.getByRole("heading", { name: "Where do you usually train?" })).toBeVisible();
  await page.getByRole("button", { name: "Mixed" }).click();
  await expect(page.getByRole("heading", { name: "How tall are you?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "How did you hear about NVRTRACK?" })).toBeVisible();
  await page.getByRole("button", { name: "Google / Search" }).click();
  await expect(page.getByRole("heading", { name: "You’re all set." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Go to Home" }).click();
  await expect(page).toHaveURL("/", { timeout: 20_000 });
}
