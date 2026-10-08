import { describe, expect, it } from "vitest";

import { IMPACT_LABEL } from "./domain";
import { buildAttentionItems } from "./attention";
import { LocalBusinessRepository, MemoryStorage, WORKSPACE_STORAGE_KEY } from "./repository";
import { JUNIPER_ORG_ID } from "./seed";

const now = new Date("2026-10-08T15:00:00.000Z");

function repository(storage = new MemoryStorage()) {
  let sequence = 0;
  return new LocalBusinessRepository(
    storage,
    () => now,
    (prefix) => {
      sequence += 1;
      return `${prefix}-${sequence}`;
    },
  );
}

describe("local business repository", () => {
  it("seeds Juniper & Co. Events on first launch", () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    const workspace = repo.load();
    expect(workspace.business).toMatchObject({ id: JUNIPER_ORG_ID, name: "Juniper & Co. Events", industry: "Events" });
    expect(workspace.tasks.map((task) => task.title)).toContain("Send outstanding quote");
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toContain("Juniper & Co. Events");
    expect(repository(storage).getBusiness().name).toBe("Juniper & Co. Events");
  });

  it("persists task create, edit, and complete across a new repository instance", () => {
    const storage = new MemoryStorage();
    const first = repository(storage);
    const created = first.createTask({
      title: "Confirm florist delivery",
      description: "Call before Friday.",
      status: "open",
      priority: "high",
      dueAt: "2026-10-10T12:00:00.000Z",
    });
    const second = repository(storage);
    expect(second.getTasks().some((task) => task.id === created.id)).toBe(true);

    second.updateTask(created.id, {
      title: "Confirm florist delivery",
      description: "Call before Friday.",
      status: "completed",
      priority: "medium",
      dueAt: "2026-10-11T12:00:00.000Z",
    });
    const saved = repository(storage).getTasks().find((task) => task.id === created.id);
    expect(saved?.status).toBe("completed");
    expect(saved?.priority).toBe("medium");
    expect(saved?.completedAt).toBe(now.toISOString());
    const titles = repository(storage).getActivity().map((event) => event.title);
    expect(titles).toContain("Task created");
    expect(titles).toContain("Task completed");
    expect(titles).toContain("Task priority changed");
  });

  it("persists opportunity approval and keeps estimates labeled estimated", () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    const created = repo.createOpportunity({
      title: "Venue checklist",
      problem: "Checklists are rebuilt each time.",
      department: "Operations",
      description: null,
      recommendation: "Start from the last similar event.",
      priority: "high",
      status: "identified",
      estimatedHoursSavedMonthly: 3,
      estimatedValueMonthly: null,
    });
    repo.updateOpportunity(created.id, {
      title: created.title,
      problem: created.problem,
      department: created.department,
      description: created.description,
      recommendation: created.recommendation,
      priority: "high",
      status: "approved",
      estimatedHoursSavedMonthly: 3,
      estimatedValueMonthly: null,
    });
    const saved = repository(storage).getOpportunities().find((item) => item.id === created.id);
    expect(saved?.status).toBe("approved");
    expect(saved?.estimatedValueMonthly).toBeNull();
    expect(IMPACT_LABEL).toBe("estimated");
    expect(repository(storage).getActivity().map((event) => event.title)).toContain("Opportunity approved");
  });

  it("removes a completed task from Today attention and restores it on reset", () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    const before = buildAttentionItems({ ...repo.load(), now });
    expect(before.some((item) => item.title === "Send outstanding quote")).toBe(true);
    const quote = repo.getTasks().find((task) => task.title === "Send outstanding quote");
    if (!quote) {
      throw new Error("missing seed task");
    }
    repo.updateTask(quote.id, { ...quote, status: "completed" });
    const after = buildAttentionItems({ ...repo.load(), now });
    expect(after.some((item) => item.title === "Send outstanding quote")).toBe(false);

    repo.createTask({
      title: "Temporary note",
      description: null,
      status: "open",
      priority: "low",
      dueAt: null,
    });
    repo.reset();
    const restored = repository(storage).load();
    expect(restored.tasks.map((task) => task.title)).not.toContain("Temporary note");
    expect(restored.tasks.map((task) => task.title)).toContain("Send outstanding quote");
    expect(restored.activity.map((event) => event.id)).toContain("activity-seed-quote");
  });

  it("keeps research attached across reload, review, and recommendation adoption", () => {
    const storage = new MemoryStorage();
    const repo = repository(storage);
    const seeded = repo.getResearchForOpportunity("opp-lead-intake");
    expect(seeded?.reviewedAt).toBeNull();
    expect(seeded?.provenance).toBe("demo-fixture");
    const original = JSON.stringify(seeded?.result);

    const attention = buildAttentionItems({ ...repo.load(), now });
    expect(attention.some((item) => item.kind === "research_ready" && item.detail === "Lead intake & reply drafting")).toBe(true);

    repo.markResearchReviewed("opp-lead-intake");
    const reviewed = repository(storage).getResearchForOpportunity("opp-lead-intake");
    expect(reviewed?.reviewedAt).toBe(now.toISOString());
    expect(buildAttentionItems({ ...repository(storage).load(), now }).some((item) => item.kind === "research_ready")).toBe(false);

    const adopted = repo.adoptResearchRecommendation("opp-lead-intake");
    expect(adopted.recommendation).toContain("staff to approve");
    expect(JSON.stringify(repository(storage).getResearchForOpportunity("opp-lead-intake")?.result)).toBe(original);
    const titles = repository(storage).getActivity().map((event) => event.title);
    expect(titles).toContain("Research reviewed");
    expect(titles).toContain("Recommendation adopted");

    const exported = repo.exportWorkspace();
    const next = repository(new MemoryStorage());
    next.importWorkspace(exported);
    expect(next.getResearchForOpportunity("opp-lead-intake")?.result.run_id).toBe(seeded?.result.run_id);

    const withoutResearch = { ...exported, research: undefined };
    expect(next.importWorkspace(withoutResearch).research).toEqual([]);
  });

  it("refuses a second research attachment and a broken result", () => {
    const repo = repository();
    expect(() => repo.attachResearchResult("opp-lead-intake", repo.getResearchForOpportunity("opp-lead-intake")?.result)).toThrow(
      /already has research/,
    );
    expect(() => repo.attachResearchResult("opp-review-automation", { schema_version: "nope" })).toThrow(/schema/);
  });

  it("rejects an invalid workspace import", () => {
    const repo = repository();
    expect(() => repo.importWorkspace({ version: 1 })).toThrow(/valid NVRTRACK export/);
  });
});
