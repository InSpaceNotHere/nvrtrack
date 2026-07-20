import { ProgressTabs } from "@/components/progress/progress-tabs";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WEIGHT_TREND, STRENGTH_PRS } from "@/lib/sample-data";

function ProgressOverview() {
  const weightPoints = WEIGHT_TREND.map((point) => point.value);

  return (
    <div className="space-y-3.5">
      <section className="grid gap-3 sm:grid-cols-2">
        <Card title="Current Weight">
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
            204.8 <span className="text-lg text-zinc-300">lb</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-rose-400">down 1.2 lb today</p>
          <div className="mt-2.5">
            <TrendSparkline points={weightPoints} />
          </div>
        </Card>
        <Card title="Seven-Day Average">
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
            205.6 <span className="text-lg text-zinc-300">lb</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-rose-400">down 0.8 lb this week</p>
          <div className="mt-2.5">
            <TrendSparkline points={[206.4, 206.2, 206.0, 205.9, 205.7, 205.6, 205.6]} />
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <Card title="Strength PRs">
          <ul className="space-y-2">
            {STRENGTH_PRS.map((pr) => (
              <li
                key={pr.exercise}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-zinc-100">{pr.exercise}</span>
                <span className="text-base font-semibold text-white">
                  {pr.value} {pr.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Progress Note">
          <p className="text-sm leading-6 text-zinc-300">
            Body weight is trending down while pressing performance stays stable. Maintain protein intake and current
            weekly training volume.
          </p>
        </Card>
      </section>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Progress" />
      <ProgressTabs overview={<ProgressOverview />} />
    </div>
  );
}
