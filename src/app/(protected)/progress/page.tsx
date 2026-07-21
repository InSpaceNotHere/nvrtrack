import { ProgressTabs } from "@/components/progress/progress-tabs";
import { ProgressPhotoManager } from "@/components/progress/progress-photo-manager";
import { BodyMeasurementManager } from "@/components/progress/body-measurement-manager";
import { WeeklyJournalManager } from "@/components/progress/weekly-journal-manager";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { WeightChart } from "@/components/weight/weight-chart";
import { getMyBodyMeasurementEntries } from "@/lib/data/body-measurements";
import { getMyProfile } from "@/lib/data/profile";
import { getMyProgressPhotoDates, getMyProgressPhotoPage } from "@/lib/data/progress-photos";
import { getMyWeeklyJournalEntries } from "@/lib/data/weekly-journal";
import { getMyWorkoutExercisesForWorkoutIds, getMyWorkouts, getWorkoutSetsForWorkoutExerciseIds } from "@/lib/data/workouts";
import { buildStrengthDashboardSummary } from "@/lib/training/strength";
import { groupSetsByWorkoutExerciseId } from "@/lib/training/session";
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
  profileTimeZone: string;
  latestWeight: number | null;
  latestChangeLabel: string;
  sevenDayAverage: number | null;
  sevenDayAverageLabel: string;
  trendPoints: { label: string; value: number }[];
  weightHistory: ReturnType<typeof computeWeightMetrics>["historyNewestFirst"];
  strengthSummary: ReturnType<typeof buildStrengthDashboardSummary>;
}

function ProgressOverview({
  displayUnit,
  todayDate,
  profileTimeZone,
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
        <WeightLogManager
          entries={weightHistory}
          displayUnit={displayUnit}
          showHistory
          initialEntryDate={todayDate}
          timeZone={profileTimeZone}
        />
      </Card>

      <Card title="Weight Chart" subtitle="Range filters + trend line">
        <WeightChart entries={weightHistory} unit={displayUnit} />
      </Card>

      <section className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <Card title="Live Strength System">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Bench</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {strengthSummary.bench.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Squat</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {strengthSummary.squat.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Deadlift</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {strengthSummary.deadlift.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Total</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {strengthSummary.total_current?.toFixed(1) ?? "--"} {displayUnit}
              </p>
              <p className="text-[11px] text-zinc-500">
                1000 LB Club {strengthSummary.thousand_club_progress_percent?.toFixed(0) ?? 0}%
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

        <Card title="Exercise History">
          {strengthSummary.exercise_snapshots.length ? (
            <ul className="space-y-2">
              {strengthSummary.exercise_snapshots.slice(0, 8).map((snapshot) => (
                <li key={snapshot.exercise_key} className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100">{snapshot.exercise_name}</p>
                    {snapshot.has_recent_pr ? (
                      <span className="rounded-full border border-[#87a3ff]/60 bg-[#87a3ff]/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#bfd0ff]">
                        Recent PR
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    1RM {snapshot.current_estimated_one_rep_max?.toFixed(1) ?? "--"} • Lifetime{" "}
                    {snapshot.lifetime_estimated_one_rep_max?.toFixed(1) ?? "--"} • Heaviest{" "}
                    {snapshot.heaviest_weight?.toFixed(1) ?? "--"} • Rep PR {snapshot.rep_pr ?? "--"}
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
  const [profileResult, weightEntriesResult, workoutsResult, progressPhotosPageResult, progressPhotoDatesResult, measurementEntriesResult, journalEntriesResult] =
    await Promise.all([
      getMyProfile(),
      getWeightEntries(),
      getMyWorkouts(),
      getMyProgressPhotoPage(0, 24),
      getMyProgressPhotoDates(),
      getMyBodyMeasurementEntries(),
      getMyWeeklyJournalEntries(),
    ]);
  const workouts = workoutsResult.data ?? [];
  const workoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(workouts.map((workout) => workout.id));
  const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(
    (workoutExercisesResult.data ?? []).map((exercise) => exercise.id),
  );

  const weightLoadError =
    weightEntriesResult.error?.message ??
    profileResult.error?.message ??
    workoutsResult.error?.message ??
    workoutExercisesResult.error?.message ??
    workoutSetsResult.error?.message ??
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
  const strengthSummary = buildStrengthDashboardSummary({
    workouts,
    exercises: workoutExercisesResult.data ?? [],
    setsByExerciseId: groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []),
    displayUnit,
    referenceDate,
  });

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
            todayDate={todayDate}
            profileTimeZone={profileTimeZone}
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
