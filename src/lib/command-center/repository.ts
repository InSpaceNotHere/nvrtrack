import {
  IMPACT_LABEL,
  OPPORTUNITY_STATUSES,
  TASK_STATUSES,
  WORK_PRIORITIES,
  type LocalActivityEvent,
  type LocalBusiness,
  type LocalOpportunity,
  type LocalTask,
  type OpportunityStatus,
  type TaskStatus,
  type WorkPriority,
  type WorkspaceSnapshot,
} from "./domain";
import { createJuniperSeed } from "./seed";

export const WORKSPACE_STORAGE_KEY = "nvrtrack.command-center.workspace.v1";
export const WELCOME_STORAGE_KEY = "nvrtrack.command-center.welcome.dismissed";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface TaskDraft {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: WorkPriority;
  dueAt: string | null;
}

export interface OpportunityDraft {
  title: string;
  problem: string | null;
  department: string | null;
  description: string | null;
  recommendation: string | null;
  priority: WorkPriority;
  status: OpportunityStatus;
  estimatedHoursSavedMonthly: number | null;
  estimatedValueMonthly: number | null;
}

export interface BusinessRepository {
  load(): WorkspaceSnapshot;
  getBusiness(): LocalBusiness;
  getTasks(): LocalTask[];
  createTask(input: TaskDraft): LocalTask;
  updateTask(id: string, input: TaskDraft): LocalTask;
  deleteTask(id: string): void;
  getOpportunities(): LocalOpportunity[];
  createOpportunity(input: OpportunityDraft): LocalOpportunity;
  updateOpportunity(id: string, input: OpportunityDraft): LocalOpportunity;
  getActivity(): LocalActivityEvent[];
  appendActivity(event: Omit<LocalActivityEvent, "id" | "createdAt" | "organizationId">): LocalActivityEvent;
  reset(): WorkspaceSnapshot;
  exportWorkspace(): WorkspaceSnapshot;
  importWorkspace(value: unknown): WorkspaceSnapshot;
}

