import { describe, expect, it } from "vitest";

import type { LocalImplementation, MetricObservation } from "./domain";
import {
  applyStatus,
  canTransition,
  pauseImplementation,
  readChange,
  resumeImplementation,
  resultStory,
  validateObservation,
} from "./improvement";

const now = "2026-10-08T15:00:00.000Z";

function implementation(status: LocalImplementation["status"] = "planning"): LocalImplementation {
  return {
    id: "impl-1",
    opportunityId: "opp-1",
    name: "Proposal drafting improvements",
    problem: "Proposals take too long.",
    proposedImprovement: "Start from a draft.",
    chosenApproach: "Staff still approves every proposal.",
    whySelected: "It keeps a person in control.",
    status,
    nextAction: "Confirm the current workflow.",
    targetDate: null,
    responsible: "Owner",
    risks: null,
    successLooksLike: "A first draft exists before anyone sends it.",
    taskIds: [],
    pausedFromStatus: null,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
  };
}

function observation(overrides: Partial<MetricObservation>): MetricObservation {
  return {
    id: "obs-1",
    metricId: "metric-1",
    role: "baseline",
    observedAt: now,
    periodLabel: "October",
    value: 5,
    evidenceType: "measured",
    method: "Timed three proposals.",
    note: null,
    limitations: null,
    createdAt: now,
    ...overrides,
  };
}

describe("implementation transitions", () => {
  it("keeps a new plan as a draft until it is explicitly approved", () => {
    const draft = implementation("planning");
    expect(draft.approvedAt).toBeNull();
    expect(canTransition("planning", "building")).toBe(false);
    expect(canTransition("planning", "approved")).toBe(true);
    expect(applyStatus(draft, "approved", now).approvedAt).toBe(now);
  });

  it("moves through testing only after approval and can pause and resume", () => {
    const approved = applyStatus(implementation(), "approved", now);
    const testing = applyStatus(applyStatus(approved, "building", now), "testing", now);
    expect(testing.status).toBe("testing");
    const paused = pauseImplementation(testing, now);
    expect(paused.status).toBe("paused");
    expect(resumeImplementation(paused, now).status).toBe("testing");
  });

  it("rejects an illegal jump", () => {
    expect(() => applyStatus(implementation(), "live", now)).toThrow(/Cannot move/);
  });
});

describe("measurements", () => {
  it("rejects a measured value that is not a number and a missing value that has one", () => {
    expect(validateObservation({ evidenceType: "measured", value: null })).toMatch(/real number/);
    expect(validateObservation({ evidenceType: "missing", value: 4 })).toMatch(/cannot also/);
    expect(validateObservation({ evidenceType: "estimated", value: 2 })).toBeNull();
  });

  it("does not turn an estimate into an observed change", () => {
    const reading = readChange({ unit: "hours" }, [
      observation({ evidenceType: "estimated", value: 8 }),
      observation({ id: "obs-2", role: "follow_up", evidenceType: "measured", value: 5 }),
    ]);
    expect(reading.kind).toBe("not_comparable");
  });

  it("shows arithmetic only for two comparable measured observations", () => {
    const reading = readChange({ unit: "hours" }, [
      observation({ value: 8 }),
      observation({ id: "obs-2", role: "follow_up", value: 5 }),
    ]);
    expect(reading).toEqual({ kind: "observed", delta: -3, unit: "hours" });
    expect(resultStory({ status: "measuring", reading })).toBe("Here's what changed.");
  });

  it("says when a baseline is missing and refuses different periods", () => {
    expect(readChange({ unit: "hours" }, []).kind).toBe("missing_baseline");
    expect(resultStory({ status: "testing", reading: { kind: "missing_baseline" } })).toBe("We need a starting measurement.");
    const mismatched = readChange({ unit: "hours" }, [
      observation({ periodLabel: "October" }),
      observation({ id: "obs-2", role: "follow_up", periodLabel: "Year" }),
    ]);
    expect(mismatched.kind).toBe("not_comparable");
  });
});
