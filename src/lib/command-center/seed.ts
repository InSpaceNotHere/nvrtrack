import type { LocalActivityEvent, LocalOpportunity, LocalTask, ResearchAttachment, WorkspaceSnapshot } from "./domain";
import leadIntakeResearch from "./fixtures/juniper-lead-intake-research-v1.json";
import { parseResearchResult } from "./research-contract";

export const JUNIPER_ORG_ID = "org-juniper";

function atNoon(now: Date, dayOffset: number): string {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + dayOffset);
  next.setUTCHours(12, 0, 0, 0);
  return next.toISOString();
}

export function createJuniperSeed(now: Date): WorkspaceSnapshot {
  const createdAt = atNoon(now, -10);
  const tasks: LocalTask[] = [
    {
      id: "task-outstanding-quote",
      organizationId: JUNIPER_ORG_ID,
      title: "Send outstanding quote",
      description: "The revised quote is still sitting in drafts.",
      status: "open",
      priority: "high",
      dueAt: atNoon(now, -2),
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    },
    {
      id: "task-unanswered-inquiries",
      organizationId: JUNIPER_ORG_ID,
      title: "Follow up with 3 unanswered inquiries",
      description: "Three new inquiries have not received a reply.",
      status: "open",
      priority: "urgent",
      dueAt: atNoon(now, 1),
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    },
    {
      id: "task-stale-client",
      organizationId: JUNIPER_ORG_ID,
      title: "Contact client with no touch in 9 days",
      description: "A booked client has gone quiet.",
      status: "open",
      priority: "medium",
      dueAt: atNoon(now, 3),
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    },
    {
      id: "task-proposal-draft",
      organizationId: JUNIPER_ORG_ID,
      title: "Review proposal draft",
      description: "Check the draft before it goes to the client.",
      status: "open",
      priority: "medium",
      dueAt: atNoon(now, 5),
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    },
  ];

  const opportunities: LocalOpportunity[] = [
    {
      id: "opp-lead-intake",
      organizationId: JUNIPER_ORG_ID,
      title: "Lead intake & reply drafting",
      problem: "New inquiries are handled manually and response times vary.",
      department: "Sales",
      description: "First replies are written by hand for every inquiry.",
      recommendation: "Draft the first reply from the inquiry details and queue it for approval.",
      priority: "high",
      status: "identified",
      estimatedHoursSavedMonthly: 6,
      estimatedValueMonthly: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "opp-review-automation",
      organizationId: JUNIPER_ORG_ID,
      title: "Review request automation",
      department: "Customer Experience",
      problem: "Review asks go out late, or not at all, after an event.",
      description: "There is no consistent follow-up after delivery.",
      recommendation: null,
      priority: "medium",
      status: "identified",
      estimatedHoursSavedMonthly: null,
      estimatedValueMonthly: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "opp-proposal-assistant",
      organizationId: JUNIPER_ORG_ID,
      title: "Proposal drafting assistant",
      department: "Sales",
      problem: "Proposals take too long to assemble from past events.",
      description: "Each proposal starts from a blank page.",
      recommendation: "Assemble a first draft from the approved scope and past similar events.",
      priority: "medium",
      status: "approved",
      estimatedHoursSavedMonthly: 4,
      estimatedValueMonthly: null,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const activity: LocalActivityEvent[] = [
    {
      id: "activity-seed-quote",
      organizationId: JUNIPER_ORG_ID,
      eventType: "task.created",
      entityType: "task",
      entityId: "task-outstanding-quote",
      title: "Task created",
      description: "Send outstanding quote",
      createdAt: atNoon(now, -4),
    },
    {
      id: "activity-seed-lead",
      organizationId: JUNIPER_ORG_ID,
      eventType: "opportunity.identified",
      entityType: "opportunity",
      entityId: "opp-lead-intake",
      title: "Opportunity identified",
      description: "Lead intake & reply drafting",
      createdAt: atNoon(now, -3),
    },
    {
      id: "activity-seed-proposal",
      organizationId: JUNIPER_ORG_ID,
      eventType: "opportunity.approved",
      entityType: "opportunity",
      entityId: "opp-proposal-assistant",
      title: "Opportunity approved",
      description: "Proposal drafting assistant",
      createdAt: atNoon(now, -1),
    },
  ];

  const researchResult = parseResearchResult(leadIntakeResearch, now);
  if (!researchResult.ok) {
    throw new Error(researchResult.error);
  }
  const research: ResearchAttachment[] = [
    {
      opportunityId: "opp-lead-intake",
      importedAt: atNoon(now, -1),
      reviewedAt: null,
      provenance: "demo-fixture",
      result: researchResult.result,
    },
  ];

  return {
    version: 1,
    business: {
      id: JUNIPER_ORG_ID,
      name: "Juniper & Co. Events",
      industry: "Events",
      createdAt,
    },
    tasks,
    opportunities,
    activity: [
      ...activity,
      {
        id: "activity-seed-research",
        organizationId: JUNIPER_ORG_ID,
        eventType: "research.attached",
        entityType: "opportunity",
        entityId: "opp-lead-intake",
        title: "Research attached",
        description: "Lead intake & reply drafting",
        createdAt: atNoon(now, -1),
      },
    ],
    research,
    implementations: [],
    metrics: [],
    observations: [],
  };
}
