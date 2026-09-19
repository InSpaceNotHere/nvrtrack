"use client";

import { useMemo, useState } from "react";

import { buildWeightChartSeries, type WeightChartRange } from "@/lib/weight/chart";
import type { WeightEntryMetricPoint } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";

interface WeightChartProps {
  entries: WeightEntryMetricPoint[];
  unit: WeightUnit;
}

const RANGE_OPTIONS: Array<{ value: WeightChartRange; label: string }> = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

function toSvgPoints(values: Array<{ value: number }>): string {
  if (values.length <= 1) {
    return "";
  }
  const min = Math.min(...values.map((point) => point.value));
  const max = Math.max(...values.map((point) => point.value));
  const range = Math.max(max - min, 0.01);
  return values
    .map((point, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 35 - ((point.value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(" ");
}

export function WeightChart({ entries, unit }: WeightChartProps) {
  const [range, setRange] = useState<WeightChartRange>("30d");
  const series = useMemo(() => buildWeightChartSeries(entries, range), [entries, range]);
  const chartLine = toSvgPoints(series.points);
  const trendLine = toSvgPoints(series.trendLine);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
        <p className="text-sm font-medium text-zinc-200">No weight data available.</p>
        <p className="mt-1 text-xs text-zinc-500">Log your first weigh-in to unlock trend and range filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              range === option.value
                ? "border-white/35 bg-white/15 text-white"
                : "border-white/12 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {series.points.length ? (
        <div>
          <svg
            viewBox="0 0 100 40"
            className="h-20 w-full rounded-lg border border-white/10 bg-black/20"
            role="img"
            aria-label={`Weight chart in ${unit}`}
          >
            <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
            {chartLine ? (
              <polyline points={chartLine} fill="none" stroke="rgba(135,163,255,0.95)" strokeWidth="1.8" />
            ) : (
              <circle cx="50" cy="20" r="2.5" fill="rgba(135,163,255,0.95)" />
            )}
            {trendLine ? (
              <polyline
                points={trendLine}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            ) : null}
          </svg>
          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
            <span>{series.points[0]?.date ?? ""}</span>
            <span>{series.points[series.points.length - 1]?.date ?? ""}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
          <p className="text-xs text-zinc-400">No entries in this range.</p>
        </div>
      )}
    </div>
  );
}
