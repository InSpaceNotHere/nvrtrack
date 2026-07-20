import Link from "next/link";

import { ExerciseLibraryManager } from "@/components/training/exercise-library-manager";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMyExercises } from "@/lib/data/exercises";
import { getMyWorkoutExercisesForWorkoutIds, getMyWorkouts } from "@/lib/data/workouts";

export default async function TrainingExercisesPage() {
  const [exercisesResult, workoutsResult] = await Promise.all([getMyExercises(), getMyWorkouts()]);
  const workouts = workoutsResult.data ?? [];
  const workoutDateById = new Map(workouts.map((workout) => [workout.id, workout.workout_date]));

  const workoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(workouts.map((workout) => workout.id));
  const lastUsedByExerciseId: Record<string, string | null> = {};
  for (const workoutExercise of workoutExercisesResult.data ?? []) {
    if (!workoutExercise.exercise_id) {
      continue;
    }
    const workoutDate = workoutDateById.get(workoutExercise.workout_id) ?? null;
    if (!workoutDate) {
      continue;
    }

    const previous = lastUsedByExerciseId[workoutExercise.exercise_id];
    if (!previous || workoutDate > previous) {
      lastUsedByExerciseId[workoutExercise.exercise_id] = workoutDate;
    }
  }

  const dataErrorMessage =
    exercisesResult.error?.message ?? workoutsResult.error?.message ?? workoutExercisesResult.error?.message ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Exercise Library" subtitle="Manage reusable exercises for future workouts." />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/training"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          Back to Training
        </Link>
        <Link
          href="/training/start"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Start Workout
        </Link>
      </div>

      <Card title="Exercises">
        <ExerciseLibraryManager
          exercises={exercisesResult.data ?? []}
          lastUsedByExerciseId={lastUsedByExerciseId}
          loadErrorMessage={dataErrorMessage}
        />
      </Card>
    </div>
  );
}
