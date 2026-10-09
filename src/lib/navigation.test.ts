import { describe, expect, it } from "vitest";

import { MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "./navigation";

describe("owner navigation", () => {
  it("keeps the primary rail to Today, Work, and Opportunities", () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => [item.label, item.href])).toEqual([
      ["Today", "/today"],
      ["Work", "/tasks"],
      ["Opportunities", "/opportunities"],
    ]);
    expect(PRIMARY_NAV_ITEMS.some((item) => ["/nutrition", "/training", "/progress"].includes(item.href))).toBe(false);
  });

  it("puts the remaining destinations behind More", () => {
    expect(MORE_NAV_ITEMS.map((item) => item.label)).toEqual(["Business", "Results", "Activity", "AI", "Account"]);
  });
});