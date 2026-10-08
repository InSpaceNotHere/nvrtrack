import "server-only";

import type { ActivityEvent, BusinessTask, Opportunity, Organization } from "@/types/command-center";
import type { Database, Json } from "@/types/database";

import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import {
  parseActivityEvent,
  parseBusinessTask,
  parseOpportunity,
  parseOrganization,
  personalOrganizationSlug,
} from "@/lib/command-center/parse";

type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
type MemberInsert = Database["public"]["Tables"]["organization_members"]["Insert"];
type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];
type TaskInsert = Database["public"]["Tables"]["business_tasks"]["Insert"];
type ActivityInsert = Database["public"]["Tables"]["activity_events"]["Insert"];

export interface CreateTaskInput {
  organizationId: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: string | null;
}

export interface CreateOpportunityInput {
  organizationId: string;
  title: string;
  department: string | null;
  currentProblem: string | null;
  proposedSolution: string | null;
  estimatedHoursPerMonth: number | null;
  estimatedRevenueCents: number | null;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface CommandCenterTodayData {
  organization: Organization;
  tasks: BusinessTask[];
  opportunities: Opportunity[];
  activity: ActivityEvent[];
}

function dbFail<T>(message: string, cause?: string): DataAccessResult<T> {
  return fail({
    code: "DB_ERROR",
    message,
    cause,
  });
}

export async function ensurePersonalOrganization(): Promise<DataAccessResult<Organization>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return dbFail("Failed to load organization membership.", membershipError.message);
  }

  if (membership?.organization_id) {
    const { data: existing, error: existingError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (existingError) {
      return dbFail("Failed to load organization.", existingError.message);
    }
    if (existing) {
      return ok(parseOrganization(existing));
    }
  }

  const organizationPayload: OrganizationInsert = {
    name: "Personal",
    slug: personalOrganizationSlug(user.id),
    created_by: user.id,
  };

  const { data: created, error: createError } = await supabase
    .from("organizations")
    .insert(organizationPayload)
    .select("*")
    .single();

  if (createError) {
    const { data: bySlug, error: slugError } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", organizationPayload.slug)
      .maybeSingle();
    if (slugError || !bySlug) {
      return dbFail("Failed to create organization.", createError.message);
    }
    return ok(parseOrganization(bySlug));
  }

  const memberPayload: MemberInsert = {
    organization_id: created.id,
    user_id: user.id,
    role: "owner",
  };

  const { error: memberError } = await supabase.from("organization_members").insert(memberPayload);
  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    return dbFail("Failed to add organization owner membership.", memberError.message);
  }

  const { error: activityError } = await supabase.from("activity_events").insert({
    organization_id: created.id,
    event_type: "organization.created",
    actor_user_id: user.id,
    entity_type: "organization",
    entity_id: created.id,
    summary: "Personal organization created",
    payload: { name: created.name } satisfies Json,
  } satisfies ActivityInsert);

  if (activityError) {
    return dbFail("Failed to record organization activity.", activityError.message);
  }

  return ok(parseOrganization(created));
}

export async function getCommandCenterToday(): Promise<DataAccessResult<CommandCenterTodayData>> {
  const organizationResult = await ensurePersonalOrganization();
  if (organizationResult.error) {
    return organizationResult;
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const organization = organizationResult.data;
  const { supabase } = auth.data;

  const [tasksResult, opportunitiesResult, activityResult] = await Promise.all([
    supabase
      .from("business_tasks")
      .select("*")
      .eq("organization_id", organization.id)
      .order("due_at", { ascending: true })
      .limit(50),
    supabase
      .from("opportunities")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("activity_events")
      .select("*")
      .eq("organization_id", organization.id)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  if (tasksResult.error) {
    return dbFail("Failed to load tasks.", tasksResult.error.message);
  }
  if (opportunitiesResult.error) {
    return dbFail("Failed to load opportunities.", opportunitiesResult.error.message);
  }
  if (activityResult.error) {
    return dbFail("Failed to load activity.", activityResult.error.message);
  }

  return ok({
    organization,
    tasks: (tasksResult.data ?? []).map(parseBusinessTask),
    opportunities: (opportunitiesResult.data ?? []).map(parseOpportunity),
    activity: (activityResult.data ?? []).map(parseActivityEvent),
  });
}

export async function createBusinessTask(input: CreateTaskInput): Promise<DataAccessResult<BusinessTask>> {
  const title = input.title.trim();
  if (!title) {
    return fail({ code: "INVALID_INPUT", message: "Task title is required." });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const payload: TaskInsert = {
    organization_id: input.organizationId,
    title,
    priority: input.priority,
    due_at: input.dueAt,
    owner_user_id: user.id,
    source: "today",
    created_by: user.id,
  };

  const { data, error } = await supabase.from("business_tasks").insert(payload).select("*").single();
  if (error || !data) {
    return dbFail("Failed to create task.", error?.message);
  }

  const { error: activityError } = await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    event_type: "task.created",
    actor_user_id: user.id,
    entity_type: "task",
    entity_id: data.id,
    summary: `Task created: ${title}`,
    payload: { priority: input.priority } satisfies Json,
  } satisfies ActivityInsert);

  if (activityError) {
    return dbFail("Failed to record task activity.", activityError.message);
  }

  return ok(parseBusinessTask(data));
}

export async function completeBusinessTask(taskId: string): Promise<DataAccessResult<BusinessTask>> {
  if (!taskId) {
    return fail({ code: "INVALID_INPUT", message: "Task id is required." });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("business_tasks")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error || !data) {
    return dbFail("Failed to complete task.", error?.message);
  }

  const { error: activityError } = await supabase.from("activity_events").insert({
    organization_id: data.organization_id,
    event_type: "task.completed",
    actor_user_id: user.id,
    entity_type: "task",
    entity_id: data.id,
    summary: `Task completed: ${data.title}`,
    payload: {} satisfies Json,
  } satisfies ActivityInsert);

  if (activityError) {
    return dbFail("Failed to record task completion.", activityError.message);
  }

  return ok(parseBusinessTask(data));
}

export async function createOpportunity(input: CreateOpportunityInput): Promise<DataAccessResult<Opportunity>> {
  const title = input.title.trim();
  if (!title) {
    return fail({ code: "INVALID_INPUT", message: "Opportunity title is required." });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const payload: OpportunityInsert = {
    organization_id: input.organizationId,
    title,
    department: input.department,
    current_problem: input.currentProblem,
    proposed_solution: input.proposedSolution,
    estimated_hours_per_month: input.estimatedHoursPerMonth,
    estimated_revenue_cents: input.estimatedRevenueCents,
    priority: input.priority,
    created_by: user.id,
  };

  const { data, error } = await supabase.from("opportunities").insert(payload).select("*").single();
  if (error || !data) {
    return dbFail("Failed to create opportunity.", error?.message);
  }

  const { error: activityError } = await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    event_type: "opportunity.created",
    actor_user_id: user.id,
    entity_type: "opportunity",
    entity_id: data.id,
    summary: `Opportunity created: ${title}`,
    payload: {
      estimated_hours_per_month: input.estimatedHoursPerMonth,
      estimated_revenue_cents: input.estimatedRevenueCents,
    } satisfies Json,
  } satisfies ActivityInsert);

  if (activityError) {
    return dbFail("Failed to record opportunity activity.", activityError.message);
  }

  return ok(parseOpportunity(data));
}
