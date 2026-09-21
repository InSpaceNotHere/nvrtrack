import Link from "next/link";

import { TrainingHistoryView, type WorkoutHistoryItem } from "@/components/training/training-history-view";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyWorkoutExercisesForWorkoutIds,
  getMyWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { sortWorkoutsForHistory } from "@/lib/training/calculations";
import { buildWorkoutSummaryStats, groupSetsByWorkoutExerciseId } from "@/lib/training/session";
import type { TrainingWeightUnit, WorkoutExerciseRow } from "@/lib/training/types";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): TrainingWeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function TrainingHistoryPage() {
  const [workoutsResult, profileResult] = await Promise.all([getMyWorkouts(), getMyProfile()]);

  const workouts = sortWorkoutsForHistory(workoutsResult.data ?? []);
  const workoutIds = workouts.map((workout) => workout.id);

  const workoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(workoutIds);
  const workoutExercises = workoutExercisesResult.data ?? [];
  const workoutExerciseIds = workoutExercises.map((exercise) => exercise.id);

  const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(workoutExerciseIds);
  const setsByExerciseId = groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []);

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const exercisesByWorkoutId = new Map<string, WorkoutExerciseRow[]>();
  for (const exercise of workoutExercises) {
    const existing = exercisesByWorkoutId.get(exercise.workout_id);
    if (existing) {
      existing.push(exercise);
    } else {
      exercisesByWorkoutId.set(exercise.workout_id, [exercise]);
    }
  }

  const items: WorkoutHistoryItem[] = workouts.map((workout) => {
    const exercises = exercisesByWorkoutId.get(workout.id) ?? [];
    const summary = buildWorkoutSummaryStats({
      workout,
      exercises,
      setsByExerciseId,
      displayUnit,
    });

    return {
      id: workout.id,
      name: workout.name,
      workoutDate: workout.workout_date,
      isCompleted: Boolean(workout.completed_at),
      exerciseCount: summary.exerciseCount,
      completedSetCount: summary.completedSetCount,
      totalSetCount: summary.totalSetCount,
      totalVolume: summary.totalVolume,
      durationMinutes: summary.durationMinutes,
    };
  });

  const dataErrorMessage =
    workoutsResult.error?.message ??
    workoutExercisesResult.error?.message ??
    workoutSetsResult.error?.message ??
    profileResult.error?.message ??
    null;

  return (
    <div className="space-y-4">
      <PageHeader title="Workout History" subtitle="All workouts, newest first." />

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

      <Card title="History">
        <TrainingHistoryView items={items} displayUnit={displayUnit} loadErrorMessage={dataErrorMessage} />
      </Card>
    </div>
  );
}
