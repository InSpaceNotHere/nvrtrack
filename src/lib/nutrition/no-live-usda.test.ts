import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const LIVE_USDA_PATHS = [
  "src/lib/usda/client.ts",
  "src/lib/usda/live.ts",
  "src/lib/usda/fixtures.ts",
  "src/lib/usda/search.ts",
  "src/app/api/usda/search/route.ts",
];

const PRODUCT_SCAN_ROOTS = ["src/app", "src/components", "src/lib/data", "src/lib/nutrition", "src/lib/privacy"];

const FORBIDDEN_RUNTIME = [
  "api.nal.usda.gov",
  "/api/usda/search",
  "USDA_FDC_API_KEY",
  "USDA_FDC_FIXTURE_MODE",
  "searchLiveUsdaFoods",
  "resolveLiveUsdaFoodDetail",
  "createLiveUsdaFoodEntryAction",
  "createMyLiveUsdaFoodEntry",
];

function walkTsFiles(dir: string): string[] {
  const absolute = path.join(ROOT, dir);
  if (!existsSync(absolute)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(relative));
      continue;
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(relative);
    }
  }
  return out;
}

describe("live USDA runtime is removed", () => {
  it("deletes the live client, cache, search route, and fixture mode", () => {
    for (const relativePath of LIVE_USDA_PATHS) {
      expect(existsSync(path.join(ROOT, relativePath)), relativePath).toBe(false);
    }
  });

  it("keeps catalog generation types and nutrient helpers", () => {
    expect(existsSync(path.join(ROOT, "src/lib/usda/catalog-pilot.ts"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/lib/usda/nutrients.ts"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/lib/usda/normalization.ts"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/lib/usda/types.ts"))).toBe(true);
  });

  it("does not call live USDA from product runtime code", () => {
    const files = PRODUCT_SCAN_ROOTS.flatMap(walkTsFiles);
    expect(files.length).toBeGreaterThan(10);
    for (const relativePath of files) {
      const source = readFileSync(path.join(ROOT, relativePath), "utf8");
      for (const token of FORBIDDEN_RUNTIME) {
        expect(source.includes(token), `${relativePath} contains ${token}`).toBe(false);
      }
    }
  });
});
