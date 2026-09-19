import Link from "next/link";

import { ProgressPhotoManager } from "@/components/progress/progress-photo-manager";
import { BodyMeasurementManager } from "@/components/progress/body-measurement-manager";
import { WeeklyJournalManager } from "@/components/progress/weekly-journal-manager";
import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { getMyBodyMeasurementEntries } from "@/lib/data/body-measurements";
import { getMyProfile } from "@/lib/data/profile";
import { getMyProgressPhotoDates, getMyProgressPhotoPage } from "@/lib/data/progress-photos";
import { getMyWeeklyJournalEntries } from "@/lib/data/weekly-journal";
import { getMyStrengthHistorySetRows } from "@/lib/data/workouts";
import { buildStrengthDashboardSummaryFromHistoryRows } from "@/lib/training/strength";
import { getWeightEntries } from "@/lib/data/weight";
import { getCurrentWeekStartMondayInTimeZone, getDateStringInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { computeWeightMetrics, formatDeltaLabel, shortDateLabel } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

interface ProgressOverviewProps {
  displayUnit: WeightUnit;
  latestWeight: number | null;
  latestChangeLabel: string;
  trendPoints: { label: string; value: number }[];
  strengthSummary: ReturnType<typeof buildStrengthDashboardSummaryFromHistoryRows>;
}

function ProgressOverview({
  displayUnit,
  latestWeight,
  latestChangeLabel,
  trendPoints,
  strengthSummary,
}: ProgressOverviewProps) {
  return (
    <div className="space-y-3">
      <section className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <Card title="Weight" subtitle="Current and 7-day change" variant="primary">
          <MetricValue value={latestWeight !== null ? latestWeight.toFixed(1) : "--"} unit={displayUnit} />
          <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-400">{latestChangeLabel}</p>
          <div className="mt-3 grid gap-2">
            <Link
              href="/progress?view=weight"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
            >
              Log Weight
            </Link>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/progress?view=photos"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Photos
              </Link>
              <Link
                href="/progress?view=measurements"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Measurements
              </Link>
              <Link
                href="/progress?view=journal"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Journal
              </Link>
            </div>
          </div>
        </Card>

        <Card title="Strength Snapshot" subtitle="Bench, squat, deadlift, latest PR" variant="secondary">
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
                <StateChip
                  state={strengthSummary.thousand_club_progress_percent !== null ? "tested" : "missing"}
                  label={
                    strengthSummary.thousand_club_progress_percent !== null
                      ? `Tested progress ${strengthSummary.thousand_club_progress_percent.toFixed(0)}%`
                      : "Need tested bench, squat, and deadlift"
                  }
                />
              </div>
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
      </section>

      <Card title="Chart" subtitle="Recent body-weight trend" variant="secondary">
        {trendPoints.length ? (
          <>
            <TrendSparkline points={trendPoints} unit={displayUnit} />
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
              <span>{trendPoints[0]?.label}</span>
              <span>{trendPoints[trendPoints.length - 1]?.label}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-500">Log your first weigh-in to start trend tracking.</p>
        )}
      </Card>
    </div>
  );
}

interface ProgressPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const view = Array.isArray(resolvedSearchParams.view) ? resolvedSearchParams.view[0] : resolvedSearchParams.view;
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
  const strengthSummary = buildStrengthDashboardSummaryFromHistoryRows({
    rows: strengthRowsResult.data ?? [],
    displayUnit,
    referenceDate,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Progress" subtitle="Am I improving?" />
      {weightLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      {view === "weight" ? (
        <Card title="Log Weight" subtitle="Track and manage body-weight history" variant="tertiary">
          <div className="mb-2">
            <Link
              href="/progress"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Progress
            </Link>
          </div>
          <WeightLogManager
            entries={weightMetrics.historyNewestFirst}
            displayUnit={displayUnit}
            showHistory
            initialEntryDate={todayDate}
            defaultEditorOpen
          />
        </Card>
      ) : view === "photos" ? (
        <>
          <Card variant="tertiary">
            <Link
              href="/progress"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Progress
            </Link>
          </Card>
          <ProgressPhotoManager
            initialRows={progressPhotosPageResult.data?.rows ?? []}
            initialNextOffset={progressPhotosPageResult.data?.nextOffset ?? null}
            availableDates={progressPhotoDatesResult.data ?? []}
            todayDate={todayDate}
          />
        </>
      ) : view === "measurements" ? (
        <>
          <Card variant="tertiary">
            <Link
              href="/progress"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Progress
            </Link>
          </Card>
          <BodyMeasurementManager entries={measurementEntriesResult.data ?? []} todayDate={todayDate} />
        </>
      ) : view === "journal" ? (
        <>
          <Card variant="tertiary">
            <Link
              href="/progress"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Progress
            </Link>
          </Card>
          <WeeklyJournalManager
            entries={journalEntriesResult.data ?? []}
            initialWeekStart={getCurrentWeekStartMondayInTimeZone(profileTimeZone, referenceDate)}
          />
        </>
      ) : (
        <ProgressOverview
          displayUnit={displayUnit}
          latestWeight={latestWeight}
          latestChangeLabel={latestChangeLabel}
          trendPoints={trendPoints}
          strengthSummary={strengthSummary}
        />
      )}
    </div>
  );
}
