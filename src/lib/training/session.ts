import type { WorkoutExerciseRow, WorkoutRow, WorkoutSetLike, WorkoutSetRow, TrainingWeightUnit } from "./types";
import type { WorkoutSetInput } from "./validation";
import {
  calculateWorkoutVolume,
  evaluatePersonalRecordCandidate,
  findBestCompletedSetByEstimatedOneRepMax,
  sortWorkoutsForHistory,
} from "./calculations";

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseIsoTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeExerciseName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function selectMostRecentActiveWorkout(workouts: WorkoutRow[]): WorkoutRow | null {
  const active = workouts.filter((workout) => workout.completed_at === null);
  if (!active.length) {
    return null;
  }

  return [...active].sort((a, b) => {
    const aStarted = parseIsoTimestamp(a.started_at) ?? parseIsoTimestamp(a.created_at) ?? Number.NEGATIVE_INFINITY;
    const bStarted = parseIsoTimestamp(b.started_at) ?? parseIsoTimestamp(b.created_at) ?? Number.NEGATIVE_INFINITY;
    return bStarted - aStarted;
  })[0];
}

export function getWeekDateRange(referenceDate = new Date()): { start: string; end: string } {
  const utcDate = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
  );
  const day = utcDate.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  const start = new Date(utcDate);
  start.setUTCDate(start.getUTCDate() - distanceFromMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
  };
}

export function countCompletedWorkoutsThisWeek(workouts: WorkoutRow[], referenceDate = new Date()): number {
  const { start, end } = getWeekDateRange(referenceDate);
  return workouts.filter((workout) => workout.completed_at && workout.workout_date >= start && workout.workout_date <= end)
    .length;
}

export function groupSetsByWorkoutExerciseId(sets: WorkoutSetRow[]): Map<string, WorkoutSetRow[]> {
  const grouped = new Map<string, WorkoutSetRow[]>();

  for (const set of sets) {
    const existing = grouped.get(set.workout_exercise_id);
    if (existing) {
      existing.push(set);
    } else {
      grouped.set(set.workout_exercise_id, [set]);
    }
  }

  for (const [exerciseId, exerciseSets] of grouped.entries()) {
    grouped.set(
      exerciseId,
      [...exerciseSets].sort((a, b) => {
        if (a.position !== b.position) {
          return a.position - b.position;
        }

        return Date.parse(a.created_at) - Date.parse(b.created_at);
      }),
    );
  }

  return grouped;
}

export function calculateWorkoutDurationMinutes(workout: WorkoutRow): number | null {
  const started = parseIsoTimestamp(workout.started_at);
  const completed = parseIsoTimestamp(workout.completed_at);
  if (started === null || completed === null || completed < started) {
    return null;
  }

  return Math.max(1, Math.round((completed - started) / 60000));
}

export function countMeaningfulCompletedSets(sets: WorkoutSetRow[]): number {
  return sets.filter((set) => {
    if (!set.is_completed) {
      return false;
    }

    return set.weight !== null || set.reps !== null || Boolean(set.notes?.trim());
  }).length;
}

export function hasMeaningfulCompletedSet(sets: WorkoutSetRow[]): boolean {
  return countMeaningfulCompletedSets(sets) > 0;
}

function matchesExerciseForHistory(current: WorkoutExerciseRow, historical: WorkoutExerciseRow): boolean {
  const currentCatalogId = (current as WorkoutExerciseRow & { catalog_exercise_id?: string | null }).catalog_exercise_id ?? null;
  const historicalCatalogId =
    (historical as WorkoutExerciseRow & { catalog_exercise_id?: string | null }).catalog_exercise_id ?? null;
  if (currentCatalogId && historicalCatalogId) {
    return currentCatalogId === historicalCatalogId;
  }

  if (current.exercise_id) {
    if (historical.exercise_id === current.exercise_id) {
      return true;
    }

    if (!historical.exercise_id) {
      const currentName = normalizeExerciseName(current.exercise_name);
      const historicalName = normalizeExerciseName(historical.exercise_name);
      return Boolean(currentName && currentName === historicalName);
    }
  }

  const currentName = normalizeExerciseName(current.exercise_name);
  const historicalName = normalizeExerciseName(historical.exercise_name);
  return Boolean(currentName && historicalName && currentName === historicalName);
}

function enrichSet(set: WorkoutSetRow, exercise: WorkoutExerciseRow): WorkoutSetLike {
  const catalogExerciseId = (exercise as WorkoutExerciseRow & { catalog_exercise_id?: string | null }).catalog_exercise_id ?? null;
  return {
    ...set,
    catalog_exercise_id: catalogExerciseId,
    exercise_id: exercise.exercise_id,
    exercise_name: exercise.exercise_name,
  };
}

export interface PreviousPerformanceSummary {
  latestWorkoutDate: string | null;
  latestCompletedSets: WorkoutSetRow[];
  previousBestEstimatedOneRepMax: number | null;
  comparableHistoricalSets: WorkoutSetLike[];
}

