import { expect, type Locator, type Page } from "@playwright/test";

async function clickEnabled(locator: Locator): Promise<void> {
  await expect(locator).toBeEnabled({ timeout: 10_000 });
  await locator.click();
}

async function advanceFromHeading(
  page: Page,
  heading: string,
  button: Locator,
): Promise<void> {
  const headingLoc = page.getByRole("heading", { name: heading });
  if (!(await headingLoc.isVisible().catch(() => false))) {
    return;
  }
  await clickEnabled(button);
  await expect(headingLoc).toBeHidden({ timeout: 15_000 });
}

export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });
  if (!/\/onboarding/.test(new URL(page.url()).pathname)) {
    await expect(page).toHaveURL("/", { timeout: 20_000 });
    return;
  }

  await advanceFromHeading(page, "Let’s build your setup.", page.getByRole("button", { name: "Get Started" }));
  await advanceFromHeading(page, "Welcome back", page.getByRole("button", { name: "Continue" }));
  await advanceFromHeading(page, "What are you working toward?", page.getByRole("button", { name: "Build muscle" }));
  await advanceFromHeading(
    page,
    "How experienced are you with training?",
    page.getByRole("button", { name: "Some experience" }),
  );
  await advanceFromHeading(
    page,
    "How many days per week would you like to train?",
    page.getByRole("button", { name: "3" }),
  );
  await advanceFromHeading(page, "Where do you usually train?", page.getByRole("button", { name: "Mixed" }));
  await advanceFromHeading(page, "How tall are you?", page.getByRole("button", { name: "Continue" }));
  await advanceFromHeading(
    page,
    "How did you hear about NVRTRACK?",
    page.getByRole("button", { name: "Google / Search" }),
  );
  await advanceFromHeading(page, "You’re all set.", page.getByRole("button", { name: "Go to Home" }));

  await expect(page).toHaveURL("/", { timeout: 20_000 });
}
