import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
import { TrendSparkline, type TrendSparklinePoint } from "@/components/ui/trend-sparkline";
import type { WeightUnit } from "@/lib/weight/conversions";

interface WeightSummaryProps {
  currentWeight: number | null;
  currentChange: string;
  sevenDayAverage: number | null;
  averageChange: string;
  trend: TrendSparklinePoint[];
  unit: WeightUnit;
  emptyStateAction?: ReactNode;
}

export function WeightSummary({
  currentWeight,
  currentChange,
  sevenDayAverage,
  averageChange,
  trend,
  unit,
  emptyStateAction,
}: WeightSummaryProps) {
  if (currentWeight === null || sevenDayAverage === null) {
    return (
      <Card title="Body Weight" variant="secondary">
        <p className="text-sm text-zinc-300">No weigh-ins saved yet.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Log your first weight entry to activate trend lines and seven-day averages.
        </p>
        {emptyStateAction ? <div className="mt-3">{emptyStateAction}</div> : null}
      </Card>
    );
  }

  const labels = trend.length <= 7 ? trend : trend.slice(-7);

  return (
    <Card title="Body Weight" variant="secondary">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <MetricValue value={currentWeight.toFixed(1)} unit={unit} />
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{currentChange}</p>
        </div>
        <div className="rounded-[var(--ds-radius-md)] border border-white/10 bg-black/20 p-2.5 sm:p-3">
          <MetricValue value={sevenDayAverage.toFixed(1)} unit={`${unit} avg`} tone="secondary" />
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{averageChange}</p>
        </div>
      </div>
      <div className="mt-3">
        <TrendSparkline points={trend} unit={unit} />
        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
          {labels.map((point) => (
            <span key={point.label} className="text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
