import {
  IMPACT_LABEL,
  OPPORTUNITY_STATUSES,
  TASK_STATUSES,
  WORK_PRIORITIES,
  type EvidenceType,
  type ImplementationStatus,
  type LocalActivityEvent,
  type LocalBusiness,
  type LocalImplementation,
  type LocalOpportunity,
  type LocalTask,
  type MetricDefinition,
  type MetricObservation,
  type OpportunityStatus,
  type ResearchAttachment,
  type ResearchProvenance,
  type TaskStatus,
  type WorkPriority,
  type WorkspaceSnapshot,
} from "./domain";
import { applyStatus, pauseImplementation, resumeImplementation, validateObservation } from "./improvement";
import { parseResearchResult, type ResearchResult } from "./research-contract";
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

export interface ImplementationDraft {
  opportunityId: string;
  name: string;
  problem: string | null;
  proposedImprovement: string | null;
  chosenApproach: string | null;
  whySelected: string | null;
  nextAction: string | null;
  targetDate: string | null;
  responsible: string | null;
  risks: string | null;
  successLooksLike: string | null;
  stepTitles?: string[];
}

export interface MetricDraft {
  implementationId: string;
  name: string;
  unit: string;
  desiredDirection: "higher" | "lower";
}

export interface ObservationDraft {
  metricId: string;
  role: "baseline" | "follow_up";
  observedAt: string;
  periodLabel: string | null;
  value: number | null;
  evidenceType: EvidenceType;
  method: string | null;
  note: string | null;
  limitations: string | null;
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
  getResearchForOpportunity(opportunityId: string): ResearchAttachment | null;
  attachResearchResult(opportunityId: string, value: unknown, provenance?: ResearchProvenance): ResearchAttachment;
  removeResearchResult(opportunityId: string): void;
  markResearchReviewed(opportunityId: string): ResearchAttachment;
  adoptResearchRecommendation(opportunityId: string): LocalOpportunity;
  createImplementation(input: ImplementationDraft): LocalImplementation;
  updateImplementation(id: string, input: ImplementationDraft): LocalImplementation;
  transitionImplementation(id: string, status: ImplementationStatus): LocalImplementation;
  pauseImplementationRecord(id: string): LocalImplementation;
  resumeImplementationRecord(id: string): LocalImplementation;
  linkTask(implementationId: string, taskId: string): LocalImplementation;
  createMetric(input: MetricDraft): MetricDefinition;
  recordObservation(input: ObservationDraft): MetricObservation;
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

  getResearchForOpportunity(opportunityId: string): ResearchAttachment | null {
    return this.read().research.find((item) => item.opportunityId === opportunityId) ?? null;
  }