function defaultId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export class LocalBusinessRepository implements BusinessRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: (prefix: string) => string = defaultId,
  ) {}

  load(): WorkspaceSnapshot {
    return this.read();
  }

  getBusiness(): LocalBusiness {
    return this.read().business;
  }

  getTasks(): LocalTask[] {
    return this.read().tasks;
  }

  createTask(input: TaskDraft): LocalTask {
    const snapshot = this.read();
    const timestamp = this.now().toISOString();
    const task: LocalTask = {
      id: this.createId("task"),
      organizationId: snapshot.business.id,
      title: input.title.trim(),
      description: blankToNull(input.description),
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: input.status === "completed" ? timestamp : null,
    };
    snapshot.tasks = [task, ...snapshot.tasks];
    this.pushActivity(snapshot, {
      eventType: "task.created",
      entityType: "task",
      entityId: task.id,
      title: "Task created",
      description: task.title,
    });
    this.write(snapshot);
    return task;
  }

  updateTask(id: string, input: TaskDraft): LocalTask {
    const snapshot = this.read();
    const current = snapshot.tasks.find((task) => task.id === id);
    if (!current) {
      throw new Error("Task not found.");
    }
    const timestamp = this.now().toISOString();
    const next: LocalTask = {
      ...current,
      title: input.title.trim(),
      description: blankToNull(input.description),
      status: input.status,
      priority: input.priority,
      dueAt: input.dueAt,
      updatedAt: timestamp,
      completedAt: input.status === "completed" ? (current.completedAt ?? timestamp) : null,
    };
    if (previousTitleChanged(current, next)) {
      this.pushActivity(snapshot, {
        eventType: "task.updated",
        entityType: "task",
        entityId: next.id,
        title: "Task updated",
        description: next.title,
      });
    }
    snapshot.tasks = snapshot.tasks.map((task) => (task.id === id ? next : task));
    this.recordTaskChanges(snapshot, current, next);
    this.write(snapshot);
    return next;
  }

  deleteTask(id: string): void {
    const snapshot = this.read();
    const current = snapshot.tasks.find((task) => task.id === id);
    if (!current) {
      return;
    }
    snapshot.tasks = snapshot.tasks.filter((task) => task.id !== id);
    this.pushActivity(snapshot, {
      eventType: "task.deleted",
      entityType: "task",
      entityId: id,
      title: "Task deleted",
      description: current.title,
    });
    this.write(snapshot);
  }

  getOpportunities(): LocalOpportunity[] {
    return this.read().opportunities;
  }

  createOpportunity(input: OpportunityDraft): LocalOpportunity {
    const snapshot = this.read();
    const timestamp = this.now().toISOString();
    const opportunity: LocalOpportunity = {
      id: this.createId("opportunity"),
      organizationId: snapshot.business.id,
      title: input.title.trim(),
      problem: blankToNull(input.problem),
      department: blankToNull(input.department),
      description: blankToNull(input.description),
      recommendation: blankToNull(input.recommendation),
      priority: input.priority,
      status: input.status,
      estimatedHoursSavedMonthly: input.estimatedHoursSavedMonthly,
      estimatedValueMonthly: input.estimatedValueMonthly,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    snapshot.opportunities = [opportunity, ...snapshot.opportunities];
    this.pushActivity(snapshot, {
      eventType: "opportunity.created",
      entityType: "opportunity",
      entityId: opportunity.id,
      title: "Opportunity identified",
      description: opportunity.title,
    });
    this.write(snapshot);
    return opportunity;
  }

  updateOpportunity(id: string, input: OpportunityDraft): LocalOpportunity {
    const snapshot = this.read();
    const current = snapshot.opportunities.find((item) => item.id === id);
    if (!current) {
      throw new Error("Opportunity not found.");
    }
    const timestamp = this.now().toISOString();
    const next: LocalOpportunity = {
      ...current,
      title: input.title.trim(),
      problem: blankToNull(input.problem),
      department: blankToNull(input.department),
      description: blankToNull(input.description),
      recommendation: blankToNull(input.recommendation),
      priority: input.priority,
      status: input.status,
      estimatedHoursSavedMonthly: input.estimatedHoursSavedMonthly,
      estimatedValueMonthly: input.estimatedValueMonthly,
      updatedAt: timestamp,
    };
    snapshot.opportunities = snapshot.opportunities.map((item) => (item.id === id ? next : item));
    this.recordOpportunityChanges(snapshot, current, next);
    this.write(snapshot);
    return next;
  }

  getActivity(): LocalActivityEvent[] {
    return [...this.read().activity].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  appendActivity(event: Omit<LocalActivityEvent, "id" | "createdAt" | "organizationId">): LocalActivityEvent {
    const snapshot = this.read();
    const created = this.pushActivity(snapshot, event);
    this.write(snapshot);
    return created;
  }

  reset(): WorkspaceSnapshot {
    const seed = createJuniperSeed(this.now());
    this.write(seed);
    return seed;
  }

  exportWorkspace(): WorkspaceSnapshot {
    return this.read();
  }

  importWorkspace(value: unknown): WorkspaceSnapshot {
    const parsed = parseWorkspace(value);
    if (!parsed) {
      throw new Error("Workspace file is not a valid NVRTRACK export.");
    }
    this.write(parsed);
    return parsed;
  }

  private read(): WorkspaceSnapshot {
    const raw = this.storage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      const seed = createJuniperSeed(this.now());
      this.write(seed);
      return seed;
    }
    try {
      const parsed = parseWorkspace(JSON.parse(raw));
      if (!parsed) {
        const seed = createJuniperSeed(this.now());
        this.write(seed);
        return seed;
      }
      return parsed;
    } catch {
      const seed = createJuniperSeed(this.now());
      this.write(seed);
      return seed;
    }
  }

  private write(snapshot: WorkspaceSnapshot): void {
    this.storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  }

  private pushActivity(
    snapshot: WorkspaceSnapshot,
    event: Omit<LocalActivityEvent, "id" | "createdAt" | "organizationId">,
  ): LocalActivityEvent {
    const created: LocalActivityEvent = {
      id: this.createId("activity"),
      organizationId: snapshot.business.id,
      createdAt: this.now().toISOString(),
      ...event,
    };
    snapshot.activity = [created, ...snapshot.activity];
    return created;
  }

  private recordTaskChanges(snapshot: WorkspaceSnapshot, previous: LocalTask, next: LocalTask): void {
    if (previous.status !== "completed" && next.status === "completed") {
      this.pushActivity(snapshot, {
        eventType: "task.completed",
        entityType: "task",
        entityId: next.id,
        title: "Task completed",
        description: next.title,
      });
    } else if (previous.status === "completed" && next.status !== "completed") {
      this.pushActivity(snapshot, {
        eventType: "task.reopened",
        entityType: "task",
        entityId: next.id,
        title: "Task reopened",
        description: next.title,
      });
    } else if (previous.status !== next.status) {
      this.pushActivity(snapshot, {
        eventType: "task.status_changed",
        entityType: "task",
        entityId: next.id,
        title: "Task status changed",
        description: `${next.title}: ${previous.status} → ${next.status}`,
      });
    }

    if (previous.priority !== next.priority) {
      this.pushActivity(snapshot, {
        eventType: "task.priority_changed",
        entityType: "task",
        entityId: next.id,
        title: "Task priority changed",
        description: `${next.title}: ${previous.priority} → ${next.priority}`,
      });
    }

    if (previous.dueAt !== next.dueAt) {
      this.pushActivity(snapshot, {
        eventType: "task.due_changed",
        entityType: "task",
        entityId: next.id,
        title: "Task due date changed",
        description: next.title,
      });
    }
  }

  private recordOpportunityChanges(
    snapshot: WorkspaceSnapshot,
    previous: LocalOpportunity,
    next: LocalOpportunity,
  ): void {
    if (previous.status !== next.status) {
      this.pushActivity(snapshot, {
        eventType: `opportunity.${next.status}`,
        entityType: "opportunity",
        entityId: next.id,
        title: next.status === "approved" ? "Opportunity approved" : "Opportunity status changed",
        description: `${next.title}: ${previous.status} → ${next.status}`,
      });
    }
    if (previous.priority !== next.priority) {
      this.pushActivity(snapshot, {
        eventType: "opportunity.priority_changed",
        entityType: "opportunity",
        entityId: next.id,
        title: "Opportunity priority changed",
        description: `${next.title}: ${previous.priority} → ${next.priority}`,
      });
    }
    if (
      previous.estimatedHoursSavedMonthly !== next.estimatedHoursSavedMonthly ||
      previous.estimatedValueMonthly !== next.estimatedValueMonthly
    ) {
      this.pushActivity(snapshot, {
        eventType: "opportunity.estimate_changed",
        entityType: "opportunity",
        entityId: next.id,
        title: "Estimated impact updated",
        description: `${next.title} remains ${IMPACT_LABEL}.`,
      });
    }
  }
}

