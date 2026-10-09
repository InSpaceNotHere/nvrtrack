import { describe, expect, it } from "vitest";

import {
  asTaskStatus,
  asWorkPriority,
  isMissingBusinessSchema,
  organizationSlugFromName,
  personalOrganizationSlug,
} from "./parse";

describe("command center parse helpers", () => {
  it("builds a stable personal slug from a user id", () => {
    expect(personalOrganizationSlug("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("personal-a1b2c3d4e5f6");
  });

  it("slugifies a workspace name with a unique suffix", () => {
    expect(organizationSlugFromName("Juniper & Co. Events", "a1b2c3d4-e5f6")).toBe("juniper-co-events-a1b2c3d4");
  });

  it("falls back to safe enums for unknown values", () => {
    expect(asTaskStatus("nope")).toBe("open");
    expect(asWorkPriority("nope")).toBe("medium");
    expect(asTaskStatus("blocked")).toBe("blocked");
  });

  it("detects a missing business schema error from PostgREST", () => {
    expect(isMissingBusinessSchema("Could not find the table 'public.organizations' in the schema cache")).toBe(true);
    expect(isMissingBusinessSchema("Failed to load tasks.")).toBe(false);
  });
});
