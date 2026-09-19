import Link from "next/link";

import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
import { StateChip } from "@/components/ui/state-chip";
import { TrendSparkline } from "@/components/ui/trend-sparkline";
import { getMyFoodEntriesForDate } from "@/lib/data/nutrition";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyActiveWorkout,
  getMyCompletedWorkouts,
  getMyWorkoutExercises,
  getMyStrengthHistorySetRows,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { getWeightEntries } from "@/lib/data/weight";
import { calculateDailyTotals } from "@/lib/nutrition/calculations";
import { getTodayDateString } from "@/lib/nutrition/date";
import { normalizeTimeZone } from "@/lib/timezone";
import { buildWorkoutSummaryStats, groupSetsByWorkoutExerciseId } from "@/lib/training/session";
import { computeWorkoutDayStreak } from "@/lib/training/streaks";
import { buildStrengthDashboardSummaryFromHistoryRows } from "@/lib/training/strength";
import type { TrainingWeightUnit } from "@/lib/training/types";
import { MIN_ENTRIES_FOR_PERIOD_COMPARISON, formatDeltaLabel, computeWeightMetrics, shortDateLabel } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function HomePage() {
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const [weightEntriesResult, nutritionEntriesResult, completedWorkoutsResult, activeWorkoutResult, strengthRowsResult] = await Promise.all([
    getWeightEntries(),
    getMyFoodEntriesForDate(todayDate),
    getMyCompletedWorkouts(),
    getMyActiveWorkout(),
    getMyStrengthHistorySetRows(),
  ]);
  const profileLoadError = profileResult.error?.message ?? null;
  const weightLoadError = weightEntriesResult.error?.message ?? null;
  const nutritionLoadError = nutritionEntriesResult.error?.message ?? null;
  const workoutLoadError = completedWorkoutsResult.error?.message ?? activeWorkoutResult.error?.message ?? strengthRowsResult.error?.message ?? null;

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightEntries = weightEntriesResult.data ?? [];
  const weightMetrics = computeWeightMetrics(weightEntries, displayUnit, referenceDate);
  const displayName = profileResult.data?.display_name?.trim() || null;
  const nutritionTotals = calculateDailyTotals(nutritionEntriesResult.data ?? []);

  const calorieGoal = profileResult.data?.calorie_goal ?? null;
  const currentWeight = weightMetrics.latest?.weight ?? null;
  const currentChange = formatDeltaLabel(weightMetrics.previousEntryDelta, displayUnit);
  const sevenDayAverage = weightMetrics.currentSevenDayAverage?.value ?? null;
  const sevenDayAverageChange =
    weightMetrics.canCompareSevenDayPeriods && weightMetrics.sevenDayComparisonDelta !== null
      ? formatDeltaLabel(weightMetrics.sevenDayComparisonDelta, displayUnit)
      : `Need ${MIN_ENTRIES_FOR_PERIOD_COMPARISON} weigh-ins in each week`;
  const completedWorkouts = completedWorkoutsResult.data ?? [];
  const strengthSummary = buildStrengthDashboardSummaryFromHistoryRows({
    rows: strengthRowsResult.data ?? [],
    displayUnit: displayUnit as TrainingWeightUnit,
    referenceDate,
  });

  const activeWorkout = activeWorkoutResult.data ?? null;
  const todaysCompletedWorkout = [...completedWorkouts]
    .filter((workout) => workout.workout_date === todayDate && workout.completed_at !== null)
    .sort((a, b) => Date.parse(b.completed_at ?? b.created_at) - Date.parse(a.completed_at ?? a.created_at))[0];
  const workoutCardTarget = activeWorkout ?? todaysCompletedWorkout ?? null;

  let workoutCardName = "No workout logged today";
  let workoutCardStatus = "Start a workout to begin today’s training.";
  let workoutCardActionLabel = "Start Workout";
  let workoutCardActionHref = "/training/start";
  let workoutCardExercises: number | null = null;
  let workoutCardSets: number | null = null;
  let workoutCardDurationMinutes: number | null = null;
  let workoutCardState: "active" | "completed" | "planned" | "neutral" = "planned";

  if (workoutCardTarget) {
    const workoutExercisesResult = await getMyWorkoutExercises(workoutCardTarget.id);
    const workoutExerciseIds = (workoutExercisesResult.data ?? []).map((exercise) => exercise.id);
    const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(workoutExerciseIds);
    const summary = buildWorkoutSummaryStats({
      workout: workoutCardTarget,
      exercises: workoutExercisesResult.data ?? [],
      setsByExerciseId: groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []),
      displayUnit: displayUnit as TrainingWeightUnit,
    });
    workoutCardExercises = summary.exerciseCount;
    workoutCardSets = summary.totalSetCount;
    workoutCardDurationMinutes = summary.durationMinutes;

    if (workoutCardTarget.completed_at) {
      workoutCardName = workoutCardTarget.name;
      workoutCardStatus = "Completed today";
      workoutCardState = "completed";
      workoutCardActionLabel = "Start Workout";
      workoutCardActionHref = "/training/start";
    } else {
      workoutCardName = workoutCardTarget.name;
      workoutCardStatus = "Workout in progress";
      workoutCardState = "active";
      workoutCardActionLabel = "Continue Workout";
      workoutCardActionHref = `/training/workouts/${workoutCardTarget.id}`;
    }
  }
  const calorieRemaining = calorieGoal !== null ? calorieGoal - nutritionTotals.calories : null;
  const proteinRemaining = (profileResult.data?.protein_goal ?? null) !== null
    ? (profileResult.data?.protein_goal ?? 0) - nutritionTotals.protein_g
    : null;
  const workoutStreak = computeWorkoutDayStreak(completedWorkouts, {
    timeZone: profileTimeZone,
    reference: new Date(),
  });
  const latestPr = strengthSummary.latest_pr;
  const progressTrendPoints = weightMetrics.trendChronological.slice(-7).map((entry) => ({
    label: shortDateLabel(entry.entryDate),
    value: entry.weight,
  }));

  return (
    <div className="space-y-4">
      <header className="mb-1">
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
          {displayName ? `Today Overview, ${displayName}` : "Today Overview"}
        </h1>
      </header>

      {profileLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Profile data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{profileLoadError}</p>
        </Card>
      ) : null}
      {weightLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      {nutritionLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Nutrition totals are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{nutritionLoadError}</p>
        </Card>
      ) : null}
      {workoutLoadError ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Workout data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{workoutLoadError}</p>
        </Card>
      ) : null}
      <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <WorkoutCard
          workoutName={workoutCardName}
          statusText={workoutCardStatus}
          statusState={workoutCardState}
          exercises={workoutCardExercises}
          totalSets={workoutCardSets}
          durationMinutes={workoutCardDurationMinutes}
          actionLabel={workoutCardActionLabel}
          actionHref={workoutCardActionHref}
        />
        <Card title="Daily Targets" subtitle="What matters today" variant="secondary">
          <ul className="space-y-2 text-sm">
            <li className="flex items-end justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-zinc-400">Calories</span>
              <MetricValue
                value={calorieGoal !== null ? `${nutritionTotals.calories.toFixed(0)} / ${calorieGoal.toFixed(0)}` : nutritionTotals.calories.toFixed(0)}
                unit="kcal"
                tone="secondary"
                className="text-lg"
              />
            </li>
            <li className="flex items-end justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-zinc-400">Protein</span>
              <MetricValue
                value={
                  profileResult.data?.protein_goal !== null && profileResult.data?.protein_goal !== undefined
                    ? `${nutritionTotals.protein_g.toFixed(0)} / ${profileResult.data.protein_goal.toFixed(0)}`
                    : nutritionTotals.protein_g.toFixed(0)
                }
                unit="g"
                tone="secondary"
                className="text-lg"
              />
            </li>
            <li className="flex items-end justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-zinc-400">Current body weight</span>
              <MetricValue value={currentWeight !== null ? currentWeight.toFixed(1) : "--"} unit={displayUnit} tone="secondary" className="text-lg" />
            </li>
            <li className="flex items-end justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <span className="text-zinc-400">Workout streak</span>
              <MetricValue value={String(workoutStreak)} unit={`day${workoutStreak === 1 ? "" : "s"}`} tone="secondary" className="text-lg" />
            </li>
          </ul>
          {calorieRemaining !== null || proteinRemaining !== null ? (
            <p className="mt-2 text-xs text-zinc-500">
              Remaining: {calorieRemaining !== null ? `${calorieRemaining.toFixed(0)} kcal` : "--"} •{" "}
              {proteinRemaining !== null ? `${proteinRemaining.toFixed(0)} g protein` : "--"}
            </p>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <Card title="Progress Strip" subtitle="This week at a glance" variant="secondary">
          <div className="grid gap-2">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">7-day trend</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <MetricValue value={sevenDayAverage !== null ? sevenDayAverage.toFixed(1) : "--"} unit={displayUnit} tone="secondary" className="text-base" />
                <p className="text-xs text-zinc-500">{sevenDayAverageChange}</p>
              </div>
              {progressTrendPoints.length ? <TrendSparkline points={progressTrendPoints} unit={displayUnit} /> : null}
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Latest PR</p>
              {latestPr ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StateChip state="pr" label="Recent PR" />
                  <p className="text-xs text-zinc-300">
                    {latestPr.exercise_name} • {latestPr.workout_date}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">No PR yet.</p>
              )}
            </div>
          </div>
        </Card>

        <Card title="Quick Actions" subtitle="Primary daily actions" variant="tertiary">
          <div className="grid gap-2">
            <Link
              href="/nutrition?view=add"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Add Food
            </Link>
            <Link
              href="/progress?view=weight"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/10"
            >
              Log Weight
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{currentWeight !== null ? `Current ${currentWeight.toFixed(1)} ${displayUnit} (${currentChange})` : "Log your first body-weight entry to start tracking."}</p>
        </Card>
      </section>
    </div>
  );
}