export function parseWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.business)) {
    return null;
  }
  const business = value.business;
  if (typeof business.id !== "string" || typeof business.name !== "string" || typeof business.createdAt !== "string") {
    return null;
  }
  if (!Array.isArray(value.tasks) || !Array.isArray(value.opportunities) || !Array.isArray(value.activity)) {
    return null;
  }
  const tasks = value.tasks.map(parseTask);
  const opportunities = value.opportunities.map(parseOpportunity);
  const activity = value.activity.map(parseActivity);
  if (tasks.some((item) => item === null) || opportunities.some((item) => item === null) || activity.some((item) => item === null)) {
    return null;
  }
  return {
    version: 1,
    business: {
      id: business.id,
      name: business.name,
      industry: typeof business.industry === "string" ? business.industry : null,
      createdAt: business.createdAt,
    },
    tasks: tasks as LocalTask[],
    opportunities: opportunities as LocalOpportunity[],
    activity: activity as LocalActivityEvent[],
  };
}

function parseTask(value: unknown): LocalTask | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.organizationId !== "string" || typeof value.title !== "string") return null;
  if (!TASK_STATUSES.includes(value.status as TaskStatus) || !WORK_PRIORITIES.includes(value.priority as WorkPriority)) return null;
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null;
  return {
    id: value.id,
    organizationId: value.organizationId,
    title: value.title,
    description: nullableString(value.description),
    status: value.status as TaskStatus,
    priority: value.priority as WorkPriority,
    dueAt: nullableString(value.dueAt),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    completedAt: nullableString(value.completedAt),
  };
}

function parseOpportunity(value: unknown): LocalOpportunity | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.organizationId !== "string" || typeof value.title !== "string") return null;
  if (!OPPORTUNITY_STATUSES.includes(value.status as OpportunityStatus)) return null;
  if (!WORK_PRIORITIES.includes(value.priority as WorkPriority)) return null;
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null;
  return {
    id: value.id,
    organizationId: value.organizationId,
    title: value.title,
    problem: nullableString(value.problem),
    department: nullableString(value.department),
    description: nullableString(value.description),
    recommendation: nullableString(value.recommendation),
    priority: value.priority as WorkPriority,
    status: value.status as OpportunityStatus,
    estimatedHoursSavedMonthly: nullableNumber(value.estimatedHoursSavedMonthly),
    estimatedValueMonthly: nullableNumber(value.estimatedValueMonthly),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseActivity(value: unknown): LocalActivityEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.organizationId !== "string" || typeof value.title !== "string") return null;
  if (typeof value.eventType !== "string" || typeof value.createdAt !== "string") return null;
  return {
    id: value.id,
    organizationId: value.organizationId,
    eventType: value.eventType,
    entityType: nullableString(value.entityType),
    entityId: nullableString(value.entityId),
    title: value.title,
    description: nullableString(value.description),
    createdAt: value.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function previousTitleChanged(previous: { title: string; description: string | null }, next: { title: string; description: string | null }): boolean {
  return previous.title !== next.title || previous.description !== next.description;
}

function blankToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
