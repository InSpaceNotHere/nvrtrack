import { MacroSummary } from "@/components/dashboard/macro-summary";
import { TodaysWorkoutPlannerCard } from "@/components/dashboard/todays-workout-planner-card";
import { WeightSummary } from "@/components/dashboard/weight-summary";
import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { getMyFoodEntriesForDate, getMyRecentFoodEntries } from "@/lib/data/nutrition";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyScheduleOverridesForRange,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
  initializePlannerDefaultsIfNeeded,
} from "@/lib/data/workout-planner";
import {
  getMyWorkoutExercises,
  getMyWorkoutExercisesForWorkoutIds,
  getMyWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { getWeightEntries } from "@/lib/data/weight";
import { calculateDailyTotals } from "@/lib/nutrition/calculations";
import { getTodayDateString } from "@/lib/nutrition/date";
import { buildPlannerWeek, buildWeekDates, findPlannerDayForDate } from "@/lib/training/planner";
import { buildWorkoutSummaryStats, groupSetsByWorkoutExerciseId, selectMostRecentActiveWorkout } from "@/lib/training/session";
import { computeWorkoutDayStreak, computeWorkoutWeeklyStreak } from "@/lib/training/streaks";
import { buildStrengthDashboardSummary } from "@/lib/training/strength";
import type { TrainingWeightUnit } from "@/lib/training/types";
import { MIN_ENTRIES_FOR_PERIOD_COMPARISON, formatDeltaLabel, computeWeightMetrics, shortDateLabel } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";
import { MACRO_STATS } from "@/lib/sample-data";
import type { MacroStat } from "@/types/fitness";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function HomePage() {
  await initializePlannerDefaultsIfNeeded();
  const todayDate = getTodayDateString();
  const [profileResult, weightEntriesResult, nutritionEntriesResult, recentFoodEntriesResult, workoutsResult] = await Promise.all([
    getMyProfile(),
    getWeightEntries(),
    getMyFoodEntriesForDate(todayDate),
    getMyRecentFoodEntries(6),
    getMyWorkouts(),
  ]);
  const profileLoadError = profileResult.error?.message ?? null;
  const weightLoadError = weightEntriesResult.error?.message ?? null;
  const nutritionLoadError = nutritionEntriesResult.error?.message ?? null;
  const workoutLoadError = workoutsResult.error?.message ?? null;
  const recentFoodError = recentFoodEntriesResult.error?.message ?? null;

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightEntries = weightEntriesResult.data ?? [];
  const weightMetrics = computeWeightMetrics(weightEntries, displayUnit);
  const displayName = profileResult.data?.display_name?.trim() || null;
  const nutritionTotals = calculateDailyTotals(nutritionEntriesResult.data ?? []);

  const calorieGoal = profileResult.data?.calorie_goal ?? null;
  const macroGoals: Record<MacroStat["name"], number | null> = {
    Protein: profileResult.data?.protein_goal ?? null,
    Carbohydrates: profileResult.data?.carbohydrate_goal ?? null,
    Fat: profileResult.data?.fat_goal ?? null,
  };
  const macroConsumed: Record<MacroStat["name"], number> = {
    Protein: nutritionTotals.protein_g,
    Carbohydrates: nutritionTotals.carbohydrate_g,
    Fat: nutritionTotals.fat_g,
  };
  const macroStats: MacroStat[] = MACRO_STATS.map((macro) => ({
    ...macro,
    consumed: macroConsumed[macro.name],
    goal: macroGoals[macro.name],
  }));

  const currentWeight = weightMetrics.latest?.weight ?? null;
  const currentChange = formatDeltaLabel(weightMetrics.previousEntryDelta, displayUnit);
  const sevenDayAverage = weightMetrics.currentSevenDayAverage?.value ?? null;
  const sevenDayAverageChange =
    weightMetrics.canCompareSevenDayPeriods && weightMetrics.sevenDayComparisonDelta !== null
      ? formatDeltaLabel(weightMetrics.sevenDayComparisonDelta, displayUnit)
      : `Comparison unavailable (need ${MIN_ENTRIES_FOR_PERIOD_COMPARISON} entries in each seven-day period)`;
  const trend = weightMetrics.trendChronological.slice(-7).map((entry) => ({
    label: shortDateLabel(entry.entryDate),
    value: entry.weight,
  }));

  const workouts = workoutsResult.data ?? [];
  const workoutIds = workouts.map((workout) => workout.id);
  const allWorkoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(workoutIds);
  const allWorkoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(
    (allWorkoutExercisesResult.data ?? []).map((exercise) => exercise.id),
  );
  const strengthSummary = buildStrengthDashboardSummary({
    workouts,
    exercises: allWorkoutExercisesResult.data ?? [],
    setsByExerciseId: groupSetsByWorkoutExerciseId(allWorkoutSetsResult.data ?? []),
    displayUnit: displayUnit as TrainingWeightUnit,
  });

  const weekDates = buildWeekDates(new Date());
  const [templatesResult, templateExercisesResult, weekdayScheduleResult, scheduleOverridesResult] = await Promise.all([
    getMyWorkoutTemplates(),
    getMyWorkoutTemplateExercises(),
    getMyWeekdaySchedule(),
    getMyScheduleOverridesForRange(weekDates[0], weekDates[6]),
  ]);
  const plannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: workouts
      .filter((workout) => workout.completed_at !== null)
      .map((workout) => ({ id: workout.id, workout_date: workout.workout_date, name: workout.name })),
  });
  const todayPlan = findPlannerDayForDate(plannerWeek, todayDate);

  const activeWorkout = selectMostRecentActiveWorkout(workouts);
  const todaysCompletedWorkout = [...workouts]
    .filter((workout) => workout.workout_date === todayDate && workout.completed_at !== null)
    .sort((a, b) => Date.parse(b.completed_at ?? b.created_at) - Date.parse(a.completed_at ?? a.created_at))[0];
  const workoutCardTarget = activeWorkout ?? todaysCompletedWorkout ?? null;

  let workoutCardName = "No workout logged today";
  let workoutCardStatus = "Start a workout to begin today’s training.";
  let workoutCardActionLabel = "Start Workout";
  let workoutCardActionHref = "/training/start";
  let workoutCardExercises: number | null = null;
  let workoutCardSets: number | null = null;

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

    if (workoutCardTarget.completed_at) {
      workoutCardName = workoutCardTarget.name;
      workoutCardStatus = "Completed today";
      workoutCardActionLabel = "View Workout";
      workoutCardActionHref = `/training/workouts/${workoutCardTarget.id}?view=summary`;
    } else {
      workoutCardName = workoutCardTarget.name;
      workoutCardStatus = "Workout in progress";
      workoutCardActionLabel = "Continue Workout";
      workoutCardActionHref = `/training/workouts/${workoutCardTarget.id}`;
    }
  }
  const calorieRemaining = calorieGoal !== null ? calorieGoal - nutritionTotals.calories : null;
  const proteinRemaining = (profileResult.data?.protein_goal ?? null) !== null
    ? (profileResult.data?.protein_goal ?? 0) - nutritionTotals.protein_g
    : null;
  const workoutStreak = computeWorkoutDayStreak(workouts, todayDate);
  const weeklyStreak = computeWorkoutWeeklyStreak(workouts, todayDate);

  const recentActivities = [
    ...(workouts
      .filter((workout) => workout.completed_at !== null)
      .slice(0, 2)
      .map((workout) => ({
        id: `workout-${workout.id}`,
        label: `Completed workout: ${workout.name}`,
        date: workout.workout_date,
      }))),
    ...(weightMetrics.historyNewestFirst.slice(0, 2).map((entry) => ({
      id: `weight-${entry.id}`,
      label: `Logged weight: ${entry.weight.toFixed(1)} ${displayUnit}`,
      date: entry.entryDate,
    }))),
    ...((recentFoodEntriesResult.data ?? []).slice(0, 2).map((entry) => ({
      id: `food-${entry.id}`,
      label: `Logged meal: ${entry.food_name} (${Math.round((entry.calories_per_serving ?? 0) * (entry.servings ?? 1))} kcal)`,
      date: entry.entry_date,
    }))),
  ]
    .sort((left, right) => (left.date < right.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <header className="mb-1">
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
          {displayName ? `Today Overview, ${displayName}` : "Today Overview"}
        </h1>
      </header>

      {profileLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Profile data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{profileLoadError}</p>
        </Card>
      ) : null}
      {weightLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      {nutritionLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Nutrition totals are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{nutritionLoadError}</p>
        </Card>
      ) : null}
      {workoutLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Workout data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{workoutLoadError}</p>
        </Card>
      ) : null}
      {recentFoodError ? (
        <Card>
          <p className="text-sm text-rose-200">Recent meals are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{recentFoodError}</p>
        </Card>
      ) : null}

      <Card title="Calories" subtitle="Today">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
              {nutritionTotals.calories.toLocaleString()}
              <span className="text-xl text-zinc-400">
                {" / "}
                {calorieGoal !== null ? calorieGoal.toLocaleString() : "--"}
              </span>
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-zinc-500">
              Daily intake from nutrition log entries
            </p>
            {calorieGoal === null ? (
              <p className="mt-1 text-xs text-zinc-500">Set a calorie goal in Profile to activate progress.</p>
            ) : null}
          </div>
          {calorieGoal !== null ? (
            <CalorieRing consumed={nutritionTotals.calories} goal={calorieGoal} size={108} />
          ) : (
            <div className="flex h-[108px] w-[108px] items-center justify-center rounded-full border border-white/10 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
              Goal not set
            </div>
          )}
        </div>
        <div className="mt-3">
          {calorieGoal !== null ? (
            <ProgressBar value={nutritionTotals.calories} max={calorieGoal} />
          ) : (
            <div className="h-2 w-full rounded-full bg-white/8" aria-hidden="true" />
          )}
        </div>
        <div className="mt-3 border-t border-white/8 pt-3">
          <MacroSummary macros={macroStats} />
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <WeightSummary
          currentWeight={currentWeight}
          currentChange={currentChange}
          sevenDayAverage={sevenDayAverage}
          averageChange={sevenDayAverageChange}
          trend={trend}
          unit={displayUnit}
        />
        <WorkoutCard
          workoutName={workoutCardName}
          statusText={workoutCardStatus}
          exercises={workoutCardExercises}
          totalSets={workoutCardSets}
          actionLabel={workoutCardActionLabel}
          actionHref={workoutCardActionHref}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Strength Dashboard">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Bench</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {strengthSummary.bench.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Squat</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {strengthSummary.squat.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Current Deadlift</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {strengthSummary.deadlift.current_estimated_one_rep_max?.toFixed(1) ?? "--"} {displayUnit}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {strengthSummary.total_current?.toFixed(1) ?? "--"} {displayUnit}
              </p>
              <p className="text-[11px] text-zinc-500">1000 LB Club {strengthSummary.thousand_club_progress_percent?.toFixed(0) ?? 0}%</p>
            </div>
          </div>
          {strengthSummary.latest_pr ? (
            <p className="mt-2 text-xs text-zinc-400">
              Latest PR: {strengthSummary.latest_pr.exercise_name} • {strengthSummary.latest_pr.workout_date}
            </p>
          ) : null}
        </Card>
        <TodaysWorkoutPlannerCard todayPlan={todayPlan} templateExercises={templateExercisesResult.data ?? []} />
      </section>

      <Card title="Quick Weight Entry" subtitle="Live body-weight logging">
        <WeightLogManager entries={weightMetrics.historyNewestFirst} displayUnit={displayUnit} showHistory={false} />
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Dashboard Signals">
          <ul className="space-y-2 text-sm">
            <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              Calories remaining:{" "}
              <span className="font-semibold text-white">{calorieRemaining !== null ? calorieRemaining.toFixed(0) : "--"}</span>
            </li>
            <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              Protein remaining:{" "}
              <span className="font-semibold text-white">{proteinRemaining !== null ? proteinRemaining.toFixed(0) : "--"} g</span>
            </li>
            <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              Workout streak: <span className="font-semibold text-white">{workoutStreak} day{workoutStreak === 1 ? "" : "s"}</span>
            </li>
            <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              Weekly streak: <span className="font-semibold text-white">{weeklyStreak} week{weeklyStreak === 1 ? "" : "s"}</span>
            </li>
          </ul>
        </Card>
        <Card title="Recent Meals">
          {(recentFoodEntriesResult.data ?? []).length ? (
            <ul className="space-y-2">
              {(recentFoodEntriesResult.data ?? []).slice(0, 5).map((entry) => (
                <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-sm font-medium text-zinc-100">{entry.food_name}</p>
                  <p className="text-xs text-zinc-500">
                    {entry.meal_type} • {Math.round((entry.calories_per_serving ?? 0) * (entry.servings ?? 1))} kcal • {entry.entry_date}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No recent meals logged.</p>
          )}
        </Card>
      </section>

      <Card title="Recent Activity">
        {recentActivities.length ? (
          <ul className="space-y-2">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-sm text-zinc-100">{activity.label}</p>
                <p className="text-xs text-zinc-500">{activity.date}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No recent activity yet.</p>
        )}
      </Card>
    </div>
  );
}
