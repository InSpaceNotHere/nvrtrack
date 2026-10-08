import { describe, expect, it } from "vitest";

import { DESKTOP_NAV_ITEMS, MOBILE_MORE_NAV_ITEMS, MOBILE_NAV_ITEMS } from "./navigation";

describe("business navigation", () => {
  it("uses a business-focused desktop primary nav", () => {
    expect(DESKTOP_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Today",
      "Businesses",
      "Opportunities",
      "Implementations",
      "Tasks",
      "Results",
      "Activity",
      "AI",
      "Account",
    ]);
    expect(DESKTOP_NAV_ITEMS.some((item) => item.href === "/nutrition" || item.href === "/training")).toBe(false);
  });

  it("keeps mobile to Today, Opportunities, Tasks, plus More destinations", () => {
    expect(MOBILE_NAV_ITEMS.map((item) => item.label)).toEqual(["Today", "Opportunities", "Tasks"]);
    expect(MOBILE_MORE_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Businesses",
      "Implementations",
      "Results",
      "Activity",
      "AI",
      "Account",
    ]);
    expect(MOBILE_NAV_ITEMS.some((item) => ["Nutrition", "Training", "Progress", "Home"].includes(item.label))).toBe(
      false,
    );
  });
});
