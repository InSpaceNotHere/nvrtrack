const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayDateString(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
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
): { selectedDate: string; wasFallback: boolean } {
  if (typeof input === "string" && isValidDateString(input)) {
    return { selectedDate: input, wasFallback: false };
  }

  return { selectedDate: getTodayDateString(reference), wasFallback: true };
}

export function addDaysToDateString(date: string, dayDelta: number): string {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  const baseMs = Number.isNaN(parsed) ? Date.parse(`${getTodayDateString()}T00:00:00.000Z`) : parsed;
  return new Date(baseMs + dayDelta * 86400000).toISOString().slice(0, 10);
}
