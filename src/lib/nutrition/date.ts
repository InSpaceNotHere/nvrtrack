import { DEFAULT_TIMEZONE, getDateStringInTimeZone, normalizeTimeZone } from "../timezone";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayDateString(timeZone = DEFAULT_TIMEZONE, reference = new Date()): string {
  return getDateStringInTimeZone(timeZone, reference);
}

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export function normalizeDateParam(
  input: string | string[] | undefined,
  reference = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): { selectedDate: string; wasFallback: boolean } {
  if (typeof input === "string" && isValidDateString(input)) {
    return { selectedDate: input, wasFallback: false };
  }

  return { selectedDate: getTodayDateString(normalizeTimeZone(timeZone), reference), wasFallback: true };
}

export function addDaysToDateString(date: string, dayDelta: number): string {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  const baseMs = Number.isNaN(parsed) ? Date.parse(`${getTodayDateString()}T00:00:00.000Z`) : parsed;
  return new Date(baseMs + dayDelta * 86400000).toISOString().slice(0, 10);
}
