import { convertWeight, isWeightUnit, roundWeight, type WeightUnit } from "../weight/conversions";

import type {
  BestSetResult,
  PersonalRecordCandidateResult,
  TrainingWeightUnit,
  WorkoutSetLike,
  WorkoutSetOneRepMaxResult,
} from "./types";

interface WeightedCompletedSet extends WorkoutSetLike {
  is_completed: true;
  weight: number;
  weight_unit: WeightUnit;
  reps: number;
}

function isValidWeightedCompletedSet(set: WorkoutSetLike): set is WeightedCompletedSet {
  return (
    set.is_completed &&
    set.weight !== null &&
    set.reps !== null &&
    set.weight > 0 &&
    set.reps > 0 &&
    set.weight_unit !== null &&
    isWeightUnit(set.weight_unit)
  );
}

function convertToDisplayUnit(weight: number, from: WeightUnit, to: TrainingWeightUnit): number {
  return roundWeight(convertWeight(weight, from, to), 4);
}

export function calculateSetVolume(set: WorkoutSetLike, displayUnit: TrainingWeightUnit): number | null {
  if (!isValidWeightedCompletedSet(set)) {
    return null;
  }

  const convertedWeight = convertToDisplayUnit(set.weight, set.weight_unit as WeightUnit, displayUnit);
  return roundWeight(convertedWeight * set.reps, 2);
}

export function calculateExerciseVolume(sets: WorkoutSetLike[], displayUnit: TrainingWeightUnit): number | null {
  let total = 0;
  let counted = 0;

  for (const set of sets) {
    const volume = calculateSetVolume(set, displayUnit);
    if (volume === null) {
      continue;
    }
    total += volume;
    counted += 1;
  }

  if (!counted) {
    return null;
  }

  return roundWeight(total, 2);
}

export function calculateWorkoutVolume(
  exercises: Array<{ sets: WorkoutSetLike[] }>,
  displayUnit: TrainingWeightUnit,
): number | null {
  let total = 0;
  let countedExercises = 0;

  for (const exercise of exercises) {
    const exerciseVolume = calculateExerciseVolume(exercise.sets, displayUnit);
    if (exerciseVolume === null) {
      continue;
    }
    total += exerciseVolume;
    countedExercises += 1;
  }

  if (!countedExercises) {
    return null;
  }

  return roundWeight(total, 2);
}

export function estimateSetOneRepMax(
  set: WorkoutSetLike,
  displayUnit: TrainingWeightUnit,
): WorkoutSetOneRepMaxResult | null {
  if (!isValidWeightedCompletedSet(set)) {
    return null;
  }

  const reps = set.reps;
  const convertedWeight = convertToDisplayUnit(set.weight, set.weight_unit as WeightUnit, displayUnit);

  if (reps === 1) {
    return {
      estimatedOneRepMax: roundWeight(convertedWeight, 2),
      displayUnit,
    };
  }

  const estimated = convertedWeight * (1 + reps / 30);
  return {
    estimatedOneRepMax: roundWeight(estimated, 2),
    displayUnit,
  };
}

export function findBestCompletedSetByEstimatedOneRepMax(
  sets: WorkoutSetLike[],
  displayUnit: TrainingWeightUnit,
): BestSetResult | null {
  let best: BestSetResult | null = null;

  for (const set of sets) {
    const estimate = estimateSetOneRepMax(set, displayUnit);
    if (!estimate) {
      continue;
    }

    if (!best || estimate.estimatedOneRepMax > best.estimatedOneRepMax) {
      best = {
        set,
        estimatedOneRepMax: estimate.estimatedOneRepMax,
        displayUnit,
      };
    }
  }

  return best;
}

function matchesExercise(candidate: WorkoutSetLike, previous: WorkoutSetLike): boolean {
  if (candidate.exercise_id && previous.exercise_id) {
    return candidate.exercise_id === previous.exercise_id;
  }

  const candidateSnapshot = candidate.exercise_name?.trim().toLowerCase();
  const previousSnapshot = previous.exercise_name?.trim().toLowerCase();
  return Boolean(candidateSnapshot && previousSnapshot && candidateSnapshot === previousSnapshot);
}

export function evaluatePersonalRecordCandidate(
  candidate: WorkoutSetLike,
  previousSets: WorkoutSetLike[],
  displayUnit: TrainingWeightUnit,
): PersonalRecordCandidateResult {
  const candidateEstimate = estimateSetOneRepMax(candidate, displayUnit);
  const comparablePrevious = previousSets.filter((set) => matchesExercise(candidate, set));
  const previousBest = findBestCompletedSetByEstimatedOneRepMax(comparablePrevious, displayUnit);

  if (!candidateEstimate) {
    return {
      isPr: false,
      candidateEstimatedOneRepMax: null,
      previousBestEstimatedOneRepMax: previousBest?.estimatedOneRepMax ?? null,
      displayUnit,
    };
  }

  if (!previousBest) {
    return {
      isPr: true,
      candidateEstimatedOneRepMax: candidateEstimate.estimatedOneRepMax,
      previousBestEstimatedOneRepMax: null,
      displayUnit,
    };
  }

  return {
    isPr: candidateEstimate.estimatedOneRepMax > previousBest.estimatedOneRepMax,
    candidateEstimatedOneRepMax: candidateEstimate.estimatedOneRepMax,
    previousBestEstimatedOneRepMax: previousBest.estimatedOneRepMax,
    displayUnit,
  };
}

export function sortWorkoutsForHistory<T extends { workout_date: string; started_at: string | null; created_at: string }>(
  workouts: T[],
): T[] {
  return [...workouts].sort((a, b) => {
    if (a.workout_date !== b.workout_date) {
      return a.workout_date < b.workout_date ? 1 : -1;
    }

    const aStarted = a.started_at ? Date.parse(a.started_at) : Number.NEGATIVE_INFINITY;
    const bStarted = b.started_at ? Date.parse(b.started_at) : Number.NEGATIVE_INFINITY;
    if (aStarted !== bStarted) {
      return bStarted - aStarted;
    }

    const aCreated = Date.parse(a.created_at);
    const bCreated = Date.parse(b.created_at);
    return bCreated - aCreated;
  });
}
