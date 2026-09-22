import { expect, type Page } from "@playwright/test";

async function advanceFromHeading(
  page: Page,
  heading: string,
  click: () => Promise<void>,
): Promise<void> {
  const headingLoc = page.getByRole("heading", { name: heading });
  if (!(await headingLoc.isVisible().catch(() => false))) {
    return;
  }
  await click();
  await expect(headingLoc).toBeHidden({ timeout: 15_000 });
}

export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });
  if (!/\/onboarding/.test(new URL(page.url()).pathname)) {
    await expect(page).toHaveURL("/", { timeout: 20_000 });
    return;
  }

  await advanceFromHeading(page, "Let’s build your setup.", async () => {
    await page.getByRole("button", { name: "Get Started" }).click();
  });
  await advanceFromHeading(page, "Welcome back", async () => {
    await page.getByRole("button", { name: "Continue" }).click();
  });
  await advanceFromHeading(page, "What are you working toward?", async () => {
    const option = page.getByRole("button", { name: "Build muscle" });
    if (await option.isEnabled()) {
      await option.click();
    }
  });
  await advanceFromHeading(page, "How experienced are you with training?", async () => {
    const option = page.getByRole("button", { name: "Some experience" });
    if (await option.isEnabled()) {
      await option.click();
    }
  });
  await advanceFromHeading(page, "How many days per week would you like to train?", async () => {
    const option = page.getByRole("button", { name: "3" });
    if (await option.isEnabled()) {
      await option.click();
    }
  });
  await advanceFromHeading(page, "Where do you usually train?", async () => {
    const option = page.getByRole("button", { name: "Mixed" });
    if (await option.isEnabled()) {
      await option.click();
    }
  });
  await advanceFromHeading(page, "How tall are you?", async () => {
    const continueButton = page.getByRole("button", { name: "Continue" });
    if (await continueButton.isEnabled()) {
      await continueButton.click();
    }
  });
  await advanceFromHeading(page, "How did you hear about NVRTRACK?", async () => {
    const option = page.getByRole("button", { name: "Google / Search" });
    if (await option.isEnabled()) {
      await option.click();
    }
  });
  await advanceFromHeading(page, "You’re all set.", async () => {
    await page.getByRole("button", { name: "Go to Home" }).click();
  });

  await expect(page).toHaveURL("/", { timeout: 20_000 });
}
