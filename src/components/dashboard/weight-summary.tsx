import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
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
      <Card title="Body Weight">
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
    <Card title="Body Weight">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.1rem]">
            {currentWeight.toFixed(1)} <span className="text-lg text-zinc-300">{unit}</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{currentChange}</p>
        </div>
        <div>
          <p className="text-xl font-semibold text-white">
            {sevenDayAverage.toFixed(1)} <span className="text-sm text-zinc-300">{unit} avg</span>
          </p>
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
