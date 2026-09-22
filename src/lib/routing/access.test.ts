import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isAuthRoute, isProtectedRoute, isPublicRoute } from "./access";

describe("route access", () => {
  it("keeps /privacy public for signed-out visitors", () => {
    expect(isPublicRoute("/privacy")).toBe(true);
    expect(isProtectedRoute("/privacy")).toBe(false);
    expect(isAuthRoute("/privacy")).toBe(false);
  });

  it("does not treat /privacy as the profile route", () => {
    expect(isProtectedRoute("/profile")).toBe(true);
    expect(isProtectedRoute("/privacy")).toBe(false);
  });

  it("keeps login and signup as auth routes without requiring a session", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup")).toBe(true);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/signup")).toBe(false);
  });
});

describe("privacy surface dependency inventory", () => {
  it("does not add analytics, ads, replay, or AI SDKs", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {})];
    const blocked = [
      "@vercel/analytics",
      "@vercel/speed-insights",
      "posthog-js",
      "@sentry/nextjs",
      "mixpanel-browser",
      "amplitude-js",
      "@fullstory/browser",
      "hotjar",
      "react-ga",
      "react-ga4",
      "openai",
      "@anthropic-ai/sdk",
    ];

    expect(names.filter((name) => blocked.includes(name))).toEqual([]);
  });
});