  attachResearchResult(
    opportunityId: string,
    value: unknown,
    provenance: ResearchProvenance = "imported",
  ): ResearchAttachment {
    const parsed = parseResearchResult(value, this.now());
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const snapshot = this.read();
    const opportunity = snapshot.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found.");
    }
    if (snapshot.research.some((item) => item.opportunityId === opportunityId)) {
      throw new Error("This opportunity already has research.");
    }
    const attachment: ResearchAttachment = {
      opportunityId,
      importedAt: this.now().toISOString(),
      reviewedAt: null,
      provenance,
      result: structuredClone(parsed.result),
    };
    snapshot.research = [...snapshot.research, attachment];
    this.pushActivity(snapshot, {
      eventType: "research.attached",
      entityType: "opportunity",
      entityId: opportunityId,
      title: "Research attached",
      description: opportunity.title,
    });
    this.write(snapshot);
    return attachment;
  }

  removeResearchResult(opportunityId: string): void {
    const snapshot = this.read();
    snapshot.research = snapshot.research.filter((item) => item.opportunityId !== opportunityId);
    this.write(snapshot);
  }

  markResearchReviewed(opportunityId: string): ResearchAttachment {
    const snapshot = this.read();
    const current = snapshot.research.find((item) => item.opportunityId === opportunityId);
    const opportunity = snapshot.opportunities.find((item) => item.id === opportunityId);
    if (!current || !opportunity) {
      throw new Error("Research was not found.");
    }
    const next: ResearchAttachment = { ...current, reviewedAt: current.reviewedAt ?? this.now().toISOString() };
    snapshot.research = snapshot.research.map((item) => (item.opportunityId === opportunityId ? next : item));
    if (!current.reviewedAt) {
      this.pushActivity(snapshot, {
        eventType: "research.reviewed",
        entityType: "opportunity",
        entityId: opportunityId,
        title: "Research reviewed",
        description: opportunity.title,
      });
    }
    this.write(snapshot);
    return next;
  }

  adoptResearchRecommendation(opportunityId: string): LocalOpportunity {
    const snapshot = this.read();
    const attachment = snapshot.research.find((item) => item.opportunityId === opportunityId);
    const opportunity = snapshot.opportunities.find((item) => item.id === opportunityId);
    if (!attachment || !opportunity) {
      throw new Error("Research was not found.");
    }
    const suggestion = attachment.result.recommendations.find((item) => item.state === "supported" || item.state === "preliminary");
    if (!suggestion) {
      throw new Error("There is no recommendation ready to use.");
    }
    const before = structuredClone(attachment.result) as ResearchResult;
    const next: LocalOpportunity = {
      ...opportunity,
      recommendation: suggestion.text,
      updatedAt: this.now().toISOString(),
    };
    snapshot.opportunities = snapshot.opportunities.map((item) => (item.id === opportunityId ? next : item));
    if (opportunity.recommendation !== suggestion.text) {
      this.pushActivity(snapshot, {
        eventType: "research.recommendation_adopted",
        entityType: "opportunity",
        entityId: opportunityId,
        title: "Recommendation adopted",
        description: opportunity.title,
      });
    }
    this.write(snapshot);
    const stored = this.read().research.find((item) => item.opportunityId === opportunityId);
    if (!stored || JSON.stringify(stored.result) !== JSON.stringify(before)) {
      throw new Error("Research attachment changed while adopting a recommendation.");
    }
    return next;
  }

  createImplementation(input: ImplementationDraft): LocalImplementation {
    const name = input.name.trim();
    if (!name) throw new Error("The improvement needs a name.");
    const snapshot = this.read();
    const opportunity = snapshot.opportunities.find((item) => item.id === input.opportunityId);
    if (!opportunity) throw new Error("Opportunity not found.");
    const timestamp = this.now().toISOString();
    const taskIds: string[] = [];
    for (const title of input.stepTitles ?? []) {
      const trimmed = title.trim();
      if (!trimmed) continue;
      const task: LocalTask = {
        id: this.createId("task"),
        organizationId: snapshot.business.id,
        title: trimmed,
        description: null,
        status: "open",
        priority: "medium",
        dueAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      };
      snapshot.tasks = [task, ...snapshot.tasks];
      taskIds.push(task.id);
    }
    const implementation: LocalImplementation = {
      id: this.createId("implementation"),
      opportunityId: opportunity.id,
      name,
      problem: blankToNull(input.problem),
      proposedImprovement: blankToNull(input.proposedImprovement),
      chosenApproach: blankToNull(input.chosenApproach),
      whySelected: blankToNull(input.whySelected),
      status: "planning",
      nextAction: blankToNull(input.nextAction),
      targetDate: input.targetDate,
      responsible: blankToNull(input.responsible),
      risks: blankToNull(input.risks),
      successLooksLike: blankToNull(input.successLooksLike),
      taskIds,
      pausedFromStatus: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      approvedAt: null,
    };
    snapshot.implementations = [implementation, ...snapshot.implementations];
    this.pushActivity(snapshot, {
      eventType: "implementation.planned",
      entityType: "implementation",
      entityId: implementation.id,
      title: "Implementation planned",
      description: implementation.name,
    });
    this.write(snapshot);
    return implementation;
  }

  updateImplementation(id: string, input: ImplementationDraft): LocalImplementation {
    const snapshot = this.read();
    const current = snapshot.implementations.find((item) => item.id === id);
    if (!current) throw new Error("Implementation not found.");
    const next: LocalImplementation = {
      ...current,
      name: input.name.trim() || current.name,
      problem: blankToNull(input.problem),
      proposedImprovement: blankToNull(input.proposedImprovement),
      chosenApproach: blankToNull(input.chosenApproach),
      whySelected: blankToNull(input.whySelected),
      nextAction: blankToNull(input.nextAction),
      targetDate: input.targetDate,
      responsible: blankToNull(input.responsible),
      risks: blankToNull(input.risks),
      successLooksLike: blankToNull(input.successLooksLike),
      updatedAt: this.now().toISOString(),
    };
    snapshot.implementations = snapshot.implementations.map((item) => (item.id === id ? next : item));
    this.write(snapshot);
    return next;
  }

  transitionImplementation(id: string, status: ImplementationStatus): LocalImplementation {
    const snapshot = this.read();
    const current = snapshot.implementations.find((item) => item.id === id);
    if (!current) throw new Error("Implementation not found.");
    const next = applyStatus(current, status, this.now().toISOString());
    snapshot.implementations = snapshot.implementations.map((item) => (item.id === id ? next : item));
    this.pushActivity(snapshot, {
      eventType: status === "approved" ? "implementation.approved" : "implementation.status_changed",
      entityType: "implementation",
      entityId: id,
      title: status === "approved" ? "Implementation approved" : "Implementation status changed",
      description: `${next.name}: ${current.status} → ${status}`,
    });
    this.write(snapshot);
    return next;
  }

  pauseImplementationRecord(id: string): LocalImplementation {
    return this.replaceImplementation(id, (current) => pauseImplementation(current, this.now().toISOString()), "Implementation paused");
  }

  resumeImplementationRecord(id: string): LocalImplementation {
    return this.replaceImplementation(id, (current) => resumeImplementation(current, this.now().toISOString()), "Implementation resumed");
  }

  linkTask(implementationId: string, taskId: string): LocalImplementation {
    const snapshot = this.read();
    const current = snapshot.implementations.find((item) => item.id === implementationId);
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!current || !task) throw new Error("Work could not be linked.");
    if (current.taskIds.includes(taskId)) return current;
    const next = { ...current, taskIds: [...current.taskIds, taskId], updatedAt: this.now().toISOString() };
    snapshot.implementations = snapshot.implementations.map((item) => (item.id === implementationId ? next : item));
    this.pushActivity(snapshot, {
      eventType: "implementation.work_linked",
      entityType: "implementation",
      entityId: implementationId,
      title: "Work linked",
      description: `${task.title} · ${current.name}`,
    });
    this.write(snapshot);
    return next;
  }

  createMetric(input: MetricDraft): MetricDefinition {
    const snapshot = this.read();
    if (!snapshot.implementations.some((item) => item.id === input.implementationId)) {
      throw new Error("Implementation not found.");
    }
    if (!input.name.trim() || !input.unit.trim()) throw new Error("A measurement needs a name and a unit.");
    const metric: MetricDefinition = {
      id: this.createId("metric"),
      implementationId: input.implementationId,
      name: input.name.trim(),
      unit: input.unit.trim(),
      desiredDirection: input.desiredDirection,
      createdAt: this.now().toISOString(),
    };
    snapshot.metrics = [metric, ...snapshot.metrics];
    this.write(snapshot);
    return metric;
  }

  recordObservation(input: ObservationDraft): MetricObservation {
    const problem = validateObservation(input);
    if (problem) throw new Error(problem);
    const snapshot = this.read();
    const metric = snapshot.metrics.find((item) => item.id === input.metricId);
    if (!metric) throw new Error("Measurement not found.");
    if (input.role === "baseline" && snapshot.observations.some((item) => item.metricId === input.metricId && item.role === "baseline")) {
      throw new Error("This measurement already has a starting point.");
    }
    const observation: MetricObservation = {
      id: this.createId("observation"),
      metricId: input.metricId,
      role: input.role,
      observedAt: input.observedAt,
      periodLabel: blankToNull(input.periodLabel),
      value: input.evidenceType === "missing" ? null : input.value,
      evidenceType: input.evidenceType,
      method: blankToNull(input.method),
      note: blankToNull(input.note),
      limitations: blankToNull(input.limitations),
      createdAt: this.now().toISOString(),
    };
    snapshot.observations = [observation, ...snapshot.observations];
    const implementation = snapshot.implementations.find((item) => item.id === metric.implementationId);
    this.pushActivity(snapshot, {
      eventType: input.role === "baseline" ? "measurement.baseline" : "measurement.follow_up",
      entityType: "implementation",
      entityId: metric.implementationId,
      title: input.role === "baseline" ? "Baseline recorded" : "Follow-up recorded",
      description: `${metric.name} · ${implementation?.name ?? "Improvement"}`,
    });
    this.write(snapshot);
    return observation;
  }

  private replaceImplementation(
    id: string,
    change: (current: LocalImplementation) => LocalImplementation,
    title: string,
  ): LocalImplementation {
    const snapshot = this.read();
    const current = snapshot.implementations.find((item) => item.id === id);
    if (!current) throw new Error("Implementation not found.");
    const next = change(current);
    snapshot.implementations = snapshot.implementations.map((item) => (item.id === id ? next : item));
    this.pushActivity(snapshot, {
      eventType: "implementation.status_changed",
      entityType: "implementation",
      entityId: id,
      title,
      description: next.name,
    });
    this.write(snapshot);
    return next;
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
  let research: ResearchAttachment[] = [];
  let implementations: LocalImplementation[] = [];
  let metrics: MetricDefinition[] = [];
  let observations: MetricObservation[] = [];
  try {
    research = parseResearchAttachments(value.research);
    implementations = parseImplementations(value.implementations);
    metrics = parseMetrics(value.metrics);
    observations = parseObservations(value.observations);
  } catch {
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
    research,
    implementations,
    metrics,
    observations,
  };
}

