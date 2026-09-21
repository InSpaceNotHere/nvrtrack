import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function readEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const result: Record<string, string> = {};
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function requireSupabasePublicEnvForE2E(): void {
  const envLocal = readEnvLocal();
  const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
  const missing = requiredVars.filter((name) => !(process.env[name] || envLocal[name]));
  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase env for e2e web server: ${missing.join(", ")}. ` +
        "Set them in process env or .env.local before running playwright.",
    );
  }
}

requireSupabasePublicEnvForE2E();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    timezoneId: "America/Los_Angeles",
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
    reuseExistingServer: false,
    env: {
      ...process.env,
      USDA_FDC_FIXTURE_MODE: process.env.USDA_FDC_FIXTURE_MODE ?? "1",
    },
  },
});
