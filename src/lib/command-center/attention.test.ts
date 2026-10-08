import { describe, expect, it } from "vitest";

import type { LocalOpportunity, LocalTask } from "./domain";
import { createJuniperSeed } from "./seed";
import { buildAttentionItems, buildBusinessSnapshot, buildRecommendedActions, isOverdueTask } from "./attention";

const now = new Date("2026-10-08T15:00:00.000Z");

function task(overrides: Partial<LocalTask>): LocalTask {
  return {
    id: "task-1",
    organizationId: "org-juniper",
    title: "Call the owner",
    description: null,
    status: "open",
    priority: "medium",
    dueAt: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function opportunity(overrides: Partial<LocalOpportunity>): LocalOpportunity {
  return {
    id: "opp-1",
    organizationId: "org-juniper",
    title: "Lead intake",
    problem: null,
    department: "Sales",
    description: null,
    recommendation: null,
    priority: "medium",
    status: "identified",
    estimatedHoursSavedMonthly: null,
    estimatedValueMonthly: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("local attention", () => {
  it("ranks overdue tasks, urgent work, high-priority opportunities, then approved work", () => {
    const seed = createJuniperSeed(now);
    const items = buildAttentionItems({ ...seed, now });
    expect(items.map((item) => item.title)).toEqual([
      "Send outstanding quote",
      "Follow up with 3 unanswered inquiries",
      "Proposal drafting assistant",
      "Lead intake & reply drafting",
    ]);
    expect(items.map((item) => item.kind)).toEqual([
      "overdue_task",
      "high_priority_task",
      "approved_opportunity",
      "high_priority_opportunity",
    ]);
  });

  it("ignores completed tasks even when the due date is past", () => {
    expect(isOverdueTask(task({ dueAt: "2026-10-01T12:00:00.000Z", status: "completed" }), now)).toBe(false);
  });

  it("counts only stored open, overdue, active, and high-priority rows", () => {
    const snapshot = buildBusinessSnapshot({
      now,
      tasks: [
        task({ id: "open" }),
        task({ id: "late", dueAt: "2026-10-01T12:00:00.000Z" }),
        task({ id: "done", status: "completed", dueAt: "2026-10-01T12:00:00.000Z" }),
      ],
      opportunities: [
        opportunity({ priority: "high" }),
        opportunity({ id: "approved", status: "approved" }),
        opportunity({ id: "done", status: "completed", priority: "urgent" }),
      ],
    });
    expect(snapshot).toEqual({
      openTaskCount: 2,
      overdueTaskCount: 1,
      activeOpportunityCount: 2,
      highPriorityOpportunityCount: 1,
    });
  });

  it("derives recommended actions from the Juniper seed", () => {
    const seed = createJuniperSeed(now);
    const actions = buildRecommendedActions({ ...seed, now });
    expect(actions.map((action) => action.title)).toEqual([
      "Send overdue quote",
      "Follow up with 3 unanswered inquiries",
      "Review approved AI opportunity: Proposal drafting assistant",
    ]);
  });
});
