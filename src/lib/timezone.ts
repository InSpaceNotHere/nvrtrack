export const DEFAULT_TIMEZONE = "UTC";

function getDatePart(parts: Intl.DateTimeFormatPart[], type: "year" | "month" | "day"): string {
  const part = parts.find((entry) => entry.type === type)?.value;
  return part ?? (type === "year" ? "1970" : "01");
}

export function isValidIanaTimeZone(value: string): boolean {
  if (!value.trim()) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date("2026-01-01T00:00:00.000Z"));
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_TIMEZONE;
  }
  return isValidIanaTimeZone(value) ? value : DEFAULT_TIMEZONE;
}

export function getDateStringInTimeZone(timeZone: string, reference = new Date()): string {
  const safeTimeZone = normalizeTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(reference);
  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekStartMondayInTimeZone(timeZone: string, reference = new Date()): string {
  const today = getDateStringInTimeZone(timeZone, reference);
  const parsed = new Date(`${today}T00:00:00.000Z`);
  const weekday = parsed.getUTCDay();
  const mondayDistance = (weekday + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - mondayDistance);
  return parsed.toISOString().slice(0, 10);
}
