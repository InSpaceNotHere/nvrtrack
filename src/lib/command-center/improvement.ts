import type {
  EvidenceType,
  ImplementationStatus,
  LocalImplementation,
  MetricDefinition,
  MetricObservation,
} from "./domain";

const NEXT: Record<ImplementationStatus, ImplementationStatus[]> = {
  planning: ["approved", "cancelled"],
  approved: ["building", "paused", "cancelled"],
  building: ["testing", "paused", "cancelled"],
  testing: ["live", "measuring", "paused", "cancelled"],
  live: ["measuring", "completed", "paused", "cancelled"],
  measuring: ["completed", "paused", "cancelled"],
  paused: [],
  completed: [],
  cancelled: [],
};

const PAUSABLE: ImplementationStatus[] = ["planning", "approved", "building", "testing", "live", "measuring"];

export function allowedTransitions(status: ImplementationStatus): ImplementationStatus[] {
  return NEXT[status];
}

export function canTransition(from: ImplementationStatus, to: ImplementationStatus): boolean {
  return NEXT[from].includes(to);
}

export function applyStatus(current: LocalImplementation, to: ImplementationStatus, at: string): LocalImplementation {
  if (!canTransition(current.status, to)) {
    throw new Error(`Cannot move from ${current.status} to ${to}.`);
  }
  return {
    ...current,
    status: to,
    pausedFromStatus: null,
    approvedAt: to === "approved" ? current.approvedAt ?? at : current.approvedAt,
    updatedAt: at,
  };
}

export function pauseImplementation(current: LocalImplementation, at: string): LocalImplementation {
  if (!PAUSABLE.includes(current.status)) {
    throw new Error("This implementation cannot be paused.");
  }
  return {
    ...current,
    pausedFromStatus: current.status,
    status: "paused",
    updatedAt: at,
  };
}

export function resumeImplementation(current: LocalImplementation, at: string): LocalImplementation {
  if (current.status !== "paused" || !current.pausedFromStatus) {
    throw new Error("This implementation is not paused.");
  }
  return {
    ...current,
    status: current.pausedFromStatus,
    pausedFromStatus: null,
    updatedAt: at,
  };
}

export function isMeasured(observation: Pick<MetricObservation, "evidenceType" | "value">): boolean {
  return observation.evidenceType === "measured" && typeof observation.value === "number" && Number.isFinite(observation.value);
}

export function validateObservation(input: {
  evidenceType: EvidenceType;
  value: number | null;
}): string | null {
  if (input.evidenceType === "missing") {
    return input.value === null ? null : "A missing measurement cannot also have a number.";
  }
  if (input.evidenceType === "measured" && (input.value === null || !Number.isFinite(input.value))) {
    return "A measured result needs a real number.";
  }
  if (input.value !== null && !Number.isFinite(input.value)) {
    return "The measurement is not a real number.";
  }
  return null;
}

export type ChangeReading =
  | { kind: "missing_baseline" }
  | { kind: "not_comparable"; reason: string }
  | { kind: "observed"; delta: number; unit: string };

export function readChange(
  metric: Pick<MetricDefinition, "unit">,
  observations: MetricObservation[],
): ChangeReading {
  const baseline = observations.find((item) => item.role === "baseline");
  const followUp = [...observations].reverse().find((item) => item.role === "follow_up");
  if (!baseline || baseline.evidenceType === "missing") {
    return { kind: "missing_baseline" };
  }
  if (!followUp) {
    return { kind: "not_comparable", reason: "No follow-up measurement yet." };
  }
  if (!isMeasured(baseline) || !isMeasured(followUp)) {
    return {
      kind: "not_comparable",
      reason: "Observed change is only shown when both numbers are measured.",
    };
  }
  if (baseline.periodLabel && followUp.periodLabel && baseline.periodLabel !== followUp.periodLabel) {
    return { kind: "not_comparable", reason: "These periods are not the same, so they are not compared." };
  }
  return { kind: "observed", delta: (followUp.value as number) - (baseline.value as number), unit: metric.unit };
}

export function resultStory(input: {
  status: ImplementationStatus | null;
  reading: ChangeReading;
}): string {
  if (input.reading.kind === "observed") return "Here's what changed.";
  if (input.reading.kind === "missing_baseline") return "We need a starting measurement.";
  if (input.reading.kind === "not_comparable" && input.reading.reason === "No follow-up measurement yet.") {
    if (input.status === "testing" || input.status === "measuring" || input.status === "live") {
      return "Collecting results.";
    }
    return "We know where we're starting.";
  }
  return input.reading.kind === "not_comparable" ? input.reading.reason : "We know where we're starting.";
}
