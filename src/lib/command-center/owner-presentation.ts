import { isOverdueTask, isOpenTask } from "./attention";
import type { AttentionItem, LocalTask, OpportunityStatus, RecommendedAction } from "./domain";

export function splitAttention(items: AttentionItem[]): { hero: AttentionItem | null; rest: AttentionItem[] } {
  const [hero, ...rest] = items;
  return { hero: hero ?? null, rest: rest.slice(0, 4) };
}

export function distinctSuggestions(attention: AttentionItem[], recommended: RecommendedAction[]): RecommendedAction[] {
  const shown = new Set(attention.map((item) => item.entityId));
  return recommended.filter((action) => action.entityId && !shown.has(action.entityId));
}

export function attentionCountLabel(count: number): string {
  if (count === 0) return "Nothing is waiting on you right now.";
  if (count === 1) return "1 thing needs a decision or follow-up.";
  return `${count} things need a decision or follow-up.`;
}

export function whyNow(item: AttentionItem, task: LocalTask | undefined, now: Date): string {
  if (item.kind === "overdue_task" && task?.dueAt) {
    const days = calendarDaysBetween(task.dueAt, now);
    return days === 1 ? "Overdue by 1 day." : `Overdue by ${days} days.`;
  }
  if (item.kind === "high_priority_task") {
    return task?.priority === "urgent" ? "Urgent." : "High priority.";
  }
  if (item.kind === "approved_opportunity") return "Ready for review.";
  if (item.kind === "high_priority_opportunity") return "High-priority opportunity.";
  return item.detail;
}

export function workGroups(tasks: LocalTask[], now: Date): { overdue: LocalTask[]; next: LocalTask[]; done: LocalTask[] } {
  const overdue = tasks.filter((task) => isOverdueTask(task, now));
  const next = tasks.filter((task) => isOpenTask(task) && !isOverdueTask(task, now));
  const done = tasks
    .filter((task) => task.status === "completed")
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""));
  return { overdue, next, done };
}

export function taskTone(task: LocalTask, now: Date): { when: string; priority: string } {
  const priority = task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "High priority" : task.priority === "medium" ? "Medium priority" : "Low priority";
  if (isOverdueTask(task, now) && task.dueAt) {
    const days = calendarDaysBetween(task.dueAt, now);
    return { when: days === 1 ? "Overdue by 1 day" : `Overdue by ${days} days`, priority };
  }
  if (!task.dueAt) return { when: "No due date", priority };
  const due = new Date(task.dueAt);
  const dayDiff = Math.round((Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000);
  if (dayDiff === 0) return { when: "Due today", priority };
  if (dayDiff === 1) return { when: "Due tomorrow", priority };
  return { when: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`, priority };
}

export type OpportunityBand = "ready" | "progress" | "later";

export function opportunityBand(status: OpportunityStatus): OpportunityBand {
  if (status === "identified" || status === "approved") return "ready";
  if (status === "building" || status === "testing" || status === "live") return "progress";
  return "later";
}

export function stageLabel(status: OpportunityStatus): string {
  const labels: Record<OpportunityStatus, string> = {
    identified: "Not started",
    approved: "Ready for review",
    building: "Being built",
    testing: "Being tested",
    live: "Live",
    measuring: "Watching results",
    completed: "Finished",
    rejected: "Set aside",
  };
  return labels[status];
}

export function priorityLabel(priority: string): string {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "High priority";
  if (priority === "low") return "Low priority";
  return "Medium priority";
}

export function activityDayLabel(iso: string, now: Date): string {
  const event = new Date(iso);
  const dayDiff = Math.round(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate())) /
      86_400_000,
  );
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return event.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function calendarDaysBetween(dueIso: string, now: Date): number {
  const due = new Date(dueIso);
  const diff =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.max(1, Math.round(diff / 86_400_000));
}

export function activityWhen(iso: string, now: Date): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const hours = Math.round(elapsed / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
