import { describe, expect, it } from "vitest";

import type { Database } from "../../types/database";

import {
  MIN_ENTRIES_FOR_PERIOD_COMPARISON,
  computeWeightMetrics,
  formatDeltaLabel,
  sortEntriesChronologically,
} from "./metrics";
import { convertWeight, kilogramsToPounds, poundsToKilograms, roundWeight } from "./conversions";

type WeightEntryRow = Database["public"]["Tables"]["weight_entries"]["Row"];

function makeEntry(
  id: string,
  entryDate: string,
  weight: number,
  unit: "lb" | "kg",
  createdAt = `${entryDate}T08:00:00.000Z`,
): WeightEntryRow {
  return {
    id,
    user_id: "user-1",
    weight,
    unit,
    entry_date: entryDate,
    note: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

describe("weight conversions", () => {
  it("converts pounds and kilograms both directions", () => {
    const kg = poundsToKilograms(220.46226218);
    expect(roundWeight(kg, 3)).toBe(100);

    const lb = kilogramsToPounds(100);
    expect(roundWeight(lb, 3)).toBe(220.462);
  });

  it("converts mixed units to target", () => {
    expect(roundWeight(convertWeight(100, "kg", "lb"), 2)).toBe(220.46);
    expect(roundWeight(convertWeight(220.46, "lb", "kg"), 2)).toBe(100);
  });
});

describe("weight metrics", () => {
  const referenceDate = new Date("2026-07-20T12:00:00.000Z");

  it("returns empty metrics for no entries", () => {
    const metrics = computeWeightMetrics([], "lb", referenceDate);
    expect(metrics.latest).toBeNull();
    expect(metrics.previousEntryDelta).toBeNull();
    expect(metrics.currentSevenDayAverage).toBeNull();
    expect(metrics.canCompareSevenDayPeriods).toBe(false);
  });

  it("sorts by entry_date then created_at", () => {
    const sorted = sortEntriesChronologically([
      makeEntry("b", "2026-07-19", 203, "lb", "2026-07-19T09:00:00.000Z"),
      makeEntry("a", "2026-07-19", 204, "lb", "2026-07-19T08:00:00.000Z"),
      makeEntry("c", "2026-07-18", 205, "lb"),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["c", "a", "b"]);
  });

  it("selects latest entry by chronological date", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("e1", "2026-07-10", 210, "lb"),
        makeEntry("e2", "2026-07-20", 206, "lb"),
        makeEntry("e3", "2026-07-15", 208, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.latest?.entryDate).toBe("2026-07-20");
    expect(metrics.latest?.weight).toBe(206);
  });

  it("computes previous-entry change and labels", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("e1", "2026-07-19", 205.5, "lb"),
        makeEntry("e2", "2026-07-20", 204.8, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.previousEntryDelta).toBe(-0.7);
    expect(formatDeltaLabel(metrics.previousEntryDelta, "lb")).toBe("Down 0.7 lb");
  });

  it("calculates seven-day average from existing entries only", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("e1", "2026-07-20", 204, "lb"),
        makeEntry("e2", "2026-07-18", 206, "lb"),
        makeEntry("e3", "2026-07-14", 208, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.currentSevenDayAverage?.entryCount).toBe(3);
    expect(metrics.currentSevenDayAverage?.value).toBe(206);
  });

  it("handles mixed units in averages by converting first", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("e1", "2026-07-20", 100, "kg"),
        makeEntry("e2", "2026-07-19", 220.462, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.currentSevenDayAverage?.value).toBe(220.46);
  });

  it("computes previous seven-day comparison when both periods have enough entries", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("a1", "2026-07-20", 204, "lb"),
        makeEntry("a2", "2026-07-18", 205, "lb"),
        makeEntry("b1", "2026-07-13", 207, "lb"),
        makeEntry("b2", "2026-07-10", 208, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.currentSevenDayAverage?.entryCount).toBeGreaterThanOrEqual(MIN_ENTRIES_FOR_PERIOD_COMPARISON);
    expect(metrics.previousSevenDayAverage?.entryCount).toBeGreaterThanOrEqual(MIN_ENTRIES_FOR_PERIOD_COMPARISON);
    expect(metrics.canCompareSevenDayPeriods).toBe(true);
    expect(metrics.sevenDayComparisonDelta).toBe(-3);
  });

  it("marks comparison unavailable when either period lacks enough entries", () => {
    const metrics = computeWeightMetrics(
      [
        makeEntry("a1", "2026-07-20", 204, "lb"),
        makeEntry("a2", "2026-07-18", 205, "lb"),
        makeEntry("b1", "2026-07-10", 208, "lb"),
      ],
      "lb",
      referenceDate,
    );

    expect(metrics.canCompareSevenDayPeriods).toBe(false);
    expect(metrics.sevenDayComparisonDelta).toBeNull();
  });

  it("handles a single entry", () => {
    const metrics = computeWeightMetrics([makeEntry("e1", "2026-07-20", 203.4, "lb")], "lb", referenceDate);
    expect(metrics.latest?.weight).toBe(203.4);
    expect(metrics.previous).toBeNull();
    expect(metrics.previousEntryDelta).toBeNull();
  });
});
