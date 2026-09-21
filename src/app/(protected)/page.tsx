import Link from "next/link";
import { Activity, Droplets, Flame, Scale, Zap } from "lucide-react";

import { WorkoutCard } from "@/components/dashboard/workout-card";
import type { WorkoutCardPrimaryAction } from "@/components/dashboard/workout-card-primary-action";
import { Card } from "@/components/ui/card";
import { StateChip } from "@/components/ui/state-chip";
import { getMyFoodEntriesForDate } from "@/lib/data/nutrition";
import {
  getMyScheduleOverridesForRange,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
} from "@/lib/data/workout-planner";
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
import { resolveHomeTodayWorkout, formatTodayWorkoutHeadline } from "@/lib/training/home-today-workout";
import { buildPrimaryFocusLabel } from "@/lib/training/muscle-aggregation";
import { buildPlannerWeek, buildWeekDates, findPlannerDayForDate } from "@/lib/training/planner";
import { buildWorkoutSummaryStats, groupSetsByWorkoutExerciseId } from "@/lib/training/session";
import { computeWorkoutDayStreak } from "@/lib/training/streaks";
import { buildStrengthDashboardSummaryFromHistoryRows } from "@/lib/training/strength";
import type { TrainingWeightUnit } from "@/lib/training/types";
import { MIN_ENTRIES_FOR_PERIOD_COMPARISON, formatDeltaLabel, computeWeightMetrics } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

function formatMuscleFocusSummary(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/^Primary focus:\s*/i, "");
  if (!trimmed) {
    return null;
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" • ");
}

