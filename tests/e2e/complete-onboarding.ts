import { expect, type Page } from "@playwright/test";

const SCREEN_HEADINGS = [
  "Let’s build your setup.",
  "Welcome back",
  "What are you working toward?",
  "How experienced are you with training?",
  "How many days per week would you like to train?",
  "Where do you usually train?",
  "How tall are you?",
  "How did you hear about NVRTRACK?",
  "You’re all set.",
] as const;

async function visibleHeading(page: Page): Promise<(typeof SCREEN_HEADINGS)[number] | null> {
  for (const name of SCREEN_HEADINGS) {
    if (await page.getByRole("heading", { name }).isVisible().catch(() => false)) {
      return name;
    }
  }
  return null;
}

export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/(?:|onboarding(?:\?.*)?)$/, { timeout: 20_000 });
  if (!/\/onboarding/.test(new URL(page.url()).pathname)) {
    await expect(page).toHaveURL("/", { timeout: 20_000 });
    return;
  }

  for (let step = 0; step < 12; step += 1) {
    if (!/\/onboarding/.test(new URL(page.url()).pathname)) {
      break;
    }

    const heading = await visibleHeading(page);
    if (!heading) {
      await page.waitForTimeout(250);
      continue;
    }

    if (heading === "Let’s build your setup." || heading === "Welcome back") {
      await page.getByRole("button", { name: /Get Started|Continue/ }).click();
    } else if (heading === "What are you working toward?") {
      await page.getByRole("button", { name: "Build muscle" }).click();
    } else if (heading === "How experienced are you with training?") {
      await page.getByRole("button", { name: "Some experience" }).click();
    } else if (heading === "How many days per week would you like to train?") {
      await page.getByRole("button", { name: "3" }).click();
    } else if (heading === "Where do you usually train?") {
      await page.getByRole("button", { name: "Mixed" }).click();
    } else if (heading === "How tall are you?") {
      await page.getByRole("button", { name: "Continue" }).click();
    } else if (heading === "How did you hear about NVRTRACK?") {
      await page.getByRole("button", { name: "Google / Search" }).click();
    } else if (heading === "You’re all set.") {
      await page.getByRole("button", { name: "Go to Home" }).click();
    }

    await page.waitForTimeout(200);
  }

  await expect(page).toHaveURL("/", { timeout: 20_000 });
}
