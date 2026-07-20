import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyWorkoutExercisesForWorkoutIds,
  getMyWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { sortWorkoutsForHistory } from "@/lib/training/calculations";
import {
  buildWorkoutSummaryStats,
  countCompletedWorkoutsThisWeek,
  groupSetsByWorkoutExerciseId,
  selectMostRecentActiveWorkout,
} from "@/lib/training/session";
import type { WorkoutExerciseRow } from "@/lib/training/types";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): "lb" | "kg" {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

export default async function TrainingPage() {
  const [workoutsResult, profileResult] = await Promise.all([
    getMyWorkouts(),
    getMyProfile(),
  ]);
  const workouts = sortWorkoutsForHistory(workoutsResult.data ?? []);
  const activeWorkout = selectMostRecentActiveWorkout(workouts);
  const completedThisWeek = countCompletedWorkoutsThisWeek(workouts);
  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);

  const recentWorkouts = workouts.slice(0, 5);
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

  const dataErrorMessage =
    workoutsResult.error?.message ??
    workoutExercisesResult.error?.message ??
    workoutSetsResult.error?.message ??
    profileResult.error?.message ??
    null;

  return (
    <div className="space-y-4">
      <PageHeader title="Training" subtitle="Live workout tracking and history." />

      {dataErrorMessage ? (
        <Card>
          <p className="text-sm text-rose-200">Training data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{dataErrorMessage}</p>
        </Card>
      ) : null}

      {!workouts.length ? (
        <Card title="Start Your First Workout">
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
                <p className="text-2xl font-semibold tracking-tight text-white">{completedThisWeek}</p>
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
            <Card title="Continue Active Workout">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-base font-semibold text-white">{activeWorkout.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(activeWorkout.workout_date)}</p>
                <Link
                  href={`/training/workouts/${activeWorkout.id}`}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  Resume Workout
                </Link>
              </div>
            </Card>
          ) : null}

          <Card title="Recent Workouts">
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
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatDate(workout.workout_date)} • {workout.completed_at ? "Completed" : "In progress"}
                        </p>
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

      <Card title="Recent Exercises">
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