export default async function HomePage() {
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const weekDates = buildWeekDates(referenceDate);
  const todayWeekStart = weekDates[0];
  const todayWeekEnd = weekDates[weekDates.length - 1];
  const tomorrowReferenceDate = new Date(referenceDate);
  tomorrowReferenceDate.setUTCDate(referenceDate.getUTCDate() + 1);
  const tomorrowDate = tomorrowReferenceDate.toISOString().slice(0, 10);
  const tomorrowWeekDates = buildWeekDates(tomorrowReferenceDate);
  const plannerRangeStart = todayWeekStart < tomorrowWeekDates[0] ? todayWeekStart : tomorrowWeekDates[0];
  const plannerRangeEnd =
    todayWeekEnd > tomorrowWeekDates[tomorrowWeekDates.length - 1]
      ? todayWeekEnd
      : tomorrowWeekDates[tomorrowWeekDates.length - 1];

  const [
    weightEntriesResult,
    nutritionEntriesResult,
    completedWorkoutsResult,
    activeWorkoutResult,
    strengthRowsResult,
    templatesResult,
    templateExercisesResult,
    weekdayScheduleResult,
    scheduleOverridesResult,
  ] = await Promise.all([
    getWeightEntries(),
    getMyFoodEntriesForDate(todayDate),
    getMyCompletedWorkouts(),
    getMyActiveWorkout(),
    getMyStrengthHistorySetRows(),
    getMyWorkoutTemplates(),
    getMyWorkoutTemplateExercises(),
    getMyWeekdaySchedule(),
    getMyScheduleOverridesForRange(plannerRangeStart, plannerRangeEnd),
  ]);
  const profileLoadError = profileResult.error?.message ?? null;
  const weightLoadError = weightEntriesResult.error?.message ?? null;
  const nutritionLoadError = nutritionEntriesResult.error?.message ?? null;
  let workoutLoadError =
    completedWorkoutsResult.error?.message ??
    activeWorkoutResult.error?.message ??
    strengthRowsResult.error?.message ??
    templatesResult.error?.message ??
    templateExercisesResult.error?.message ??
    weekdayScheduleResult.error?.message ??
    scheduleOverridesResult.error?.message ??
    null;

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightEntries = weightEntriesResult.data ?? [];
  const weightMetrics = computeWeightMetrics(weightEntries, displayUnit, referenceDate);
  const displayName = profileResult.data?.display_name?.trim() || null;
  const nutritionTotals = calculateDailyTotals(nutritionEntriesResult.data ?? []);

  const calorieGoal = profileResult.data?.calorie_goal ?? null;
  const currentWeight = weightMetrics.latest?.weight ?? null;
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
  const completedPlannerRangeWorkouts = completedWorkouts
    .filter((workout) => workout.completed_at !== null)
    .filter((workout) => workout.workout_date >= plannerRangeStart && workout.workout_date <= plannerRangeEnd)
    .map((workout) => ({
      id: workout.id,
      workout_date: workout.workout_date,
      name: workout.name,
    }));
  const plannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: completedPlannerRangeWorkouts,
    referenceDate,
  });
  const tomorrowPlannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: completedPlannerRangeWorkouts,
    referenceDate: tomorrowReferenceDate,
  });

  const todayPlan = findPlannerDayForDate(plannerWeek, todayDate);
  const tomorrowPlan = findPlannerDayForDate(tomorrowPlannerWeek, tomorrowDate);
  const plannerUninitialized = (templatesResult.data ?? []).length === 0 && plannerWeek.every((day) => day.status === "none");
  const weekdayLabel = todayPlan?.weekday_label ?? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(referenceDate);
  const resolvedTodayWorkout = resolveHomeTodayWorkout({
    todayDate,
    weekdayLabel,
    todayPlan,
    activeWorkout: activeWorkout
      ? {
          id: activeWorkout.id,
          name: activeWorkout.name,
          workout_date: activeWorkout.workout_date,
        }
      : null,
    todaysCompletedWorkout: todaysCompletedWorkout
      ? {
          id: todaysCompletedWorkout.id,
          name: todaysCompletedWorkout.name,
          workout_date: todaysCompletedWorkout.workout_date,
        }
      : null,
    plannerUninitialized,
  });

  let workoutCardTarget: typeof activeWorkout | typeof todaysCompletedWorkout | null = null;
  if (resolvedTodayWorkout.state === "active" && activeWorkout && resolvedTodayWorkout.workoutId === activeWorkout.id) {
    workoutCardTarget = activeWorkout;
  } else if (resolvedTodayWorkout.state === "completed" && todaysCompletedWorkout && resolvedTodayWorkout.workoutId === todaysCompletedWorkout.id) {
    workoutCardTarget = todaysCompletedWorkout;
  }

  const workoutCardName = formatTodayWorkoutHeadline(resolvedTodayWorkout);
  let workoutCardStatus = "Open your program to plan today.";
  let workoutCardPrimaryAction: WorkoutCardPrimaryAction | null = {
    kind: "link",
    label: "View Program",
    href: "/training?view=program",
  };
  let workoutCardSecondaryActionLabel: string | undefined = "Program";
  let workoutCardSecondaryActionHref: string | undefined = "/training?view=program";
  let workoutCardExercises: number | null = null;
  let workoutCardSets: number | null = null;
  let workoutCardDurationMinutes: number | null = null;
  let workoutCardState: "active" | "completed" | "planned" | "neutral" = "neutral";

  if (workoutCardTarget) {
    const workoutExercisesResult = await getMyWorkoutExercises(workoutCardTarget.id);
    const workoutExerciseIds = (workoutExercisesResult.data ?? []).map((exercise) => exercise.id);
    const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(workoutExerciseIds);
    workoutLoadError = workoutLoadError ?? workoutExercisesResult.error?.message ?? workoutSetsResult.error?.message ?? null;
    const summary = buildWorkoutSummaryStats({
      workout: workoutCardTarget,
      exercises: workoutExercisesResult.data ?? [],
      setsByExerciseId: groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []),
      displayUnit: displayUnit as TrainingWeightUnit,
    });
    workoutCardExercises = summary.exerciseCount;
    workoutCardSets = summary.totalSetCount;
    workoutCardDurationMinutes = summary.durationMinutes;
  }

  if (resolvedTodayWorkout.state === "scheduled") {
    const focus = formatMuscleFocusSummary(todayPlan ? buildPrimaryFocusLabel(todayPlan.muscle_targeting, 3) : null);
    workoutCardStatus = focus ?? "Scheduled for today";
    workoutCardState = "planned";
    workoutCardExercises = todayPlan?.exercise_count ?? null;
    workoutCardSets = null;
    workoutCardDurationMinutes = todayPlan?.estimated_duration_minutes ?? null;
    workoutCardPrimaryAction = todayPlan?.template_id
      ? {
          kind: "start-scheduled",
          label: "Start Workout",
        }
      : {
          kind: "link",
          label: "View Program",
          href: "/training?view=program",
        };
  } else if (resolvedTodayWorkout.state === "active") {
    workoutCardStatus = "Workout in progress";
    workoutCardState = "active";
    if (resolvedTodayWorkout.workoutId) {
      workoutCardPrimaryAction = {
        kind: "link",
        label: "Resume Workout",
        href: `/training/workouts/${resolvedTodayWorkout.workoutId}`,
      };
    }
  } else if (resolvedTodayWorkout.state === "completed") {
    workoutCardStatus = "Completed ✓";
    workoutCardState = "completed";
    workoutCardPrimaryAction = resolvedTodayWorkout.workoutId
      ? {
          kind: "link",
          label: "View Summary",
          href: `/training/workouts/${resolvedTodayWorkout.workoutId}`,
        }
      : {
          kind: "link",
          label: "View History",
          href: "/training?view=history",
        };
  } else if (resolvedTodayWorkout.state === "rest") {
    const nextScheduled = tomorrowPlan?.status === "scheduled" && tomorrowPlan.template_name ? `Next: ${tomorrowPlan.template_name} tomorrow` : null;
    workoutCardStatus = nextScheduled ? `Recovery day • ${nextScheduled}` : "Recovery day";
  } else if (resolvedTodayWorkout.state === "skipped") {
    workoutCardStatus = "Skipped for today";
  } else if (resolvedTodayWorkout.state === "moved") {
    workoutCardStatus = "Moved to another day";
  } else if (resolvedTodayWorkout.state === "no_program") {
    workoutCardStatus = "Choose a plan to populate your schedule.";
    workoutCardPrimaryAction = {
      kind: "link",
      label: "Choose a Plan",
      href: "/training?view=plans",
    };
    workoutCardSecondaryActionLabel = undefined;
    workoutCardSecondaryActionHref = undefined;
  } else {
    workoutCardStatus = "No workout scheduled for today.";
  }
  const workoutStreak = computeWorkoutDayStreak(completedWorkouts, {
    timeZone: profileTimeZone,
    reference: new Date(),
  });
  const latestPr = strengthSummary.latest_pr;
  return (
    <div className="mx-auto w-full max-w-[760px] space-y-2">
      <header>
        <h1 className="text-[15px] font-semibold tracking-tight text-white">
          {displayName ? `Today, ${displayName}` : "Today Overview"}
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
      <WorkoutCard
        workoutName={workoutCardName}
        statusText={workoutCardStatus}
        statusState={workoutCardState}
        exercises={workoutCardExercises}
        totalSets={workoutCardSets}
        durationMinutes={workoutCardDurationMinutes}
        primaryAction={workoutCardPrimaryAction}
        secondaryActionLabel={workoutCardSecondaryActionLabel}
        secondaryActionHref={workoutCardSecondaryActionHref}
      />

      <section>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Daily Targets</p>
        <div className="grid grid-cols-2 gap-2">
        <article className="min-h-[102px] rounded-xl border border-[#87a3ff]/25 bg-gradient-to-b from-[#111b34] to-[#0d1323] p-2 shadow-[var(--ds-shadow-sm)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <span>Calories</span>
            <Flame className="h-3.5 w-3.5 text-[#87a3ff]" aria-hidden="true" />
          </div>
          <p data-testid="home-calories-value" className="mt-0.5 text-[15px] font-semibold text-white">
            {nutritionTotals.calories.toFixed(0)}
            <span className="text-xs text-zinc-400"> / {calorieGoal?.toFixed(0) ?? "--"} kcal</span>
          </p>
        </article>

        <article className="min-h-[102px] rounded-xl border border-[#87a3ff]/25 bg-gradient-to-b from-[#111b34] to-[#0d1323] p-2 shadow-[var(--ds-shadow-sm)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <span>Protein</span>
            <Droplets className="h-3.5 w-3.5 text-[#87a3ff]" aria-hidden="true" />
          </div>
          <p data-testid="home-protein-value" className="mt-0.5 text-[15px] font-semibold text-white">
            {nutritionTotals.protein_g.toFixed(0)}
            <span className="text-xs text-zinc-400"> / {profileResult.data?.protein_goal?.toFixed(0) ?? "--"} g</span>
          </p>
        </article>

        <article className="min-h-[102px] rounded-xl border border-[#87a3ff]/25 bg-gradient-to-b from-[#111b34] to-[#0d1323] p-2 shadow-[var(--ds-shadow-sm)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <span>Weight</span>
            <Scale className="h-3.5 w-3.5 text-[#87a3ff]" aria-hidden="true" />
          </div>
          <p data-testid="home-weight-value" className="mt-0.5 text-[15px] font-semibold text-white">
            {currentWeight !== null ? currentWeight.toFixed(1) : "--"}
            <span className="text-xs text-zinc-400"> {displayUnit}</span>
          </p>
          <Link
            href="/progress?view=weight"
            className="mt-1 inline-flex h-6 items-center justify-center rounded-md border border-white/15 px-2 text-[10px] font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Log Weight
          </Link>
        </article>

        <article className="min-h-[102px] rounded-xl border border-[#87a3ff]/25 bg-gradient-to-b from-[#111b34] to-[#0d1323] p-2 shadow-[var(--ds-shadow-sm)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-zinc-400">
            <span>Workout Streak</span>
            <Zap className="h-3.5 w-3.5 text-[#87a3ff]" aria-hidden="true" />
          </div>
          <p data-testid="home-streak-value" className="mt-0.5 text-[15px] font-semibold text-white">{workoutStreak}d</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">Daily consistency</p>
        </article>
        </div>
      </section>

      <section>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Progress This Week</p>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">7D Weight Trend</p>
            <p data-testid="home-trend-value" className="text-sm font-semibold text-zinc-100">
              {sevenDayAverage !== null ? `${sevenDayAverage.toFixed(1)} ${displayUnit}` : "--"}
            </p>
            <p data-testid="home-trend-context" className="text-[11px] text-zinc-500">{sevenDayAverageChange}</p>
          </div>
          <div className="text-right">
            <StateChip state="pr" label="Latest PR" className="text-[10px]" />
            <p data-testid="home-latest-pr" className="mt-0.5 max-w-[116px] truncate text-[11px] text-zinc-300">{latestPr ? latestPr.exercise_name : "--"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link
          href="/nutrition?view=add"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Add Food
        </Link>
        <Link
          href="/progress"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/10"
        >
          <Activity className="h-4 w-4 text-[#87a3ff]" aria-hidden="true" />
          View Progress
        </Link>
      </section>
    </div>
  );
}
