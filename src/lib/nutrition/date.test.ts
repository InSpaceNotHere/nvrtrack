import { describe, expect, it } from "vitest";

import { addDaysToDateString, getTodayDateString, isValidDateString, normalizeDateParam } from "./date";

describe("nutrition date utilities", () => {
  it("validates date strings", () => {
    expect(isValidDateString("2026-07-20")).toBe(true);
    expect(isValidDateString("2026-7-2")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
  });

  it("normalizes valid and invalid date params", () => {
    const reference = new Date("2026-07-20T08:00:00.000Z");
    expect(normalizeDateParam("2026-07-19", reference)).toEqual({
      selectedDate: "2026-07-19",
      wasFallback: false,
    });
    expect(normalizeDateParam("invalid", reference)).toEqual({
      selectedDate: "2026-07-20",
      wasFallback: true,
    });
    expect(normalizeDateParam(["2026-07-19"], reference)).toEqual({
      selectedDate: "2026-07-20",
      wasFallback: true,
    });
  });

  it("adds and subtracts day offsets safely", () => {
    expect(addDaysToDateString("2026-07-20", 1)).toBe("2026-07-21");
    expect(addDaysToDateString("2026-07-20", -1)).toBe("2026-07-19");
  });

  it("formats today date string", () => {
    expect(getTodayDateString(new Date("2026-07-20T23:59:59.000Z"))).toBe("2026-07-20");
  });
});
