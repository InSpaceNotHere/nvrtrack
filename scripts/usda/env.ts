import fs from "node:fs";
import path from "node:path";

function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }
    const value = line.slice(separator + 1).trim();
    values[key] = value;
  }
  return values;
}

export function loadLocalEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const contents = fs.readFileSync(envPath, "utf8");
  const parsed = parseEnvFile(contents);
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}
