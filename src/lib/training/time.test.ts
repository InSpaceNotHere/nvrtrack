import { describe, expect, it } from "vitest";

import { formatElapsedWorkoutDuration, getElapsedWorkoutMinutes } from "./time";

describe("training time helpers", () => {
  it("returns null/placeholder when startedAt is missing or invalid", () => {
    expect(getElapsedWorkoutMinutes(null, Date.parse("2026-09-17T12:00:00.000Z"))).toBeNull();
    expect(getElapsedWorkoutMinutes("invalid", Date.parse("2026-09-17T12:00:00.000Z"))).toBeNull();
    expect(formatElapsedWorkoutDuration(null, Date.parse("2026-09-17T12:00:00.000Z"))).toBe("--");
  });

  it("is deterministic for a provided render timestamp", () => {
    const startedAt = "2026-09-17T11:30:00.000Z";
    const renderTime = Date.parse("2026-09-17T12:00:00.000Z");
    expect(getElapsedWorkoutMinutes(startedAt, renderTime)).toBe(30);
    expect(formatElapsedWorkoutDuration(startedAt, renderTime)).toBe("30 min elapsed");
  });

  it("keeps minimum elapsed duration at one minute", () => {
    const startedAt = "2026-09-17T11:59:45.000Z";
    const renderTime = Date.parse("2026-09-17T12:00:00.000Z");
    expect(getElapsedWorkoutMinutes(startedAt, renderTime)).toBe(1);
  });
});
