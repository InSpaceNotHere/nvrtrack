import { describe, expect, it } from "vitest";

import type { BusinessTask, Opportunity } from "@/types/command-center";

import {
  buildAttentionItems,
  buildBusinessSnapshot,
  buildImpactSnapshot,
  buildRecommendedActions,
  isOverdueTask,
} from "./attention";

const now = new Date("2026-10-08T12:00:00.000Z");

function task(overrides: Partial<BusinessTask>): BusinessTask {
  return {
    id: "task-1",
    organization_id: "org-1",
    title: "Call the owner",
    status: "open",
    priority: "medium",
    due_at: null,
    owner_user_id: null,
    source: null,
    opportunity_id: null,
    completed_at: null,
    created_by: "user-1",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function opportunity(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "opp-1",
    organization_id: "org-1",
    title: "Invoice follow-up bot",
    department: "ops",
    current_problem: "Manual chasing",
    proposed_solution: "Reminder sequence",
    estimated_hours_per_month: 4,
    estimated_revenue_cents: 120000,
    priority: "high",
    status: "identified",
    created_by: "user-1",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("command center attention", () => {
  it("treats past-due open tasks as overdue and ignores completed work", () => {
    expect(isOverdueTask(task({ due_at: "2026-10-07T00:00:00.000Z" }), now)).toBe(true);
    expect(
      isOverdueTask(task({ due_at: "2026-10-07T00:00:00.000Z", status: "completed" }), now),
    ).toBe(false);
    expect(isOverdueTask(task({ due_at: "2026-10-09T00:00:00.000Z" }), now)).toBe(false);
  });

  it("ranks overdue work ahead of high-priority and open opportunities", () => {
    const items = buildAttentionItems({
      now,
      tasks: [
        task({ id: "t-high", title: "Prep proposal", priority: "high" }),
        task({ id: "t-late", title: "Send quote", due_at: "2026-10-01T00:00:00.000Z", priority: "low" }),
      ],
      opportunities: [opportunity({ title: "CRM cleanup" })],
    });

    expect(items.map((item) => item.kind)).toEqual([
      "overdue_task",
      "high_priority_task",
      "open_opportunity",
    ]);
  });

  it("builds a snapshot from stored facts and leaves missing hours null", () => {
    const snapshot = buildBusinessSnapshot({
      now,
      tasks: [
        task({ id: "open" }),
        task({ id: "late", due_at: "2026-10-01T00:00:00.000Z" }),
        task({ id: "done", status: "completed" }),
      ],
      opportunities: [
        opportunity({ estimated_hours_per_month: 3 }),
        opportunity({ id: "opp-2", status: "live", estimated_hours_per_month: 10 }),
      ],
    });

    expect(snapshot).toEqual({
      openOpportunityCount: 1,
      openTaskCount: 2,
      overdueTaskCount: 1,
      estimatedHoursPerMonth: 3,
    });
  });

  it("labels impact as estimated only until measured values exist", () => {
    const impact = buildImpactSnapshot([
      opportunity({ estimated_hours_per_month: 2, estimated_revenue_cents: 5000 }),
      opportunity({ id: "opp-2", estimated_hours_per_month: null, estimated_revenue_cents: null }),
    ]);

    expect(impact.estimatedHoursPerMonth).toBe(2);
    expect(impact.estimatedRevenueCents).toBe(5000);
    expect(impact.measuredHoursPerMonth).toBeNull();
    expect(impact.measuredRevenueCents).toBeNull();
  });

  it("recommends creating a first record when the org is empty", () => {
    const actions = buildRecommendedActions({ now, tasks: [], opportunities: [] });
    expect(actions).toEqual([
      expect.objectContaining({
        kind: "create_first_record",
        entityId: null,
      }),
    ]);
  });
});