export function buildPreviousPerformanceMap(params: {
  currentExercises: WorkoutExerciseRow[];
  historicalWorkouts: WorkoutRow[];
  historicalExercises: WorkoutExerciseRow[];
  historicalSets: WorkoutSetRow[];
  displayUnit: TrainingWeightUnit;
}): Map<string, PreviousPerformanceSummary> {
  const { currentExercises, historicalWorkouts, historicalExercises, historicalSets, displayUnit } = params;
  const setsByExerciseId = groupSetsByWorkoutExerciseId(historicalSets);
  const workoutsById = new Map(historicalWorkouts.map((workout) => [workout.id, workout]));
  const rankedWorkoutIds = sortWorkoutsForHistory(historicalWorkouts).map((workout) => workout.id);
  const workoutRank = new Map(rankedWorkoutIds.map((workoutId, index) => [workoutId, index]));
  const map = new Map<string, PreviousPerformanceSummary>();

  for (const current of currentExercises) {
    const comparableExercises = historicalExercises.filter((historical) => matchesExerciseForHistory(current, historical));
    const comparableSets = comparableExercises.flatMap((exercise) => {
      const sets = setsByExerciseId.get(exercise.id) ?? [];
      return sets.map((set) => enrichSet(set, exercise));
    });
    const completedComparableSets = comparableSets.filter((set) => set.is_completed);
    const previousBest = findBestCompletedSetByEstimatedOneRepMax(completedComparableSets, displayUnit);

    const latestExercise = [...comparableExercises].sort((a, b) => {
      const rankA = workoutRank.get(a.workout_id) ?? Number.MAX_SAFE_INTEGER;
      const rankB = workoutRank.get(b.workout_id) ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    })[0];

    const latestWorkout = latestExercise ? workoutsById.get(latestExercise.workout_id) ?? null : null;
    const latestCompletedSets = latestExercise
      ? (setsByExerciseId.get(latestExercise.id) ?? []).filter((set) => set.is_completed)
      : [];

    map.set(current.id, {
      latestWorkoutDate: latestWorkout?.workout_date ?? null,
      latestCompletedSets,
      previousBestEstimatedOneRepMax: previousBest?.estimatedOneRepMax ?? null,
      comparableHistoricalSets: completedComparableSets,
    });
  }

  return map;
}

export interface WorkoutSummaryStats {
  exerciseCount: number;
  totalSetCount: number;
  completedSetCount: number;
  meaningfulCompletedSetCount: number;
  totalVolume: number | null;
  bestEstimatedOneRepMax: number | null;
  potentialPrCount: number;
  durationMinutes: number | null;
}

export function buildWorkoutSummaryStats(params: {
  workout: WorkoutRow;
  exercises: WorkoutExerciseRow[];
  setsByExerciseId: Map<string, WorkoutSetRow[]>;
  displayUnit: TrainingWeightUnit;
  previousPerformanceMap?: Map<string, PreviousPerformanceSummary>;
}): WorkoutSummaryStats {
  const { workout, exercises, setsByExerciseId, displayUnit, previousPerformanceMap } = params;
  const grouped = exercises.map((exercise) => ({
    exercise,
    sets: setsByExerciseId.get(exercise.id) ?? [],
  }));
  const allSets = grouped.flatMap((entry) => entry.sets);
  const completedSets = allSets.filter((set) => set.is_completed);
  const meaningfulCompletedSetCount = countMeaningfulCompletedSets(allSets);

  const totalVolume = calculateWorkoutVolume(grouped.map((entry) => ({ sets: entry.sets })), displayUnit);
  const bestSet = findBestCompletedSetByEstimatedOneRepMax(completedSets, displayUnit);
  let potentialPrCount = 0;

  if (previousPerformanceMap) {
    for (const entry of grouped) {
      const previousSummary = previousPerformanceMap.get(entry.exercise.id);
      if (!previousSummary || previousSummary.previousBestEstimatedOneRepMax === null) {
        continue;
      }

      for (const set of entry.sets) {
        if (!set.is_completed) {
          continue;
        }

        const candidateResult = evaluatePersonalRecordCandidate(
          enrichSet(set, entry.exercise),
          previousSummary.comparableHistoricalSets,
          displayUnit,
        );
        if (candidateResult.isPr && candidateResult.previousBestEstimatedOneRepMax !== null) {
          potentialPrCount += 1;
        }
      }
    }
  }

  return {
    exerciseCount: exercises.length,
    totalSetCount: allSets.length,
    completedSetCount: completedSets.length,
    meaningfulCompletedSetCount,
    totalVolume,
    bestEstimatedOneRepMax: bestSet?.estimatedOneRepMax ?? null,
    potentialPrCount,
    durationMinutes: calculateWorkoutDurationMinutes(workout),
  };
}

export function buildDuplicateSetInput(source: WorkoutSetRow, nextPosition: number): WorkoutSetInput {
  return {
    position: nextPosition,
    set_type: source.set_type,
    weight: source.weight,
    weight_unit: source.weight_unit,
    reps: source.reps,
    rpe: source.rpe,
    is_completed: false,
    notes: source.notes,
  };
}
