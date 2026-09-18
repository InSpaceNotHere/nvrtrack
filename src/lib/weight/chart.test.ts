import { describe, expect, it } from "vitest";

import type { WeightEntryMetricPoint } from "./metrics";
import { buildWeightChartSeries } from "./chart";

function makeEntry(dayOffset: number, weight: number): WeightEntryMetricPoint {
  const date = new Date("2026-07-20T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return {
    id: `entry-${dayOffset}`,
    entryDate: date.toISOString().slice(0, 10),
    note: null,
    weight,
    unit: "lb",
    sourceWeight: weight,
    sourceUnit: "lb",
  };
}

describe("weight chart series", () => {
  it("filters by range and produces trend line", () => {
    const entries = [
      makeEntry(-40, 210),
      makeEntry(-20, 205),
      makeEntry(-10, 203),
      makeEntry(-2, 202),
      makeEntry(0, 201),
    ];
    const series = buildWeightChartSeries(entries, "30d", new Date("2026-07-20T00:00:00.000Z"));
    expect(series.points.length).toBe(4);
    expect(series.points[0].date).toBe("2026-06-30");
    expect(series.trendLine.length).toBe(4);
  });

  it("aggregates large all-time ranges automatically", () => {
    const entries: WeightEntryMetricPoint[] = [];
    for (let day = -240; day <= 0; day += 1) {
      entries.push(makeEntry(day, 220 - Math.abs(day) * 0.02));
    }
    const series = buildWeightChartSeries(entries, "all", new Date("2026-07-20T00:00:00.000Z"));
    expect(series.points.length).toBeLessThan(entries.length);
    expect(series.trendLine.length).toBe(series.points.length);
  });
});
