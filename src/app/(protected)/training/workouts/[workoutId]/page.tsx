import { notFound } from "next/navigation";

import { WorkoutLogger } from "@/components/training/workout-logger";
import { PageHeader } from "@/components/ui/page-header";
import { getMyExercises } from "@/lib/data/exercises";
import { getExerciseCatalog, getRecentlyUsedCatalogExerciseIds } from "@/lib/data/exercise-catalog";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyWorkoutById,
  getMyWorkoutExercises,
  getMyWorkoutExercisesForWorkoutIds,
  getMyWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { buildPreviousPerformanceMap, buildWorkoutSummaryStats, groupSetsByWorkoutExerciseId } from "@/lib/training/session";
import type { TrainingWeightUnit } from "@/lib/training/types";

interface WorkoutDetailPageProps {
  params: Promise<{ workoutId: string }> | { workoutId: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function getDisplayUnit(preferredWeightUnit: string | null | undefined): TrainingWeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function WorkoutDetailPage({ params, searchParams }: WorkoutDetailPageProps) {
  const { workoutId } = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const summaryMode = resolvedSearchParams.view === "summary";

  const [workoutResult, profileResult, allWorkoutsResult, customExercisesResult, catalogExercisesResult, recentCatalogIdsResult] =
    await Promise.all([
      getMyWorkoutById(workoutId),
      getMyProfile(),
      getMyWorkouts(),
      getMyExercises(),
      getExerciseCatalog({ limit: 600 }),
      getRecentlyUsedCatalogExerciseIds(12),
    ]);

  if (workoutResult.error) {
    notFound();
  }
  if (!workoutResult.data) {
    notFound();
  }

  const workout = workoutResult.data;
  const currentExercisesResult = await getMyWorkoutExercises(workoutId);
  const currentExercises = currentExercisesResult.data ?? [];
  const currentExerciseIds = currentExercises.map((exercise) => exercise.id);
  const currentSetsResult = await getWorkoutSetsForWorkoutExerciseIds(currentExerciseIds);
  const currentSetsByExerciseId = groupSetsByWorkoutExerciseId(currentSetsResult.data ?? []);

  const historicalWorkouts = (allWorkoutsResult.data ?? []).filter(
    (entry) => entry.id !== workoutId && entry.completed_at !== null,
  );
  const historicalWorkoutsResult = await getMyWorkoutExercisesForWorkoutIds(historicalWorkouts.map((entry) => entry.id));
  const historicalExercises = historicalWorkoutsResult.data ?? [];
  const historicalSetsResult = await getWorkoutSetsForWorkoutExerciseIds(historicalExercises.map((entry) => entry.id));

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const previousPerformance = buildPreviousPerformanceMap({
    currentExercises,
    historicalWorkouts,
    historicalExercises,
    historicalSets: historicalSetsResult.data ?? [],
    displayUnit,
  });

  const loggerExercises = currentExercises.map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exercise_id,
    catalogExerciseId: (exercise as typeof exercise & { catalog_exercise_id?: string | null }).catalog_exercise_id ?? null,
    exerciseName: exercise.exercise_name,
    notes: exercise.notes,
    position: exercise.position,
    sets: currentSetsByExerciseId.get(exercise.id) ?? [],
    previousPerformance:
      previousPerformance.get(exercise.id) ?? {
        latestWorkoutDate: null,
        latestCompletedSets: [],
        previousBestEstimatedOneRepMax: null,
        comparableHistoricalSets: [],
      },
  }));

  const summary = buildWorkoutSummaryStats({
    workout,
    exercises: currentExercises,
    setsByExerciseId: currentSetsByExerciseId,
    displayUnit,
    previousPerformanceMap: previousPerformance,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={summaryMode || workout.completed_at ? "Workout Summary" : "Workout Logger"}
        subtitle={
          workout.completed_at
            ? "Completed workout snapshot with totals and estimated performance."
            : "Log sets, track volume, and compare against previous performance."
        }
      />

      <WorkoutLogger
        workout={{
          id: workout.id,
          name: workout.name,
          workoutDate: workout.workout_date,
          startedAt: workout.started_at,
          completedAt: workout.completed_at,
          notes: workout.notes,
        }}
        displayUnit={displayUnit}
        preferredWeightUnit={displayUnit}
        exercises={loggerExercises}
        catalogExercises={catalogExercisesResult.data ?? []}
        recentCatalogExerciseIds={recentCatalogIdsResult.data ?? []}
        customExercises={customExercisesResult.data ?? []}
        summary={summary}
      />
    </div>
  );
}
