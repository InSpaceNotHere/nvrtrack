import { expect, test } from "@playwright/test";

function requiredEnv(name: "E2E_TEST_EMAIL" | "E2E_TEST_PASSWORD"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for auth smoke tests.`);
  }
  return value;
}

test("authentication smoke flow", async ({ page }) => {
  const email = requiredEnv("E2E_TEST_EMAIL");
  const password = requiredEnv("E2E_TEST_PASSWORD");

  // 1) Logged-out access to / redirects to /login
  await page.goto("/");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);

  // 2) Login with normal test account succeeds
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Log In" }).click();

  // 3) Authenticated user can access /
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /today overview/i })).toBeVisible();

  // 4) Session persists after refresh
  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /today overview/i })).toBeVisible();

  // 5) Authenticated user visiting /login redirects to /
  await page.goto("/login");
  await expect(page).toHaveURL("/");

  // 6) Logout returns to /login
  await page.goto("/profile");
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);

  // 7) Protected routes redirect again after logout
  await page.goto("/nutrition");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});
