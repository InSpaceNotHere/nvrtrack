export type TaskStatus = "open" | "in_progress" | "blocked" | "completed" | "cancelled";

export type OpportunityStatus =
  | "identified"
  | "approved"
  | "building"
  | "testing"
  | "live"
  | "measuring"
  | "completed"
  | "rejected";

export type WorkPriority = "low" | "medium" | "high" | "urgent";

export type ImpactLabel = "estimated";

export interface LocalBusiness {
  id: string;
  name: string;
  industry: string | null;
  createdAt: string;
}

export interface LocalTask {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: WorkPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface LocalOpportunity {
  id: string;
  organizationId: string;
  title: string;
  problem: string | null;
  department: string | null;
  description: string | null;
  recommendation: string | null;
  priority: WorkPriority;
  status: OpportunityStatus;
  estimatedHoursSavedMonthly: number | null;
  estimatedValueMonthly: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalActivityEvent {
  id: string;
  organizationId: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  description: string | null;
  createdAt: string;
}

export type ResearchProvenance = "demo-fixture" | "imported";

export interface ResearchAttachment {
  opportunityId: string;
  importedAt: string;
  reviewedAt: string | null;
  provenance: ResearchProvenance;
  result: import("./research-contract").ResearchResult;
}

export interface WorkspaceSnapshot {
  version: 1;
  business: LocalBusiness;
  tasks: LocalTask[];
  opportunities: LocalOpportunity[];
  activity: LocalActivityEvent[];
  research: ResearchAttachment[];
}

export type AttentionKind =
  | "overdue_task"
  | "high_priority_task"
  | "high_priority_opportunity"
  | "approved_opportunity"
  | "research_ready";

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
  openTaskCount: number;
  overdueTaskCount: number;
  activeOpportunityCount: number;
  highPriorityOpportunityCount: number;
}

export const OPEN_TASK_STATUSES: TaskStatus[] = ["open", "in_progress", "blocked"];

export const ACTIVE_OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "identified",
  "approved",
  "building",
  "testing",
];

export const TASK_STATUSES: TaskStatus[] = ["open", "in_progress", "blocked", "completed", "cancelled"];

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "identified",
  "approved",
  "building",
  "testing",
  "live",
  "measuring",
  "completed",
  "rejected",
];

export const WORK_PRIORITIES: WorkPriority[] = ["low", "medium", "high", "urgent"];

export const IMPACT_LABEL: ImpactLabel = "estimated";
