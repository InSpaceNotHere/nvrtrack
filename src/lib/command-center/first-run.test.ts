import { describe, expect, it } from "vitest";

import { resolveFirstRunState } from "./first-run";
import type { Organization } from "@/types/command-center";

const org: Organization = {
  id: "org-1",
  name: "Juniper & Co. Events",
  slug: "juniper-co-events",
  industry: null,
  website: null,
  timezone: "UTC",
  created_by: "user-1",
  created_at: "2026-10-08T00:00:00.000Z",
  updated_at: "2026-10-08T00:00:00.000Z",
};

describe("first-run workspace state", () => {
  it("asks the user to create a workspace when schema is ready and they have no org", () => {
    expect(resolveFirstRunState({ schemaReady: true, organization: null })).toBe("create_workspace");
  });

  it("does not show a broken dashboard when the business schema is missing", () => {
    expect(resolveFirstRunState({ schemaReady: false, organization: null })).toBe("schema_missing");
  });

  it("enters Today once a workspace exists", () => {
    expect(resolveFirstRunState({ schemaReady: true, organization: org })).toBe("ready");
  });
});
