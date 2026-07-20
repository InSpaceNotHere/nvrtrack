import type { WeightEntryMetricPoint } from "./metrics";

export type WeightChartRange = "7d" | "30d" | "90d" | "6m" | "1y" | "all";

export interface WeightChartPoint {
  date: string;
  value: number;
}

export interface WeightChartSeries {
  points: WeightChartPoint[];
  trendLine: WeightChartPoint[];
}

const RANGE_DAY_LOOKUP: Record<Exclude<WeightChartRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "6m": 183,
  "1y": 365,
};

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregatePoints(points: WeightChartPoint[]): WeightChartPoint[] {
  if (points.length <= 90) {
    return points;
  }
  const bucketDays = points.length <= 365 ? 7 : 30;
  const buckets = new Map<string, number[]>();

  for (const point of points) {
    const date = toUtcDate(point.date);
    const dayNumber = Math.floor(date.getTime() / 86400000);
    const bucketStartDay = Math.floor(dayNumber / bucketDays) * bucketDays;
    const bucketDate = new Date(bucketStartDay * 86400000);
    const bucketKey = toDateString(bucketDate);
    const list = buckets.get(bucketKey);
    if (list) {
      list.push(point.value);
    } else {
      buckets.set(bucketKey, [point.value]);
    }
  }

  return [...buckets.entries()]
    .map(([date, values]) => ({ date, value: Math.round(average(values) * 100) / 100 }))
    .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
}

function buildTrendLine(points: WeightChartPoint[]): WeightChartPoint[] {
  if (points.length < 2) {
    return [];
  }
  const xValues = points.map((_, index) => index);
  const yValues = points.map((point) => point.value);
  const xMean = average(xValues);
  const yMean = average(yValues);

  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < points.length; index += 1) {
    const xDiff = xValues[index] - xMean;
    numerator += xDiff * (yValues[index] - yMean);
    denominator += xDiff * xDiff;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  return points.map((point, index) => ({
    date: point.date,
    value: Math.round((slope * index + intercept) * 100) / 100,
  }));
}

export function buildWeightChartSeries(
  entries: WeightEntryMetricPoint[],
  range: WeightChartRange,
  referenceDate = new Date(),
): WeightChartSeries {
  const chronologicalPoints = [...entries]
    .sort((left, right) => (left.entryDate < right.entryDate ? -1 : left.entryDate > right.entryDate ? 1 : 0))
    .map((entry) => ({
      date: entry.entryDate,
      value: entry.weight,
    }));

  if (chronologicalPoints.length === 0) {
    return { points: [], trendLine: [] };
  }

  let filtered = chronologicalPoints;
  if (range !== "all") {
    const dayCount = RANGE_DAY_LOOKUP[range];
    const cutoff = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    cutoff.setUTCDate(cutoff.getUTCDate() - (dayCount - 1));
    filtered = chronologicalPoints.filter((point) => toUtcDate(point.date) >= cutoff);
  }

  const points = aggregatePoints(filtered);
  const trendLine = buildTrendLine(points);
  return { points, trendLine };
}