function parseImplementations(value: unknown): LocalImplementation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Implementations are malformed.");
  return value.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.opportunityId !== "string" || typeof item.name !== "string") {
      throw new Error("Implementations are malformed.");
    }
    const statuses: ImplementationStatus[] = ["planning", "approved", "building", "testing", "live", "measuring", "completed", "paused", "cancelled"];
    if (!statuses.includes(item.status as ImplementationStatus)) throw new Error("Implementations are malformed.");
    return {
      id: item.id,
      opportunityId: item.opportunityId,
      name: item.name,
      problem: nullableString(item.problem),
      proposedImprovement: nullableString(item.proposedImprovement),
      chosenApproach: nullableString(item.chosenApproach),
      whySelected: nullableString(item.whySelected),
      status: item.status as ImplementationStatus,
      nextAction: nullableString(item.nextAction),
      targetDate: nullableString(item.targetDate),
      responsible: nullableString(item.responsible),
      risks: nullableString(item.risks),
      successLooksLike: nullableString(item.successLooksLike),
      taskIds: Array.isArray(item.taskIds) ? item.taskIds.filter((id): id is string => typeof id === "string") : [],
      pausedFromStatus: statuses.includes(item.pausedFromStatus as ImplementationStatus) ? (item.pausedFromStatus as ImplementationStatus) : null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString(),
      approvedAt: nullableString(item.approvedAt),
    };
  });
}

