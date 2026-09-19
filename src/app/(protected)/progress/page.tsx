import Link from "next/link";

import { ProgressTabs } from "@/components/progress/progress-tabs";
import { ProgressPhotoManager } from "@/components/progress/progress-photo-manager";
import { BodyMeasurementManager } from "@/components/progress/body-measurement-manager";
import { WeeklyJournalManager } from "@/components/progress/weekly-journal-manager";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
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
  fixtureLabel?: string | null;
}

type ProgressTabView = "overview" | "photos" | "measurements" | "journal";
type FixtureView = "empty" | "weight-only" | "weight-trend" | "strength-estimated" | "fully-populated";

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
  fixtureLabel = null,
}: ProgressOverviewProps) {
  const hasWeightData = latestWeight !== null;
  const hasTrend = trendPoints.length >= 2;
  const recentSignal = strengthSummary.latest_pr
    ? `Latest PR: ${strengthSummary.latest_pr.exercise_name} • ${strengthSummary.latest_pr.workout_date}`
    : hasWeightData
      ? `Recent weigh-in signal: ${latestChangeLabel}`
      : "Add your first progress check-in to generate meaningful signals.";

  return (
    <div className="space-y-2.5">
      {fixtureLabel ? (
        <Card variant="tertiary">
          <div className="flex items-center justify-between gap-2">
            <StateChip state="warning" label="Fixture Preview" className="text-[10px]" />
            <p className="text-[11px] text-zinc-400">Deterministic state: {fixtureLabel}</p>
          </div>
        </Card>
      ) : null}

      <Card title="Progress Snapshot" variant="primary">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Current Weight</p>
              <p className="text-base font-semibold text-zinc-100">
                {latestWeight !== null ? `${latestWeight.toFixed(1)} ${displayUnit}` : "--"}
              </p>
              <p className="text-[11px] text-zinc-500">{latestChangeLabel}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Seven-Day Average</p>
              <p className="text-base font-semibold text-zinc-100">
                {sevenDayAverage !== null ? `${sevenDayAverage.toFixed(1)} ${displayUnit}` : "--"}
              </p>
              <p className="text-[11px] text-zinc-500">{sevenDayAverageLabel}</p>
            </div>
          </div>
          {hasTrend ? (
            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Weight Trend</p>
              <div className="mt-1">
                <TrendSparkline points={trendPoints} unit={displayUnit} />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[10px] text-zinc-500">
                <span>{trendPoints[0]?.label}</span>
                <span>{trendPoints[trendPoints.length - 1]?.label}</span>
              </div>
            </div>
          ) : null}
          {!hasWeightData ? (
            <div className="rounded-md border border-dashed border-white/15 bg-black/20 px-2 py-2">
              <div className="mb-1">
                <StateChip state="missing" label="No weight data yet" className="text-[10px]" />
              </div>
              <p className="text-xs text-zinc-300">Log your first weigh-in to activate trend and change signals.</p>
              <Link
                href="#weight-details"
                className="mt-1.5 inline-flex h-7 items-center justify-center rounded-md border border-white/15 px-2 text-[11px] font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Log Weight
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Live Strength System" variant="secondary">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <StateChip state="estimated" label="Estimated 1RM" />
          <StateChip state="tested" label="Tested total tracked separately" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <p className="text-[10px] text-zinc-500">Bench • Estimated 1RM</p>
            <p className="text-sm font-semibold text-zinc-100">{strengthSummary.bench.current_estimated_one_rep_max?.toFixed(1) ?? "--"}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <p className="text-[10px] text-zinc-500">Squat • Estimated 1RM</p>
            <p className="text-sm font-semibold text-zinc-100">{strengthSummary.squat.current_estimated_one_rep_max?.toFixed(1) ?? "--"}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <p className="text-[10px] text-zinc-500">Deadlift • Estimated 1RM</p>
            <p className="text-sm font-semibold text-zinc-100">{strengthSummary.deadlift.current_estimated_one_rep_max?.toFixed(1) ?? "--"}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <p className="text-[10px] text-zinc-500">Strength Total • Tested 1RM Only</p>
            <p className="text-sm font-semibold text-zinc-100">{strengthSummary.total_tested?.toFixed(1) ?? "--"} {displayUnit}</p>
          </div>
        </div>
        <div className="mt-2">
          {strengthSummary.thousand_club_progress_percent !== null ? (
            <Chip tone="success">{`1000 LB Club ${strengthSummary.thousand_club_progress_percent.toFixed(0)}%`}</Chip>
          ) : (
            <StateChip state="missing" label="Need tested bench, squat, and deadlift" />
          )}
          <p className="mt-1 text-[11px] text-zinc-500">Estimated 1RMs never qualify for tested 1000 LB Club.</p>
        </div>
      </Card>

      <Card title="Recent Progress Signal" variant="tertiary">
        <p className="text-sm text-zinc-200">{recentSignal}</p>
        {strengthSummary.latest_pr ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            Estimated PR value: {strengthSummary.latest_pr.estimated_one_rep_max.toFixed(1)} {displayUnit}
          </p>
        ) : null}
      </Card>

      <Card title="Progress Domains" variant="tertiary">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/progress?view=overview#weight-details"
            className="rounded-md border border-white/12 bg-black/20 px-2 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Weight / History
          </Link>
          <Link
            href="/progress?view=photos"
            className="rounded-md border border-white/12 bg-black/20 px-2 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Photos
          </Link>
          <Link
            href="/progress?view=measurements"
            className="rounded-md border border-white/12 bg-black/20 px-2 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Measurements
          </Link>
          <Link
            href="/progress?view=journal"
            className="rounded-md border border-white/12 bg-black/20 px-2 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Journal
          </Link>
        </div>
      </Card>

      <div id="weight-details">
        <Card title="Weight Details" subtitle="Chart, range filters, and log history" variant="tertiary">
        <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            Open Weight Chart + History
          </summary>
          <div className="mt-2 space-y-2">
            <WeightChart entries={weightHistory} unit={displayUnit} />
            <WeightLogManager
              entries={weightHistory}
              displayUnit={displayUnit}
              showHistory
              initialEntryDate={todayDate}
              defaultEditorOpen={false}
            />
          </div>
        </details>
        </Card>
      </div>

      <Card title="Exercise History" variant="tertiary">
        <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            Open Strength Exercise History
          </summary>
          {strengthSummary.exercise_snapshots.length ? (
            <ul className="mt-2 space-y-2">
              {strengthSummary.exercise_snapshots.slice(0, 8).map((snapshot) => (
                <li key={snapshot.exercise_key} className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-100">{snapshot.exercise_name}</p>
                    {snapshot.has_recent_pr ? <StateChip state="pr" label="Recent PR" className="text-[10px]" /> : null}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Est. 1RM {snapshot.current_estimated_one_rep_max?.toFixed(1) ?? "--"} • Heaviest{" "}
                    {snapshot.heaviest_weight?.toFixed(1) ?? "--"} • Rep PR{" "}
                    {snapshot.rep_pr !== null && snapshot.rep_pr_reps !== null ? `${snapshot.rep_pr.toFixed(1)} x ${snapshot.rep_pr_reps}` : "--"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">Complete weighted sets to build exercise history.</p>
          )}
        </details>
      </Card>
    </div>
  );
}

function asSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toInitialTab(view: string | undefined): "Overview" | "Photos" | "Measurements" | "Journal" {
  if (view === "photos") return "Photos";
  if (view === "measurements") return "Measurements";
  if (view === "journal") return "Journal";
  return "Overview";
}

function isFixtureView(value: string | undefined): value is FixtureView {
  return value === "empty" || value === "weight-only" || value === "weight-trend" || value === "strength-estimated" || value === "fully-populated";
}

function createEmptyStrengthSummary(): ReturnType<typeof buildStrengthDashboardSummaryFromHistoryRows> {
  return {
    bench: {
      key: "bench",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
    squat: {
      key: "squat",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
    deadlift: {
      key: "deadlift",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
    total_tested: null,
    total_estimated: null,
    total_current: null,
    total_lifetime: null,
    thousand_club_progress_percent: null,
    latest_pr: null,
    exercise_snapshots: [],
  };
}

function buildFixtureWeightHistory(displayUnit: WeightUnit, values: Array<{ date: string; weight: number }>): ReturnType<typeof computeWeightMetrics>["historyNewestFirst"] {
  return [...values]
    .sort((left, right) => (left.date < right.date ? 1 : -1))
    .map((entry, index) => ({
      id: `fixture-${index}`,
      entryDate: entry.date,
      note: null,
      weight: entry.weight,
      unit: displayUnit,
      sourceWeight: entry.weight,
      sourceUnit: displayUnit,
    }));
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const viewParam = asSingleParam(resolvedSearchParams.view) as ProgressTabView | undefined;
  const fixtureParam = asSingleParam(resolvedSearchParams.fixture);
  const allowFixturePreview = process.env.NODE_ENV !== "production";
  const fixture = allowFixturePreview && isFixtureView(fixtureParam) ? fixtureParam : null;

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

  const sevenDayAverageLabel =
    weightMetrics.canCompareSevenDayPeriods && weightMetrics.sevenDayComparisonDelta !== null
      ? formatDeltaLabel(weightMetrics.sevenDayComparisonDelta, displayUnit)
      : `Comparison unavailable (need ${MIN_ENTRIES_FOR_PERIOD_COMPARISON} entries per seven-day period)`;
  let strengthSummary = buildStrengthDashboardSummaryFromHistoryRows({
    rows: strengthRowsResult.data ?? [],
    displayUnit,
    referenceDate,
  });
  let latestWeight = weightMetrics.latest?.weight ?? null;
  let latestChangeLabel = formatDeltaLabel(weightMetrics.previousEntryDelta, displayUnit);
  let sevenDayAverage = weightMetrics.currentSevenDayAverage?.value ?? null;
  let overviewTrendPoints = trendPoints;
  let overviewWeightHistory = weightMetrics.historyNewestFirst;
  let overviewFixtureLabel: string | null = null;

  if (fixture) {
    overviewFixtureLabel = fixture;
    if (fixture === "empty") {
      latestWeight = null;
      latestChangeLabel = "No previous entry";
      sevenDayAverage = null;
      overviewTrendPoints = [];
      overviewWeightHistory = [];
      strengthSummary = createEmptyStrengthSummary();
    } else if (fixture === "weight-only") {
      latestWeight = 188.4;
      latestChangeLabel = "No previous entry";
      sevenDayAverage = null;
      overviewTrendPoints = [];
      overviewWeightHistory = buildFixtureWeightHistory(displayUnit, [{ date: todayDate, weight: 188.4 }]);
      strengthSummary = createEmptyStrengthSummary();
    } else if (fixture === "weight-trend") {
      latestWeight = 186.1;
      latestChangeLabel = "Down 0.5 lb";
      sevenDayAverage = 186.9;
      overviewTrendPoints = [
        { label: "Sep 12", value: 188.1 },
        { label: "Sep 13", value: 187.8 },
        { label: "Sep 14", value: 187.5 },
        { label: "Sep 15", value: 187.1 },
        { label: "Sep 16", value: 186.8 },
        { label: "Sep 17", value: 186.5 },
        { label: "Sep 18", value: 186.1 },
      ];
      overviewWeightHistory = buildFixtureWeightHistory(displayUnit, [
        { date: "2026-09-18", weight: 186.1 },
        { date: "2026-09-17", weight: 186.5 },
        { date: "2026-09-16", weight: 186.8 },
        { date: "2026-09-15", weight: 187.1 },
        { date: "2026-09-14", weight: 187.5 },
      ]);
      strengthSummary = createEmptyStrengthSummary();
    } else if (fixture === "strength-estimated") {
      latestWeight = 192.2;
      latestChangeLabel = "Up 0.3 lb";
      sevenDayAverage = 191.6;
      overviewTrendPoints = [
        { label: "Sep 12", value: 191.0 },
        { label: "Sep 14", value: 191.4 },
        { label: "Sep 16", value: 191.8 },
        { label: "Sep 18", value: 192.2 },
      ];
      overviewWeightHistory = buildFixtureWeightHistory(displayUnit, [
        { date: "2026-09-18", weight: 192.2 },
        { date: "2026-09-16", weight: 191.8 },
        { date: "2026-09-14", weight: 191.4 },
        { date: "2026-09-12", weight: 191.0 },
      ]);
      strengthSummary = {
        ...createEmptyStrengthSummary(),
        bench: {
          key: "bench",
          current_estimated_one_rep_max: 235,
          lifetime_estimated_one_rep_max: 240,
          current_tested_one_rep_max: null,
          lifetime_tested_one_rep_max: null,
        },
        squat: {
          key: "squat",
          current_estimated_one_rep_max: 315,
          lifetime_estimated_one_rep_max: 320,
          current_tested_one_rep_max: null,
          lifetime_tested_one_rep_max: null,
        },
        deadlift: {
          key: "deadlift",
          current_estimated_one_rep_max: 365,
          lifetime_estimated_one_rep_max: 370,
          current_tested_one_rep_max: null,
          lifetime_tested_one_rep_max: null,
        },
        latest_pr: {
          exercise_name: "Deadlift",
          workout_date: "2026-09-18",
          estimated_one_rep_max: 370,
        },
      };
    } else if (fixture === "fully-populated") {
      latestWeight = 184.3;
      latestChangeLabel = "Down 0.4 lb";
      sevenDayAverage = 185.0;
      overviewTrendPoints = [
        { label: "Sep 12", value: 186.4 },
        { label: "Sep 13", value: 186.1 },
        { label: "Sep 14", value: 185.7 },
        { label: "Sep 15", value: 185.3 },
        { label: "Sep 16", value: 185.0 },
        { label: "Sep 17", value: 184.7 },
        { label: "Sep 18", value: 184.3 },
      ];
      overviewWeightHistory = buildFixtureWeightHistory(displayUnit, [
        { date: "2026-09-18", weight: 184.3 },
        { date: "2026-09-17", weight: 184.7 },
        { date: "2026-09-16", weight: 185.0 },
        { date: "2026-09-15", weight: 185.3 },
        { date: "2026-09-14", weight: 185.7 },
      ]);
      strengthSummary = {
        ...createEmptyStrengthSummary(),
        bench: {
          key: "bench",
          current_estimated_one_rep_max: 255,
          lifetime_estimated_one_rep_max: 260,
          current_tested_one_rep_max: 245,
          lifetime_tested_one_rep_max: 245,
        },
        squat: {
          key: "squat",
          current_estimated_one_rep_max: 355,
          lifetime_estimated_one_rep_max: 360,
          current_tested_one_rep_max: 335,
          lifetime_tested_one_rep_max: 335,
        },
        deadlift: {
          key: "deadlift",
          current_estimated_one_rep_max: 425,
          lifetime_estimated_one_rep_max: 430,
          current_tested_one_rep_max: 405,
          lifetime_tested_one_rep_max: 405,
        },
        total_tested: 985,
        total_estimated: 1050,
        total_current: 985,
        total_lifetime: 1050,
        thousand_club_progress_percent: 99,
        latest_pr: {
          exercise_name: "Bench Press",
          workout_date: "2026-09-18",
          estimated_one_rep_max: 260,
        },
      };
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-2.5">
      <PageHeader title="Progress" />
      {weightLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      <ProgressTabs
        key={viewParam ?? "overview"}
        overview={
          <ProgressOverview
            displayUnit={displayUnit}
            todayDate={todayDate}
            latestWeight={latestWeight}
            latestChangeLabel={latestChangeLabel}
            sevenDayAverage={sevenDayAverage}
            sevenDayAverageLabel={sevenDayAverageLabel}
            trendPoints={overviewTrendPoints}
            weightHistory={overviewWeightHistory}
            strengthSummary={strengthSummary}
            fixtureLabel={overviewFixtureLabel}
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
        initialTab={toInitialTab(viewParam)}
      />
    </div>
  );
}
