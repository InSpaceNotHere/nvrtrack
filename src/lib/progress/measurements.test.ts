import { describe, expect, it } from "vitest";

import {
  buildMeasurementTrend,
  measurementValueForField,
  normalizeCustomMeasurementValues,
  normalizeMeasurementValues,
} from "./measurements";

describe("progress measurements helpers", () => {
  it("normalizes standard and custom measurements", () => {
    const standard = normalizeMeasurementValues({
      waist: "34.2",
      chest: "42",
      neck: "",
    });
    const custom = normalizeCustomMeasurementValues([
      { name: "Left Bicep Peak", value: "15.5" },
      { name: "  ", value: "11" },
    ]);

    expect(standard.waist).toBe(34.2);
    expect(standard.chest).toBe(42);
    expect(standard.neck).toBeUndefined();
    expect(custom.left_bicep_peak).toBe(15.5);
  });

  it("builds chronological trend data for selected fields", () => {
    const entries = [
      {
        entry_date: "2026-07-20",
        measurements: { waist: 35.2 },
        custom_measurements: { left_bicep_peak: 15.8 },
      },
      {
        entry_date: "2026-07-10",
        measurements: { waist: 36.1 },
        custom_measurements: { left_bicep_peak: 15.1 },
      },
    ];

    expect(measurementValueForField(entries[0], "waist")).toBe(35.2);
    expect(measurementValueForField(entries[0], "left_bicep_peak")).toBe(15.8);
    expect(buildMeasurementTrend(entries, "waist")).toEqual([
      { date: "2026-07-10", value: 36.1 },
      { date: "2026-07-20", value: 35.2 },
    ]);
  });
});
