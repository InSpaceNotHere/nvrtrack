import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname localhost --port 3000",
    url: "http://localhost:3000/login",
    timeout: 120_000,
    reuseExistingServer: true,
    env: {
      ...process.env,
      USDA_FDC_FIXTURE_MODE: process.env.USDA_FDC_FIXTURE_MODE ?? "1",
    },
  },
});
