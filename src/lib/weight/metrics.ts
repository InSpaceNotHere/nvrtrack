import type { Database } from "../../types/database";

import { convertWeight, isWeightUnit, roundWeight, type WeightUnit } from "./conversions";

type WeightEntryRow = Database["public"]["Tables"]["weight_entries"]["Row"];

export const MIN_ENTRIES_FOR_PERIOD_COMPARISON = 2;
export const MAX_NOTE_LENGTH = 280;
export const MIN_WEIGHT = 45;
export const MAX_WEIGHT = 1400;

export interface WeightEntryMetricPoint {
  id: string;
  entryDate: string;
  note: string | null;
  weight: number;
  unit: WeightUnit;
  sourceWeight: number;
  sourceUnit: WeightUnit;
}

export interface SevenDayAverage {
  value: number;
  entryCount: number;
  startDate: string;
  endDate: string;
}

export interface WeightMetrics {
  displayUnit: WeightUnit;
  historyNewestFirst: WeightEntryMetricPoint[];
  trendChronological: WeightEntryMetricPoint[];
  latest: WeightEntryMetricPoint | null;
  previous: WeightEntryMetricPoint | null;
  previousEntryDelta: number | null;
  currentSevenDayAverage: SevenDayAverage | null;
  previousSevenDayAverage: SevenDayAverage | null;
  sevenDayComparisonDelta: number | null;
  canCompareSevenDayPeriods: boolean;
}

function toDayNumber(date: string): number {
  // Parse as calendar day using UTC midnight semantics.
  return Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86400000);
}

function dayToDateString(dayNumber: number): string {
  return new Date(dayNumber * 86400000).toISOString().slice(0, 10);
}

function safeUnit(unit: string): WeightUnit {
  return isWeightUnit(unit) ? unit : "lb";
}

export function sortEntriesChronologically(entries: WeightEntryRow[]): WeightEntryRow[] {
  return [...entries].sort((a, b) => {
    const dayDelta = toDayNumber(a.entry_date) - toDayNumber(b.entry_date);
    if (dayDelta !== 0) {
      return dayDelta;
    }

    const createdDelta = Date.parse(a.created_at) - Date.parse(b.created_at);
    if (!Number.isNaN(createdDelta) && createdDelta !== 0) {
      return createdDelta;
    }

    return a.id.localeCompare(b.id);
  });
}

export function normalizeEntries(entries: WeightEntryRow[], displayUnit: WeightUnit): WeightEntryMetricPoint[] {
  return sortEntriesChronologically(entries).map((entry) => {
    const unit = safeUnit(entry.unit);
    const convertedWeight = convertWeight(entry.weight, unit, displayUnit);

    return {
      id: entry.id,
      entryDate: entry.entry_date,
      note: entry.note,
      weight: roundWeight(convertedWeight, 2),
      unit: displayUnit,
      sourceWeight: entry.weight,
      sourceUnit: unit,
    };
  });
}

function getAverageForWindow(
  entries: WeightEntryMetricPoint[],
  startDay: number,
  endDay: number,
): SevenDayAverage | null {
  const inWindow = entries.filter((entry) => {
    const day = toDayNumber(entry.entryDate);
    return day >= startDay && day <= endDay;
  });

  if (inWindow.length === 0) {
    return null;
  }

  const total = inWindow.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    value: roundWeight(total / inWindow.length, 2),
    entryCount: inWindow.length,
    startDate: dayToDateString(startDay),
    endDate: dayToDateString(endDay),
  };
}

export function computeWeightMetrics(
  entries: WeightEntryRow[],
  displayUnit: WeightUnit,
  referenceDate = new Date(),
): WeightMetrics {
  const normalized = normalizeEntries(entries, displayUnit);
  const trendChronological = normalized;
  const historyNewestFirst = [...normalized].reverse();

  const latest = historyNewestFirst[0] ?? null;
  const previous = historyNewestFirst[1] ?? null;

  const previousEntryDelta = latest && previous ? roundWeight(latest.weight - previous.weight, 2) : null;

  const referenceDay = Math.floor(referenceDate.getTime() / 86400000);
  const currentStartDay = referenceDay - 6;
  const previousEndDay = currentStartDay - 1;
  const previousStartDay = previousEndDay - 6;

  const currentSevenDayAverage = getAverageForWindow(
    trendChronological,
    currentStartDay,
    referenceDay,
  );
  const previousSevenDayAverage = getAverageForWindow(
    trendChronological,
    previousStartDay,
    previousEndDay,
  );

  const canCompareSevenDayPeriods =
    Boolean(currentSevenDayAverage) &&
    Boolean(previousSevenDayAverage) &&
    (currentSevenDayAverage?.entryCount ?? 0) >= MIN_ENTRIES_FOR_PERIOD_COMPARISON &&
    (previousSevenDayAverage?.entryCount ?? 0) >= MIN_ENTRIES_FOR_PERIOD_COMPARISON;

  const sevenDayComparisonDelta =
    canCompareSevenDayPeriods && currentSevenDayAverage && previousSevenDayAverage
      ? roundWeight(currentSevenDayAverage.value - previousSevenDayAverage.value, 2)
      : null;

  return {
    displayUnit,
    historyNewestFirst,
    trendChronological,
    latest,
    previous,
    previousEntryDelta,
    currentSevenDayAverage,
    previousSevenDayAverage,
    sevenDayComparisonDelta,
    canCompareSevenDayPeriods,
  };
}

export function formatDeltaLabel(delta: number | null, unit: WeightUnit): string {
  if (delta === null) {
    return "No previous entry";
  }
  if (delta === 0) {
    return `No change ${unit}`;
  }
  if (delta > 0) {
    return `Up ${roundWeight(delta, 1)} ${unit}`;
  }
  return `Down ${roundWeight(Math.abs(delta), 1)} ${unit}`;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${roundWeight(value, 1).toFixed(1)} ${unit}`;
}

export function shortDateLabel(entryDate: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${entryDate}T00:00:00.000Z`),
  );
}
