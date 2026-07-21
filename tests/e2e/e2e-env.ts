import fs from "node:fs";
import path from "node:path";

type E2EEnvName = "E2E_TEST_EMAIL" | "E2E_TEST_PASSWORD";

let cachedEnv: Record<string, string> | null = null;

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

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

function readEnvLocal(): Record<string, string> {
  if (cachedEnv) {
    return cachedEnv;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    cachedEnv = {};
    return cachedEnv;
  }

  const content = fs.readFileSync(envPath, "utf8");
  cachedEnv = parseEnvFile(content);
  return cachedEnv;
}

export function requiredE2EEnv(name: E2EEnvName): string {
  const directValue = process.env[name];
  if (directValue) {
    return directValue;
  }

  const envLocalValue = readEnvLocal()[name];
  if (envLocalValue) {
    return envLocalValue;
  }

  throw new Error(`${name} is required for e2e tests (env or .env.local).`);
}
