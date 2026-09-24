import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { allowNonProductionFixturePreview, resolveNonProductionFixtureParam } from "./fixture-preview";

function isTrainingFixture(
  value: string | undefined,
): value is "scheduled" | "rest" | "uninitialized" {
  return value === "scheduled" || value === "rest" || value === "uninitialized";
}

describe("training fixture preview isolation", () => {
  it("never enables fixtures in Vercel production or production Node without a preview env", () => {
    expect(allowNonProductionFixturePreview({ NODE_ENV: "production" })).toBe(false);
    expect(allowNonProductionFixturePreview({ NODE_ENV: "development", VERCEL_ENV: "production" })).toBe(false);
    expect(allowNonProductionFixturePreview({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
  });

  it("allows explicit query fixtures in local/test and hosted Preview, never without a valid param", () => {
    expect(allowNonProductionFixturePreview({ NODE_ENV: "test" })).toBe(true);
    expect(allowNonProductionFixturePreview({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
    expect(resolveNonProductionFixtureParam("scheduled", isTrainingFixture, { NODE_ENV: "test" })).toBe("scheduled");
    expect(resolveNonProductionFixtureParam("scheduled", isTrainingFixture, { NODE_ENV: "production" })).toBeNull();
    expect(
      resolveNonProductionFixtureParam("scheduled", isTrainingFixture, { NODE_ENV: "production", VERCEL_ENV: "preview" }),
    ).toBe("scheduled");
    expect(resolveNonProductionFixtureParam("not-a-fixture", isTrainingFixture, { NODE_ENV: "test" })).toBeNull();
  });

  it("does not render fixture preview labels in the Training home view", () => {
    const view = readFileSync(path.join(process.cwd(), "src/components/training/training-home-view.tsx"), "utf8");
    expect(view).not.toContain("Fixture preview");
    expect(view).not.toContain("fixtureLabel");
    expect(view).not.toMatch(/active-scheduled|uninitialized/);
  });
});
