import {
  ACTIVE_OPPORTUNITY_STATUSES,
  OPEN_TASK_STATUSES,
  type AttentionItem,
  type BusinessSnapshot,
  type LocalImplementation,
  type LocalOpportunity,
  type LocalTask,
  type MetricDefinition,
  type MetricObservation,
  type RecommendedAction,
  type ResearchAttachment,
  type TaskStatus,
} from "./domain";
import { isMeasured } from "./improvement";

export function isOpenTask(task: Pick<LocalTask, "status">): boolean {
  return OPEN_TASK_STATUSES.includes(task.status);
}

export function isOverdueTask(task: Pick<LocalTask, "status" | "dueAt">, now: Date): boolean {
  if (!task.dueAt || !isOpenTask(task)) {
    return false;
  }
  return new Date(task.dueAt).getTime() < now.getTime();
}

export function isHighPriorityOpenTask(task: Pick<LocalTask, "status" | "priority">): boolean {
  return isOpenTask(task) && (task.priority === "high" || task.priority === "urgent");
}

export function isActiveOpportunity(opportunity: Pick<LocalOpportunity, "status">): boolean {
  return ACTIVE_OPPORTUNITY_STATUSES.includes(opportunity.status);
}

export function isHighPriorityOpportunity(opportunity: Pick<LocalOpportunity, "status" | "priority">): boolean {
  return isActiveOpportunity(opportunity) && (opportunity.priority === "high" || opportunity.priority === "urgent");
}

export function buildAttentionItems(input: {
  tasks: LocalTask[];
  opportunities: LocalOpportunity[];
  research?: ResearchAttachment[];
  implementations?: LocalImplementation[];
  metrics?: MetricDefinition[];
  observations?: MetricObservation[];
  now: Date;
}): AttentionItem[] {
  const unreviewedResearch = new Set(
    (input.research ?? []).filter((item) => item.reviewedAt === null).map((item) => item.opportunityId),
  );
  const items: AttentionItem[] = [];

  for (const task of input.tasks) {
    if (isOverdueTask(task, input.now)) {
      items.push({
        id: `overdue-task-${task.id}`,
        kind: "overdue_task",
        title: task.title,
        detail: `Overdue since ${task.dueAt?.slice(0, 10)}`,
        entityId: task.id,
        rank: task.priority === "urgent" ? 0 : 1,
      });
      continue;
    }
    if (isHighPriorityOpenTask(task)) {
      items.push({
        id: `high-task-${task.id}`,
        kind: "high_priority_task",
        title: task.title,
        detail: `${label(task.priority)} priority · ${label(task.status)}`,
        entityId: task.id,
        rank: task.priority === "urgent" ? 2 : 3,
      });
    }
  }

  for (const opportunity of input.opportunities) {
    if (opportunity.status === "approved") {
      items.push({
        id: `approved-opportunity-${opportunity.id}`,
        kind: "approved_opportunity",
        title: opportunity.title,
        detail: "Approved and waiting for the next action",
        entityId: opportunity.id,
        rank: 4,
      });
      continue;
    }
    if (unreviewedResearch.has(opportunity.id) && (isHighPriorityOpportunity(opportunity) || opportunity.priority === "high" || opportunity.priority === "urgent")) {
      items.push({
        id: `research-${opportunity.id}`,
        kind: "research_ready",
        title: "Research ready to review",
        detail: opportunity.title,
        entityId: opportunity.id,
        rank: 5,
      });
      continue;
    }
    if (isHighPriorityOpportunity(opportunity)) {
      items.push({
        id: `high-opportunity-${opportunity.id}`,
        kind: "high_priority_opportunity",
        title: opportunity.title,
        detail: `${label(opportunity.status)} · ${label(opportunity.priority)} priority`,
        entityId: opportunity.id,
        rank: 5,
      });
    }
  }

  for (const implementation of input.implementations ?? []) {
    if (implementation.status === "planning") {
      items.push({
        id: `approve-${implementation.id}`,
        kind: "implementation_approval",
        title: "Implementation waiting for approval",
        detail: implementation.name,
        entityId: implementation.id,
        rank: 3,
      });
    }
    const metrics = (input.metrics ?? []).filter((metric) => metric.implementationId === implementation.id);
    const observations = (input.observations ?? []).filter((item) => metrics.some((metric) => metric.id === item.metricId));
    const baseline = observations.find((item) => item.role === "baseline" && item.evidenceType !== "missing");
    const followUp = observations.find((item) => item.role === "follow_up" && isMeasured(item));
    const active = implementation.status === "testing" || implementation.status === "live" || implementation.status === "measuring";
    if (active && !baseline) {
      items.push({
        id: `baseline-${implementation.id}`,
        kind: "baseline_due",
        title: "Baseline measurement due",
        detail: implementation.name,
        entityId: implementation.id,
        rank: 6,
      });
    }
    if (followUp) {
      items.push({
        id: `result-${implementation.id}`,
        kind: "result_ready",
        title: "Result ready for review",
        detail: implementation.name,
        entityId: implementation.id,
        rank: 4,
      });
    }
  }

  return items.sort((left, right) => left.rank - right.rank || left.title.localeCompare(right.title));
}

export function buildBusinessSnapshot(input: {
  tasks: LocalTask[];
  opportunities: LocalOpportunity[];
  now: Date;
}): BusinessSnapshot {
  return {
    openTaskCount: input.tasks.filter(isOpenTask).length,
    overdueTaskCount: input.tasks.filter((task) => isOverdueTask(task, input.now)).length,
    activeOpportunityCount: input.opportunities.filter(isActiveOpportunity).length,
    highPriorityOpportunityCount: input.opportunities.filter(isHighPriorityOpportunity).length,
  };
}

export function buildRecommendedActions(input: {
  tasks: LocalTask[];
  opportunities: LocalOpportunity[];
  now: Date;
}): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const overdue = input.tasks.filter((task) => isOverdueTask(task, input.now));
  const urgent = input.tasks.filter((task) => !isOverdueTask(task, input.now) && task.priority === "urgent" && isOpenTask(task));
  const approved = input.opportunities.filter((item) => item.status === "approved");

  for (const task of overdue.slice(0, 2)) {
    actions.push({
      id: `overdue-${task.id}`,
      kind: "overdue_task",
      entityId: task.id,
      title: task.title.toLowerCase().includes("quote") ? "Send overdue quote" : `Complete “${task.title}”`,
      detail: "This task is past due.",
    });
  }
  for (const task of urgent.slice(0, 2)) {
    actions.push({
      id: `urgent-${task.id}`,
      kind: "high_priority_task",
      entityId: task.id,
      title: task.title,
      detail: "Urgent work is still open.",
    });
  }
  for (const opportunity of approved.slice(0, 2)) {
    actions.push({
      id: `approved-${opportunity.id}`,
      kind: "approved_opportunity",
      entityId: opportunity.id,
      title: `Review approved AI opportunity: ${opportunity.title}`,
      detail: "Approved work still needs an owner action.",
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: "clear",
      kind: "create_first_record",
      entityId: null,
      title: "Nothing urgent is waiting",
      detail: "Add a task or opportunity when new work shows up.",
    });
  }
  return actions;
}

function label(value: TaskStatus | string): string {
  return value.replaceAll("_", " ").replace(/^\w/, (char) => char.toUpperCase());
}
