"use server";

import { revalidatePath } from "next/cache";

import { completeBusinessTask, createBusinessTask, createOpportunity } from "@/lib/data/command-center";
import { asWorkPriority } from "@/lib/command-center/parse";

function revalidateToday() {
  revalidatePath("/today");
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseDueAt(value: string): string | null {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T12:00:00.000Z`;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const organizationId = readString(formData, "organizationId");
  const title = readString(formData, "title");
  const priority = asWorkPriority(readString(formData, "priority") || "medium");
  const dueAt = parseDueAt(readString(formData, "dueAt"));

  if (!organizationId || !title) {
    return;
  }

  const result = await createBusinessTask({ organizationId, title, priority, dueAt });
  if (result.error) {
    return;
  }

  revalidateToday();
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const taskId = readString(formData, "taskId");
  const result = await completeBusinessTask(taskId);
  if (result.error) {
    return;
  }

  revalidateToday();
}

export async function createOpportunityAction(formData: FormData): Promise<void> {
  const organizationId = readString(formData, "organizationId");
  const title = readString(formData, "title");
  const department = readString(formData, "department") || null;
  const currentProblem = readString(formData, "currentProblem") || null;
  const proposedSolution = readString(formData, "proposedSolution") || null;
  const estimatedHoursPerMonth = parseOptionalNumber(readString(formData, "estimatedHoursPerMonth"));
  const estimatedRevenue = parseOptionalNumber(readString(formData, "estimatedRevenue"));
  const priority = asWorkPriority(readString(formData, "priority") || "medium");

  if (!organizationId || !title) {
    return;
  }

  const result = await createOpportunity({
    organizationId,
    title,
    department,
    currentProblem,
    proposedSolution,
    estimatedHoursPerMonth,
    estimatedRevenueCents: estimatedRevenue === null ? null : Math.round(estimatedRevenue * 100),
    priority,
  });

  if (result.error) {
    return;
  }

  revalidateToday();
}
