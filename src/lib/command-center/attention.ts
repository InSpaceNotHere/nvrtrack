import type {
  AttentionItem,
  BusinessSnapshot,
  BusinessTask,
  ImpactSnapshot,
  Opportunity,
  RecommendedAction,
  TaskStatus,
} from "@/types/command-center";

const OPEN_TASK_STATUSES: TaskStatus[] = ["open", "in_progress", "blocked"];
const ACTIVE_OPPORTUNITY_STATUSES = ["identified", "approved", "building", "testing"] as const;

export function isOpenTask(task: Pick<BusinessTask, "status">): boolean {
  return OPEN_TASK_STATUSES.includes(task.status);
}

export function isOverdueTask(task: Pick<BusinessTask, "status" | "due_at">, now: Date): boolean {
  if (!task.due_at || !isOpenTask(task)) {
    return false;
  }

  return new Date(task.due_at).getTime() < now.getTime();
}

export function isHighPriorityOpenTask(task: Pick<BusinessTask, "status" | "priority">): boolean {
  return isOpenTask(task) && (task.priority === "high" || task.priority === "urgent");
}

export function isActiveOpportunity(opportunity: Pick<Opportunity, "status">): boolean {
  return ACTIVE_OPPORTUNITY_STATUSES.includes(
    opportunity.status as (typeof ACTIVE_OPPORTUNITY_STATUSES)[number],
  );
}

export function isHighPriorityOpportunity(
  opportunity: Pick<Opportunity, "status" | "priority">,
): boolean {
  return isActiveOpportunity(opportunity) && (opportunity.priority === "high" || opportunity.priority === "urgent");
}

export function buildAttentionItems(input: {
  tasks: BusinessTask[];
  opportunities: Opportunity[];
  now: Date;
}): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const task of input.tasks) {
    if (isOverdueTask(task, input.now)) {
      items.push({
        id: `overdue-task-${task.id}`,
        kind: "overdue_task",
        title: task.title,
        detail: `Overdue since ${formatShortDate(task.due_at)}`,
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
        detail: `${capitalize(task.priority)} priority · ${formatTaskStatus(task.status)}`,
        entityId: task.id,
        rank: task.priority === "urgent" ? 2 : 3,
      });
    }
  }

  for (const opportunity of input.opportunities) {
    if (!isActiveOpportunity(opportunity)) {
      continue;
    }

    const highPriority = isHighPriorityOpportunity(opportunity);
    items.push({
      id: `open-opportunity-${opportunity.id}`,
      kind: highPriority ? "high_priority_opportunity" : "open_opportunity",
      title: opportunity.title,
      detail: `${capitalize(opportunity.status)} · ${capitalize(opportunity.priority)} priority`,
      entityId: opportunity.id,
      rank: highPriority ? (opportunity.priority === "urgent" ? 4 : 5) : 6,
    });
  }

  return items.sort((left, right) => left.rank - right.rank || left.title.localeCompare(right.title));
}

export function buildBusinessSnapshot(input: {
  tasks: BusinessTask[];
  opportunities: Opportunity[];
  now: Date;
}): BusinessSnapshot {
  const openTasks = input.tasks.filter(isOpenTask);
  const overdueTasks = input.tasks.filter((task) => isOverdueTask(task, input.now));
  const openOpportunities = input.opportunities.filter(isActiveOpportunity);
  const highPriorityOpportunities = input.opportunities.filter(isHighPriorityOpportunity);

  return {
    openOpportunityCount: openOpportunities.length,
    highPriorityOpportunityCount: highPriorityOpportunities.length,
    openTaskCount: openTasks.length,
    overdueTaskCount: overdueTasks.length,
  };
}

export function buildImpactSnapshot(opportunities: Opportunity[]): ImpactSnapshot {
  const estimatedHours = sumNullable(opportunities.map((item) => item.estimated_hours_per_month));
  const estimatedRevenue = sumNullable(opportunities.map((item) => item.estimated_revenue_cents));

  return {
    estimatedHoursPerMonth: estimatedHours,
    measuredHoursPerMonth: null,
    estimatedRevenueCents: estimatedRevenue,
    measuredRevenueCents: null,
  };
}

export function buildRecommendedActions(input: {
  tasks: BusinessTask[];
  opportunities: Opportunity[];
  now: Date;
}): RecommendedAction[] {
  const overdue = input.tasks.filter((task) => isOverdueTask(task, input.now));
  const highPriority = input.tasks.filter(
    (task) => !isOverdueTask(task, input.now) && isHighPriorityOpenTask(task),
  );
  const openOpportunities = input.opportunities.filter(isActiveOpportunity);
  const actions: RecommendedAction[] = [];

  for (const task of overdue.slice(0, 3)) {
    actions.push({
      id: `complete-overdue-${task.id}`,
      kind: "overdue_task",
      entityId: task.id,
      title: `Complete “${task.title}”`,
      detail: "This follow-up is overdue and is blocking a clean Today list.",
    });
  }

  for (const task of highPriority.slice(0, 2)) {
    if (actions.length >= 4) {
      break;
    }
    actions.push({
      id: `advance-high-${task.id}`,
      kind: "high_priority_task",
      entityId: task.id,
      title: `Advance “${task.title}”`,
      detail: "High-priority work is still open.",
    });
  }

  for (const opportunity of openOpportunities.slice(0, 2)) {
    if (actions.length >= 5) {
      break;
    }
    actions.push({
      id: `move-opportunity-${opportunity.id}`,
      kind: "open_opportunity",
      entityId: opportunity.id,
      title: `Move “${opportunity.title}” forward`,
      detail: `Status is ${opportunity.status}. Record the next real step as a task.`,
    });
  }

  if (input.tasks.length === 0 && input.opportunities.length === 0) {
    actions.push({
      id: "create-first-record",
      kind: "create_first_record",
      entityId: null,
      title: "Create the first task or opportunity",
      detail: "Today only recommends work that already exists in this organization.",
    });
  }

  return actions;
}

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (present.length === 0) {
    return null;
  }
  return present.reduce((total, value) => total + value, 0);
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "an unknown date";
  }
  return value.slice(0, 10);
}

function formatTaskStatus(status: TaskStatus): string {
  if (status === "in_progress") {
    return "In progress";
  }
  return capitalize(status);
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
