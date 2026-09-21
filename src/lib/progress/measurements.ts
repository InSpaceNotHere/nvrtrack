export const STANDARD_MEASUREMENT_FIELDS = [
  { id: "waist", label: "Waist" },
  { id: "chest", label: "Chest" },
  { id: "neck", label: "Neck" },
  { id: "shoulders", label: "Shoulders" },
  { id: "left_arm", label: "Left Arm" },
  { id: "right_arm", label: "Right Arm" },
  { id: "left_forearm", label: "Left Forearm" },
  { id: "right_forearm", label: "Right Forearm" },
  { id: "hips", label: "Hips" },
  { id: "left_thigh", label: "Left Thigh" },
  { id: "right_thigh", label: "Right Thigh" },
  { id: "left_calf", label: "Left Calf" },
  { id: "right_calf", label: "Right Calf" },
] as const;

export type StandardMeasurementId = (typeof STANDARD_MEASUREMENT_FIELDS)[number]["id"];
export type MeasurementMap = Record<string, number>;

export interface MeasurementEntryLike {
  entry_date: string;
  measurements: Record<string, unknown>;
  custom_measurements: Record<string, unknown>;
}

export interface MeasurementTrendPoint {
  date: string;
  value: number;
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

export function normalizeMeasurementValues(input: Record<string, string>): MeasurementMap {
  const output: MeasurementMap = {};
  for (const field of STANDARD_MEASUREMENT_FIELDS) {
    const parsed = parseNumber(input[field.id] ?? "");
    if (parsed !== null) {
      output[field.id] = parsed;
    }
  }
  return output;
}

export function normalizeCustomMeasurementValues(input: Array<{ name: string; value: string }>): MeasurementMap {
  const output: MeasurementMap = {};
  for (const item of input) {
    const key = item.name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "_");
    if (!key) {
      continue;
    }
    const parsed = parseNumber(item.value);
    if (parsed !== null) {
      output[key] = parsed;
    }
  }
  return output;
}

export function measurementValueForField(
  entry: MeasurementEntryLike,
  fieldId: string,
): number | null {
  const fromStandard = entry.measurements[fieldId];
  if (typeof fromStandard === "number" && Number.isFinite(fromStandard)) {
    return fromStandard;
  }
  const fromCustom = entry.custom_measurements[fieldId];
  if (typeof fromCustom === "number" && Number.isFinite(fromCustom)) {
    return fromCustom;
  }
  return null;
}

export function buildMeasurementTrend(
  entries: MeasurementEntryLike[],
  fieldId: string,
): MeasurementTrendPoint[] {
  return entries
    .map((entry) => ({
      date: entry.entry_date,
      value: measurementValueForField(entry, fieldId),
    }))
    .filter((entry): entry is MeasurementTrendPoint => entry.value !== null)
    .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
}
