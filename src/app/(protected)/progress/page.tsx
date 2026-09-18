import { ProgressTabs } from "@/components/progress/progress-tabs";
import { ProgressPhotoManager } from "@/components/progress/progress-photo-manager";
import { BodyMeasurementManager } from "@/components/progress/body-measurement-manager";
import { WeeklyJournalManager } from "@/components/progress/weekly-journal-manager";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { MetricValue } from "@/components/ui/metric-value";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { WeightChart } from "@/components/weight/weight-chart";
import { getMyBodyMeasurementEntries } from "@/lib/data/body-measurements";
import { getMyProfile } from "@/lib/data/profile";
import { getMyProgressPhotoDates, getMyProgressPhotoPage } from "@/lib/data/progress-photos";
import { getMyWeeklyJournalEntries } from "@/lib/data/weekly-journal";
import { getMyStrengthHistorySetRows } from "@/lib/data/workouts";
import { buildStrengthDashboardSummaryFromHistoryRows } from "@/lib/training/strength";
import { getWeightEntries } from "@/lib/data/weight";
import { getCurrentWeekStartMondayInTimeZone, getDateStringInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import {
  MIN_ENTRIES_FOR_PERIOD_COMPARISON,
  computeWeightMetrics,
  formatDeltaLabel,
  shortDateLabel,
} from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

interface ProgressOverviewProps {
  displayUnit: WeightUnit;
  todayDate: string;
  latestWeight: number | null;
  latestChangeLabel: string;
  sevenDayAverage: number | null;
  sevenDayAverageLabel: string;
  trendPoints: { label: string; value: number }[];
  weightHistory: ReturnType<typeof computeWeightMetrics>["historyNewestFirst"];
  strengthSummary: ReturnType<typeof buildStrengthDashboardSummaryFromHistoryRows>;
}

function ProgressOverview({
  displayUnit,
  todayDate,
  latestWeight,
  latestChangeLabel,
  sevenDayAverage,
  sevenDayAverageLabel,
  trendPoints,
  weightHistory,
  strengthSummary,
}: ProgressOverviewProps) {
  return (
    <div className="space-y-3.5">
      <section className="grid gap-3 sm:grid-cols-2">
        <Card title="Current Weight" variant="primary">
          <MetricValue value={latestWeight !== null ? latestWeight.toFixed(1) : "--"} unit={displayUnit} />
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
        <Card title="Seven-Day Average" variant="secondary">
          <MetricValue value={sevenDayAverage !== null ? sevenDayAverage.toFixed(1) : "--"} unit={displayUnit} />
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

      <Card title="Weight History" variant="tertiary">
        <WeightLogManager
          entries={weightHistory}
          displayUnit={displayUnit}
          showHistory
          initialEntryDate={todayDate}
        />
      </Card>

      <Card title="Weight Chart" subtitle="Range filters + trend line" variant="tertiary">
        <WeightChart entries={weightHistory} unit={displayUnit} />
      </Card>

      <section className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <Card title="Live Strength System" variant="secondary">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <StateChip state="estimated" label="Estimated 1RM" />
            <StateChip state="tested" label="Tested total tracked separately" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Bench • Estimated 1RM</p>
              <MetricValue value={strengthSummary.bench.current_estimated_one_rep_max?.toFixed(1) ?? "--"} unit={displayUnit} tone="secondary" className="mt-1" />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Squat • Estimated 1RM</p>
              <MetricValue value={strengthSummary.squat.current_estimated_one_rep_max?.toFixed(1) ?? "--"} unit={displayUnit} tone="secondary" className="mt-1" />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Deadlift • Estimated 1RM</p>
              <MetricValue value={strengthSummary.deadlift.current_estimated_one_rep_max?.toFixed(1) ?? "--"} unit={displayUnit} tone="secondary" className="mt-1" />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Strength Total • Tested 1RM Only</p>
              <MetricValue value={strengthSummary.total_tested?.toFixed(1) ?? "--"} unit={displayUnit} className="mt-1" />
              <div className="mt-1.5">
                {strengthSummary.thousand_club_progress_percent !== null ? (
                  <Chip tone="success">{`1000 LB Club ${strengthSummary.thousand_club_progress_percent.toFixed(0)}%`}</Chip>
                ) : (
                  <StateChip state="missing" label="Need tested bench, squat, and deadlift" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                {strengthSummary.thousand_club_progress_percent !== null
                  ? "Progress is based on tested canonical bench, squat, and deadlift totals."
                  : "Estimated 1RMs never qualify for a tested 1000 LB Club total."}
              </p>
            </div>
          </div>
          {strengthSummary.latest_pr ? (
            <p className="mt-2 text-xs text-zinc-400">
              Latest PR: {strengthSummary.latest_pr.exercise_name} on {strengthSummary.latest_pr.workout_date} (
              {strengthSummary.latest_pr.estimated_one_rep_max.toFixed(1)} {displayUnit})
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No completed weighted sets yet.</p>
          )}
        </Card>

        <Card title="Exercise History" variant="tertiary">
          {strengthSummary.exercise_snapshots.length ? (
            <ul className="space-y-2">
              {strengthSummary.exercise_snapshots.slice(0, 8).map((snapshot) => (
                <li key={snapshot.exercise_key} className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100">{snapshot.exercise_name}</p>
                    {snapshot.has_recent_pr ? (
                      <StateChip state="pr" label="Recent PR" className="text-[10px]" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Est. 1RM {snapshot.current_estimated_one_rep_max?.toFixed(1) ?? "--"} • Lifetime Est.{" "}
                    {snapshot.lifetime_estimated_one_rep_max?.toFixed(1) ?? "--"} • Heaviest{" "}
                    {snapshot.heaviest_weight?.toFixed(1) ?? "--"} • Best Rep PR{" "}
                    {snapshot.rep_pr !== null && snapshot.rep_pr_reps !== null
                      ? `${snapshot.rep_pr.toFixed(1)} x ${snapshot.rep_pr_reps}`
                      : "--"}
                  </p>
                  <p className="text-[11px] text-zinc-500">Total volume: {snapshot.total_volume?.toFixed(1) ?? "--"} {displayUnit}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Complete weighted sets to build exercise history.</p>
          )}
        </Card>
      </section>
    </div>
  );
}

export default async function ProgressPage() {
  const [profileResult, weightEntriesResult, strengthRowsResult, progressPhotosPageResult, progressPhotoDatesResult, measurementEntriesResult, journalEntriesResult] =
    await Promise.all([
      getMyProfile(),
      getWeightEntries(),
      getMyStrengthHistorySetRows(),
      getMyProgressPhotoPage(0, 24),
      getMyProgressPhotoDates(),
      getMyBodyMeasurementEntries(),
      getMyWeeklyJournalEntries(),
    ]);

  const weightLoadError =
    weightEntriesResult.error?.message ??
    profileResult.error?.message ??
    strengthRowsResult.error?.message ??
    progressPhotosPageResult.error?.message ??
    progressPhotoDatesResult.error?.message ??
    measurementEntriesResult.error?.message ??
    journalEntriesResult.error?.message ??
    null;
  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getDateStringInTimeZone(profileTimeZone, new Date());
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const weightMetrics = computeWeightMetrics(weightEntriesResult.data ?? [], displayUnit, referenceDate);
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
  const strengthSummary = buildStrengthDashboardSummaryFromHistoryRows({
    rows: strengthRowsResult.data ?? [],
    displayUnit,
    referenceDate,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" subtitle="Track trends in Overview, then use Photos, Measurements, and Journal for weekly check-ins." />
      {weightLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      <ProgressTabs
        overview={
          <ProgressOverview
            displayUnit={displayUnit}
            todayDate={todayDate}
            latestWeight={latestWeight}
            latestChangeLabel={latestChangeLabel}
            sevenDayAverage={sevenDayAverage}
            sevenDayAverageLabel={sevenDayAverageLabel}
            trendPoints={trendPoints}
            weightHistory={weightMetrics.historyNewestFirst}
            strengthSummary={strengthSummary}
          />
        }
        photos={
          <ProgressPhotoManager
            initialRows={progressPhotosPageResult.data?.rows ?? []}
            initialNextOffset={progressPhotosPageResult.data?.nextOffset ?? null}
            availableDates={progressPhotoDatesResult.data ?? []}
            todayDate={todayDate}
          />
        }
        measurements={<BodyMeasurementManager entries={measurementEntriesResult.data ?? []} todayDate={todayDate} />}
        journal={
          <WeeklyJournalManager
            entries={journalEntriesResult.data ?? []}
            initialWeekStart={getCurrentWeekStartMondayInTimeZone(profileTimeZone, referenceDate)}
          />
        }
      />
    </div>
  );
}
