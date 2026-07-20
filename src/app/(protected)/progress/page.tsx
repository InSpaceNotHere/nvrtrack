import { ProgressTabs } from "@/components/progress/progress-tabs";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { getMyProfile } from "@/lib/data/profile";
import { getWeightEntries } from "@/lib/data/weight";
import {
  MIN_ENTRIES_FOR_PERIOD_COMPARISON,
  computeWeightMetrics,
  formatDeltaLabel,
  shortDateLabel,
} from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";
import { STRENGTH_PRS } from "@/lib/sample-data";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

interface ProgressOverviewProps {
  displayUnit: WeightUnit;
  latestWeight: number | null;
  latestChangeLabel: string;
  sevenDayAverage: number | null;
  sevenDayAverageLabel: string;
  trendPoints: { label: string; value: number }[];
  weightHistory: ReturnType<typeof computeWeightMetrics>["historyNewestFirst"];
}

function ProgressOverview({
  displayUnit,
  latestWeight,
  latestChangeLabel,
  sevenDayAverage,
  sevenDayAverageLabel,
  trendPoints,
  weightHistory,
}: ProgressOverviewProps) {
  return (
    <div className="space-y-3.5">
      <section className="grid gap-3 sm:grid-cols-2">
        <Card title="Current Weight">
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
            {latestWeight !== null ? latestWeight.toFixed(1) : "--"}{" "}
            <span className="text-lg text-zinc-300">{displayUnit}</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{latestChangeLabel}</p>
          <div className="mt-2.5">
            <TrendSparkline points={trendPoints} unit={displayUnit} />
          </div>
          {trendPoints.length ? (
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
              <span>{trendPoints[0]?.label}</span>
              <span>{trendPoints[trendPoints.length - 1]?.label}</span>
            </div>
          ) : null}
        </Card>
        <Card title="Seven-Day Average">
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
            {sevenDayAverage !== null ? sevenDayAverage.toFixed(1) : "--"}{" "}
            <span className="text-lg text-zinc-300">{displayUnit}</span>
          </p>
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{sevenDayAverageLabel}</p>
          <div className="mt-2.5">
            <TrendSparkline points={trendPoints} unit={displayUnit} />
          </div>
          {trendPoints.length ? (
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
              <span>{trendPoints[0]?.label}</span>
              <span>{trendPoints[trendPoints.length - 1]?.label}</span>
            </div>
          ) : null}
        </Card>
      </section>

      <Card title="Weight History">
        <WeightLogManager entries={weightHistory} displayUnit={displayUnit} showHistory />
      </Card>

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
            Weight metrics above are live from your private entries. Strength PR cards remain static sample data in
            this session.
          </p>
        </Card>
      </section>
    </div>
  );
}

export default async function ProgressPage() {
  const [profileResult, weightEntriesResult] = await Promise.all([getMyProfile(), getWeightEntries()]);
  const weightLoadError = weightEntriesResult.error?.message ?? profileResult.error?.message ?? null;
  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightMetrics = computeWeightMetrics(weightEntriesResult.data ?? [], displayUnit);
  const trendPoints = weightMetrics.trendChronological.map((entry) => ({
    label: shortDateLabel(entry.entryDate),
    value: entry.weight,
  }));

  const latestWeight = weightMetrics.latest?.weight ?? null;
  const latestChangeLabel = formatDeltaLabel(weightMetrics.previousEntryDelta, displayUnit);
  const sevenDayAverage = weightMetrics.currentSevenDayAverage?.value ?? null;
  const sevenDayAverageLabel =
    weightMetrics.canCompareSevenDayPeriods && weightMetrics.sevenDayComparisonDelta !== null
      ? formatDeltaLabel(weightMetrics.sevenDayComparisonDelta, displayUnit)
      : `Comparison unavailable (need ${MIN_ENTRIES_FOR_PERIOD_COMPARISON} entries per seven-day period)`;

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" />
      {weightLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      <ProgressTabs
        overview={
          <ProgressOverview
            displayUnit={displayUnit}
            latestWeight={latestWeight}
            latestChangeLabel={latestChangeLabel}
            sevenDayAverage={sevenDayAverage}
            sevenDayAverageLabel={sevenDayAverageLabel}
            trendPoints={trendPoints}
            weightHistory={weightMetrics.historyNewestFirst}
          />
        }
      />
    </div>
  );
}
