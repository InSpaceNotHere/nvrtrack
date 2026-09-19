import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEZONE,
  formatCalendarDate,
  formatTimestampInTimeZone,
  getCurrentWeekStartMondayInTimeZone,
  getDateStringInTimeZone,
  isValidIanaTimeZone,
  normalizeTimeZone,
} from "./timezone";

describe("timezone helpers", () => {
  it("validates and normalizes timezones", () => {
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimeZone("Invalid/Timezone")).toBe(false);
    expect(normalizeTimeZone("Invalid/Timezone")).toBe(DEFAULT_TIMEZONE);
  });

  it("handles UTC and Los Angeles day rollovers", () => {
    const beforeUtcMidnight = new Date("2026-07-20T23:59:59.000Z");
    const afterUtcMidnight = new Date("2026-07-21T00:00:01.000Z");
    expect(getDateStringInTimeZone("UTC", beforeUtcMidnight)).toBe("2026-07-20");
    expect(getDateStringInTimeZone("UTC", afterUtcMidnight)).toBe("2026-07-21");

    const beforeLaMidnight = new Date("2026-07-21T06:59:59.000Z");
    const afterLaMidnight = new Date("2026-07-21T07:00:01.000Z");
    expect(getDateStringInTimeZone("America/Los_Angeles", beforeLaMidnight)).toBe("2026-07-20");
    expect(getDateStringInTimeZone("America/Los_Angeles", afterLaMidnight)).toBe("2026-07-21");
  });

  it("remains deterministic around daylight-saving transitions", () => {
    const beforeDstSpringForward = new Date("2026-03-08T09:59:59.000Z");
    const afterDstSpringForward = new Date("2026-03-08T10:00:01.000Z");
    expect(getDateStringInTimeZone("America/Los_Angeles", beforeDstSpringForward)).toBe("2026-03-08");
    expect(getDateStringInTimeZone("America/Los_Angeles", afterDstSpringForward)).toBe("2026-03-08");

    const weekStart = getCurrentWeekStartMondayInTimeZone("America/Los_Angeles", new Date("2026-11-01T09:30:00.000Z"));
    expect(weekStart).toBe("2026-10-26");
  });

  it("formats calendar dates without timezone day shifting", () => {
    expect(formatCalendarDate("2026-09-17")).toBe("Sep 17, 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("formats absolute timestamps using the configured timezone", () => {
    const timestamp = "2026-09-17T00:30:00.000Z";
    expect(
      formatTimestampInTimeZone(timestamp, "UTC", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    ).toBe("Sep 17, 12:30 AM");

    expect(
      formatTimestampInTimeZone(timestamp, "America/Los_Angeles", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    ).toBe("Sep 16, 5:30 PM");
  });
});
