import { describe, expect, it } from "vitest";

import {
  opportunityCreatedSummary,
  opportunityStatusChangedSummary,
  organizationCreatedSummary,
  taskCompletedSummary,
  taskCreatedSummary,
} from "./activity-copy";

describe("activity copy", () => {
  it("records task create and complete in plain language", () => {
    expect(taskCreatedSummary("Send outstanding quote")).toBe("Task created: Send outstanding quote");
    expect(taskCompletedSummary("Send outstanding quote")).toBe("Task completed: Send outstanding quote");
  });

  it("records opportunity create and status changes", () => {
    expect(opportunityCreatedSummary("Lead intake & reply drafting")).toBe(
      "Opportunity created: Lead intake & reply drafting",
    );
    expect(opportunityStatusChangedSummary("Lead intake & reply drafting", "identified", "approved")).toBe(
      "Opportunity “Lead intake & reply drafting” moved from identified to approved",
    );
  });

  it("records workspace creation", () => {
    expect(organizationCreatedSummary("Juniper & Co. Events")).toBe("Workspace created: Juniper & Co. Events");
  });
});
