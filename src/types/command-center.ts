export type OrganizationMemberRole = "owner" | "admin" | "member" | "viewer";

export type TaskStatus = "open" | "in_progress" | "blocked" | "completed" | "cancelled";

export type OpportunityStatus =
  | "identified"
  | "approved"
  | "building"
  | "testing"
  | "live"
  | "measuring";

export type WorkPriority = "low" | "medium" | "high" | "urgent";

export type ImpactKind = "estimated" | "measured";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  website: string | null;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  organization_id: string;
  title: string;
  department: string | null;
  current_problem: string | null;
  proposed_solution: string | null;
  estimated_hours_per_month: number | null;
  estimated_revenue_cents: number | null;
  priority: WorkPriority;
  status: OpportunityStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessTask {
  id: string;
  organization_id: string;
  title: string;
  status: TaskStatus;
  priority: WorkPriority;
  due_at: string | null;
  owner_user_id: string | null;
  source: string | null;
  opportunity_id: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  organization_id: string;
  event_type: string;
  occurred_at: string;
  actor_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export type AttentionKind = "overdue_task" | "high_priority_task" | "open_opportunity";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  entityId: string;
  rank: number;
}

export interface RecommendedAction {
  id: string;
  title: string;
  detail: string;
  entityId: string | null;
  kind: AttentionKind | "create_first_record";
}

export interface BusinessSnapshot {
  openOpportunityCount: number;
  openTaskCount: number;
  overdueTaskCount: number;
  estimatedHoursPerMonth: number | null;
}

export interface ImpactSnapshot {
  estimatedHoursPerMonth: number | null;
  measuredHoursPerMonth: number | null;
  estimatedRevenueCents: number | null;
  measuredRevenueCents: number | null;
}
