import { describe, expect, it } from "vitest";

import { asTaskStatus, asWorkPriority, personalOrganizationSlug } from "./parse";

describe("command center parse helpers", () => {
  it("builds a stable personal slug from a user id", () => {
    expect(personalOrganizationSlug("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("personal-a1b2c3d4e5f6");
  });

  it("falls back to safe enums for unknown values", () => {
    expect(asTaskStatus("nope")).toBe("open");
    expect(asWorkPriority("nope")).toBe("medium");
    expect(asTaskStatus("blocked")).toBe("blocked");
  });
});
