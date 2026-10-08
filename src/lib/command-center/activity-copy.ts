import type { OpportunityStatus } from "@/types/command-center";

export function taskCreatedSummary(title: string): string {
  return `Task created: ${title.trim()}`;
}

export function taskCompletedSummary(title: string): string {
  return `Task completed: ${title.trim()}`;
}

export function opportunityCreatedSummary(title: string): string {
  return `Opportunity created: ${title.trim()}`;
}

export function opportunityStatusChangedSummary(
  title: string,
  fromStatus: OpportunityStatus,
  toStatus: OpportunityStatus,
): string {
  return `Opportunity “${title.trim()}” moved from ${fromStatus} to ${toStatus}`;
}

export function organizationCreatedSummary(name: string): string {
  return `Workspace created: ${name.trim()}`;
}
