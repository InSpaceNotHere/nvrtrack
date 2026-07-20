import { ProgressTabs } from "@/components/progress/progress-tabs";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WEIGHT_TREND, STRENGTH_PRS } from "@/lib/sample-data";

function ProgressOverview() {
  const weightPoints = WEIGHT_TREND.map((point) => point.value);
  const strengthPoints = [182, 193, 201, 208, 214, 221, 225];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="Current Weight">
          <p className="text-3xl font-semibold tracking-tight text-white">204.8 lb</p>
          <p className="mt-1 text-sm text-zinc-400">down 1.2 lb today</p>
          <div className="mt-4">
            <TrendSparkline points={weightPoints} />
          </div>
        </Card>
        <Card title="Seven-Day Average">
          <p className="text-3xl font-semibold tracking-tight text-white">205.6 lb</p>
          <p className="mt-1 text-sm text-zinc-400">down 0.8 lb this week</p>
          <div className="mt-4">
            <TrendSparkline points={[206.4, 206.2, 206.0, 205.9, 205.7, 205.6, 205.6]} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Strength PRs">
          <ul className="space-y-3">
            {STRENGTH_PRS.map((pr) => (
              <li key={pr.exercise} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <span className="text-sm font-medium text-zinc-100">{pr.exercise}</span>
                <span className="text-sm font-semibold text-white">
                  {pr.value} {pr.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Bench Trend">
          <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">Static visualization</p>
          <div className="mt-3">
            <TrendSparkline points={strengthPoints} />
          </div>
          <p className="mt-3 text-sm text-zinc-400">Bench Press progressed from 182 lb to 225 lb.</p>
        </Card>
      </section>

      <Card title="Progress Note">
        <p className="text-sm leading-6 text-zinc-300">
          Body weight is trending down while pressing performance remains stable. The current plan is to maintain
          protein and keep weekly training volume consistent.
        </p>
      </Card>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Progress" subtitle="Weight trends, strength PRs, and milestone notes." />
      <ProgressTabs overview={<ProgressOverview />} />
    </div>
  );
}
