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
    <Card title="Body Weight">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.1rem]">
            {currentWeight.toFixed(1)} <span className="text-lg text-zinc-300">lb</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-rose-400">{currentChange}</p>
        </div>
        <div>
          <p className="text-xl font-semibold text-white">
            {sevenDayAverage.toFixed(1)} <span className="text-sm text-zinc-300">lb avg</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-rose-400">{averageChange}</p>
        </div>
      </div>
      <div className="mt-3">
        <TrendSparkline points={trend.map((point) => point.value)} />
        <div className="mt-1 grid grid-cols-7 text-[10px] text-zinc-500">
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
