import Link from "next/link";

import { WorkoutPlanner } from "@/components/training/workout-planner";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import { getExerciseCatalog } from "@/lib/data/exercise-catalog";
import { getMyExercises } from "@/lib/data/exercises";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyScheduleOverridesForRange,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
} from "@/lib/data/workout-planner";
import {
  getMyActiveWorkout,
  getMyCompletedWorkouts,
  getMyWorkoutExercisesForWorkoutIds,
  getMyRecentWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { sortWorkoutsForHistory } from "@/lib/training/calculations";
import { buildWeekDates, buildPlannerWeek, findPlannerDayForDate } from "@/lib/training/planner";
import { formatCalendarDate, getDateStringInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import {
  buildWorkoutSummaryStats,
  groupSetsByWorkoutExerciseId,
} from "@/lib/training/session";
import type { WorkoutExerciseRow } from "@/lib/training/types";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): "lb" | "kg" {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

function formatDate(date: string): string {
  return formatCalendarDate(date);
}

export default async function TrainingPage() {
  const [activeWorkoutResult, recentWorkoutsResult, profileResult] = await Promise.all([
    getMyActiveWorkout(),
    getMyRecentWorkouts(5),
    getMyProfile(),
  ]);
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getDateStringInTimeZone(profileTimeZone, new Date());
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const weekDates = buildWeekDates(referenceDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const completedWeekWorkoutsResult = await getMyCompletedWorkouts({ startDate: weekStart, endDate: weekEnd });
  const recentWorkouts = sortWorkoutsForHistory(recentWorkoutsResult.data ?? []);
  const activeWorkout = activeWorkoutResult.data ?? null;
  const completedThisWeek = completedWeekWorkoutsResult.data?.length ?? 0;
  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const workoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(recentWorkouts.map((workout) => workout.id));
  const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(
    (workoutExercisesResult.data ?? []).map((exercise) => exercise.id),
  );

  const setsByExerciseId = groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []);
  const exercisesByWorkoutId = new Map<string, WorkoutExerciseRow[]>();
  for (const exercise of workoutExercisesResult.data ?? []) {
    const list = exercisesByWorkoutId.get(exercise.workout_id);
    if (list) {
      list.push(exercise);
    } else {
      exercisesByWorkoutId.set(exercise.workout_id, [exercise]);
    }
  }

  const [templatesResult, templateExercisesResult, weekdayScheduleResult, scheduleOverridesResult, catalogResult, customExercisesResult] =
    await Promise.all([
      getMyWorkoutTemplates(),
      getMyWorkoutTemplateExercises(),
      getMyWeekdaySchedule(),
      getMyScheduleOverridesForRange(weekStart, weekEnd),
      getExerciseCatalog({ limit: 400 }),
      getMyExercises(),
    ]);
  const plannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: (completedWeekWorkoutsResult.data ?? []).map((workout) => ({
      id: workout.id,
      workout_date: workout.workout_date,
      name: workout.name,
    })),
  });
  const todayPlan = findPlannerDayForDate(plannerWeek, todayDate);
  const plannerExerciseOptions = [
    ...(catalogResult.data ?? []).map((exercise) => ({
      id: `catalog:${exercise.id}`,
      name: exercise.name,
      catalog_exercise_id: exercise.id,
      exercise_id: null,
      primary_muscles: exercise.primary_muscles ?? [],
      secondary_muscles: exercise.secondary_muscles ?? [],
      body_region: exercise.body_region ?? null,
      movement_pattern: exercise.movement_pattern ?? null,
    })),
    ...(customExercisesResult.data ?? []).map((exercise) => ({
      id: `custom:${exercise.id}`,
      name: exercise.name,
      catalog_exercise_id: null,
      exercise_id: exercise.id,
      primary_muscles: exercise.primary_muscles ?? [],
      secondary_muscles: exercise.secondary_muscles ?? [],
      body_region: exercise.body_region ?? null,
      movement_pattern: exercise.movement_pattern ?? null,
    })),
  ];

  const dataErrorMessage =
    activeWorkoutResult.error?.message ??
    recentWorkoutsResult.error?.message ??
    completedWeekWorkoutsResult.error?.message ??
    workoutExercisesResult.error?.message ??
    workoutSetsResult.error?.message ??
    templatesResult.error?.message ??
    templateExercisesResult.error?.message ??
    weekdayScheduleResult.error?.message ??
    scheduleOverridesResult.error?.message ??
    catalogResult.error?.message ??
    customExercisesResult.error?.message ??
    profileResult.error?.message ??
    null;

  return (
    <div className="space-y-4">
      <PageHeader title="Training" subtitle="Live workout tracking and history." />

      {dataErrorMessage ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Training data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{dataErrorMessage}</p>
        </Card>
      ) : null}

      <WorkoutPlanner
        templates={templatesResult.data ?? []}
        templateExercises={templateExercisesResult.data ?? []}
        weekPlans={plannerWeek}
        todayPlan={todayPlan}
        exerciseOptions={plannerExerciseOptions}
        activeWorkout={
          activeWorkout
            ? { id: activeWorkout.id, name: activeWorkout.name, workout_date: activeWorkout.workout_date }
            : null
        }
        completedThisWeek={completedThisWeek}
      />

      <Card title="History" subtitle="Recent sessions" variant="tertiary">
        <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">Recent Workouts</summary>
          <ul className="mt-2 space-y-1.5">
            {recentWorkouts.map((workout) => {
              const workoutExercises = exercisesByWorkoutId.get(workout.id) ?? [];
              const summary = buildWorkoutSummaryStats({
                workout,
                exercises: workoutExercises,
                setsByExerciseId,
                displayUnit,
              });

              return (
                <li key={workout.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{workout.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StateChip state={workout.completed_at ? "completed" : "active"} label={workout.completed_at ? "Completed" : "In progress"} />
                        <p className="text-xs text-zinc-500">{formatDate(workout.workout_date)}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {summary.exerciseCount} exercises • {summary.completedSetCount}/{summary.totalSetCount} sets complete
                      </p>
                    </div>
                    <Link
                      href={`/training/workouts/${workout.id}`}
                      className="inline-flex h-7 items-center justify-center rounded-md border border-white/15 px-2 text-[11px] font-medium text-zinc-100 transition-colors hover:bg-white/10"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/training/history"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Full Workout History
            </Link>
            <Link
              href="/training/exercises"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Browse Exercise Catalog
            </Link>
          </div>
        </details>
      </Card>
    </div>
  );
}
