import Link from "next/link";

import { MuscleMap } from "@/components/training/muscle-map";
import { WorkoutPlanner } from "@/components/training/workout-planner";
import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
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
import { aggregateWorkoutMuscles, buildPrimaryFocusLabel } from "@/lib/training/muscle-aggregation";
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

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
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
  const recentExerciseSnapshots: Array<{
    name: string;
    source: string;
  }> = [];
  const seenRecentExerciseName = new Set<string>();
  for (const exercise of workoutExercisesResult.data ?? []) {
    const list = exercisesByWorkoutId.get(exercise.workout_id);
    if (list) {
      list.push(exercise);
    } else {
      exercisesByWorkoutId.set(exercise.workout_id, [exercise]);
    }

    const normalizedName = exercise.exercise_name.trim().toLowerCase();
    if (!seenRecentExerciseName.has(normalizedName) && recentExerciseSnapshots.length < 8) {
      seenRecentExerciseName.add(normalizedName);
      const catalogSource = (exercise as WorkoutExerciseRow & { catalog_exercise_id?: string | null }).catalog_exercise_id;
      recentExerciseSnapshots.push({
        name: exercise.exercise_name,
        source: catalogSource ? "Catalog" : exercise.exercise_id ? "Custom library" : "Custom snapshot",
      });
    }
  }

  const previewWorkout = activeWorkout ?? recentWorkouts[0] ?? null;
  const previewWorkoutExercises = previewWorkout ? exercisesByWorkoutId.get(previewWorkout.id) ?? [] : [];
  const previewWorkoutTargeting = aggregateWorkoutMuscles(
    previewWorkoutExercises.map((exercise) => ({
      exercise_id: exercise.id,
      exercise_name: exercise.exercise_name,
      primary_muscles: exercise.source_primary_muscles ?? [],
      secondary_muscles: exercise.source_secondary_muscles ?? [],
    })),
  );
  const previewFocusLabel = buildPrimaryFocusLabel(previewWorkoutTargeting);
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
  const hasWorkouts = recentWorkouts.length > 0 || activeWorkout !== null;

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
      />

      {!hasWorkouts ? (
        <Card title="Start Your First Workout" variant="primary">
          <p className="text-sm text-zinc-300">No workouts logged yet. Create a workout and begin adding exercises and sets.</p>
          <Link
            href="/training/start"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Start Workout
          </Link>
        </Card>
      ) : (
        <>
          <Card title="Current Week">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <MetricValue value={String(completedThisWeek)} unit="completed" />
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">Completed workouts this week</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeWorkout ? (
                  <Link
                    href={`/training/workouts/${activeWorkout.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    Continue Active Workout
                  </Link>
                ) : (
                  <Link
                    href="/training/start"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                  >
                    Start Workout
                  </Link>
                )}
                <Link
                  href="/training/history"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                >
                  History
                </Link>
              </div>
            </div>
          </Card>

          {activeWorkout ? (
            <Card title="Continue Active Workout" variant="primary">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-base font-semibold text-white">{activeWorkout.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StateChip state="active" />
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-400">Date:</span> {formatDate(activeWorkout.workout_date)}
                  </p>
                </div>
                <Link
                  href={`/training/workouts/${activeWorkout.id}`}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  Resume Workout
                </Link>
              </div>
            </Card>
          ) : null}

          {previewWorkout ? (
            <Card title="Workout Targeting Preview" variant="secondary">
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-zinc-100">{previewWorkout.name}</p>
                <p className="text-xs text-zinc-500">
                  {activeWorkout ? "Most recent active workout" : "Most recent workout"} • {previewWorkoutExercises.length} exercises
                </p>
                <div>
                  <StateChip state={activeWorkout ? "active" : "planned"} label={activeWorkout ? "In progress focus" : "Recent focus"} />
                </div>
                <MuscleMap aggregation={previewWorkoutTargeting} testId="training-dashboard-muscle-map" />
                <p className="text-xs text-zinc-400">
                  {previewFocusLabel ?? "Primary focus unavailable"}.
                  {" "}
                  Region:{" "}
                  {previewWorkoutTargeting.ranked_muscles[0]
                    ? titleCase(previewWorkoutExercises.find((exercise) =>
                      (exercise.source_primary_muscles ?? []).includes(previewWorkoutTargeting.ranked_muscles[0].muscle),
                    )?.source_body_region ?? "mixed")
                    : "unavailable"}
                </p>
              </div>
            </Card>
          ) : null}

          <Card title="Recent Workouts" variant="tertiary">
            <ul className="space-y-2">
              {recentWorkouts.map((workout) => {
                const workoutExercises = exercisesByWorkoutId.get(workout.id) ?? [];
                const summary = buildWorkoutSummaryStats({
                  workout,
                  exercises: workoutExercises,
                  setsByExerciseId,
                  displayUnit,
                });

                return (
                  <li key={workout.id} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{workout.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <StateChip state={workout.completed_at ? "completed" : "active"} label={workout.completed_at ? "Completed" : "In progress"} />
                          <p className="text-xs text-zinc-500">{formatDate(workout.workout_date)}</p>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {summary.exerciseCount} exercises • {summary.completedSetCount}/{summary.totalSetCount} sets complete
                        </p>
                      </div>
                      <Link
                        href={`/training/workouts/${workout.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <Card title="Recent Exercises" variant="tertiary">
        {recentExerciseSnapshots.length ? (
          <ul className="space-y-2">
            {recentExerciseSnapshots.map((exercise) => (
              <li key={`${exercise.name}-${exercise.source}`} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{exercise.source}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No recent exercises yet.</p>
        )}
        <Link
          href="/training/exercises"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
        >
          Browse Exercise Catalog
        </Link>
      </Card>
    </div>
  );
}