function parseMetrics(value: unknown): MetricDefinition[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Measurements are malformed.");
  return value.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.unit !== "string") {
      throw new Error("Measurements are malformed.");
    }
    return {
      id: item.id,
      implementationId: typeof item.implementationId === "string" ? item.implementationId : "",
      name: item.name,
      unit: item.unit,
      desiredDirection: item.desiredDirection === "lower" ? "lower" : "higher",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
    };
  });
}

function parseObservations(value: unknown): MetricObservation[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Observations are malformed.");
  const types: EvidenceType[] = ["measured", "self_reported", "estimated", "missing"];
  return value.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || !types.includes(item.evidenceType as EvidenceType)) {
      throw new Error("Observations are malformed.");
    }
    return {
      id: item.id,
      metricId: typeof item.metricId === "string" ? item.metricId : "",
      role: item.role === "follow_up" ? "follow_up" : "baseline",
      observedAt: typeof item.observedAt === "string" ? item.observedAt : new Date(0).toISOString(),
      periodLabel: nullableString(item.periodLabel),
      value: typeof item.value === "number" && Number.isFinite(item.value) ? item.value : null,
      evidenceType: item.evidenceType as EvidenceType,
      method: nullableString(item.method),
      note: nullableString(item.note),
      limitations: nullableString(item.limitations),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
    };
  });
}

function parseResearchAttachments(value: unknown): ResearchAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("Research attachments are malformed.");
  }
  return value.map((item) => {
    if (!isRecord(item) || typeof item.opportunityId !== "string") {
      throw new Error("Research attachments are malformed.");
    }
    if (item.provenance !== "demo-fixture" && item.provenance !== "imported") {
      throw new Error("Research attachments are malformed.");
    }
    const parsed = parseResearchResult(item.result);
    if (!parsed.ok) throw new Error(parsed.error);
    return {
      opportunityId: item.opportunityId,
      importedAt: typeof item.importedAt === "string" ? item.importedAt : new Date(0).toISOString(),
      reviewedAt: typeof item.reviewedAt === "string" ? item.reviewedAt : null,
      provenance: item.provenance,
      result: parsed.result,
    };
  });
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
