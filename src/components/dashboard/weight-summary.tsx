import { Card } from "@/components/ui/card";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import type { WeightTrendPoint } from "@/types/fitness";

interface WeightSummaryProps {
  currentWeight: number;
  currentChange: string;
  sevenDayAverage: number;
  averageChange: string;
  trend: WeightTrendPoint[];
}

export function WeightSummary({
  currentWeight,
  currentChange,
  sevenDayAverage,
  averageChange,
  trend,
}: WeightSummaryProps) {
  return (
    <Card title="Body Weight" subtitle="Current + seven-day trend">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-white">{currentWeight.toFixed(1)} lb</p>
          <p className="mt-1 text-sm text-zinc-400">{currentChange}</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{sevenDayAverage.toFixed(1)} lb avg</p>
          <p className="mt-1 text-sm text-zinc-400">{averageChange}</p>
        </div>
      </div>
      <div className="mt-4">
        <TrendSparkline points={trend.map((point) => point.value)} />
        <div className="mt-1 grid grid-cols-7 text-[11px] text-zinc-500">
          {trend.map((point) => (
            <span key={point.label} className="text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
