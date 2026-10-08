import type {
  ActivityEvent,
  BusinessTask,
  Opportunity,
  OpportunityStatus,
  Organization,
  OrganizationMember,
  OrganizationMemberRole,
  TaskStatus,
  WorkPriority,
} from "@/types/command-center";
import type { Json } from "@/types/database";

const ROLES = new Set<OrganizationMemberRole>(["owner", "admin", "member", "viewer"]);
const TASK_STATUSES = new Set<TaskStatus>(["open", "in_progress", "blocked", "completed", "cancelled"]);
const OPPORTUNITY_STATUSES = new Set<OpportunityStatus>([
  "identified",
  "approved",
  "building",
  "testing",
  "live",
  "measuring",
]);
const PRIORITIES = new Set<WorkPriority>(["low", "medium", "high", "urgent"]);

export function asOrganizationMemberRole(value: string): OrganizationMemberRole {
  return ROLES.has(value as OrganizationMemberRole) ? (value as OrganizationMemberRole) : "member";
}

export function asTaskStatus(value: string): TaskStatus {
  return TASK_STATUSES.has(value as TaskStatus) ? (value as TaskStatus) : "open";
}

export function asOpportunityStatus(value: string): OpportunityStatus {
  return OPPORTUNITY_STATUSES.has(value as OpportunityStatus) ? (value as OpportunityStatus) : "identified";
}

export function asWorkPriority(value: string): WorkPriority {
  return PRIORITIES.has(value as WorkPriority) ? (value as WorkPriority) : "medium";
}

export function parseOrganization(row: {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  website: string | null;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}): Organization {
  return row;
}

export function parseOrganizationMember(row: {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}): OrganizationMember {
  return { ...row, role: asOrganizationMemberRole(row.role) };
}

export function parseOpportunity(row: {
  id: string;
  organization_id: string;
  title: string;
  department: string | null;
  current_problem: string | null;
  proposed_solution: string | null;
  estimated_hours_per_month: number | null;
  estimated_revenue_cents: number | null;
  priority: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}): Opportunity {
  return {
    ...row,
    estimated_hours_per_month:
      row.estimated_hours_per_month === null ? null : Number(row.estimated_hours_per_month),
    priority: asWorkPriority(row.priority),
    status: asOpportunityStatus(row.status),
  };
}

export function parseBusinessTask(row: {
  id: string;
  organization_id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  owner_user_id: string | null;
  source: string | null;
  opportunity_id: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}): BusinessTask {
  return {
    ...row,
    status: asTaskStatus(row.status),
    priority: asWorkPriority(row.priority),
  };
}

export function parseActivityEvent(row: {
  id: string;
  organization_id: string;
  event_type: string;
  occurred_at: string;
  actor_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  payload: Json;
  created_at: string;
}): ActivityEvent {
  return {
    ...row,
    payload: jsonObject(row.payload),
  };
}

function jsonObject(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function personalOrganizationSlug(userId: string): string {
  return `personal-${userId.replaceAll("-", "").slice(0, 12)}`;
}
