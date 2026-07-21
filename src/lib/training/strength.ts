import { calculateExerciseVolume, estimateSetOneRepMax } from "./calculations";
import type { TrainingWeightUnit, WorkoutExerciseRow, WorkoutRow, WorkoutSetLike, WorkoutSetRow } from "./types";

export type StrengthLiftKey = "bench" | "squat" | "deadlift";

export interface StrengthHistoryPoint {
  workout_id: string;
  workout_name: string;
  workout_date: string;
  estimated_one_rep_max: number | null;
  heaviest_weight: number | null;
  rep_pr: number | null;
  total_volume: number | null;
  is_lifetime_pr: boolean;
}

export interface ExerciseStrengthSnapshot {
  exercise_key: string;
  exercise_name: string;
  current_estimated_one_rep_max: number | null;
  lifetime_estimated_one_rep_max: number | null;
  rep_pr: number | null;
  heaviest_weight: number | null;
  total_volume: number | null;
  last_pr_workout_date: string | null;
  has_recent_pr: boolean;
  history: StrengthHistoryPoint[];
}

export interface StrengthLiftSummary {
  key: StrengthLiftKey;
  current_estimated_one_rep_max: number | null;
  lifetime_estimated_one_rep_max: number | null;
}

export interface StrengthDashboardSummary {
  bench: StrengthLiftSummary;
  squat: StrengthLiftSummary;
  deadlift: StrengthLiftSummary;
  total_current: number | null;
  total_lifetime: number | null;
  thousand_club_progress_percent: number | null;
  latest_pr: {
    exercise_name: string;
    workout_date: string;
    estimated_one_rep_max: number;
  } | null;
  exercise_snapshots: ExerciseStrengthSnapshot[];
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function exerciseIdentityKey(exercise: WorkoutExerciseRow): string {
  if (exercise.catalog_exercise_id) {
    return `catalog:${exercise.catalog_exercise_id}`;
  }
  if (exercise.exercise_id) {
    return `custom:${exercise.exercise_id}`;
  }
  return `snapshot:${normalizeText(exercise.exercise_name)}`;
}

function classifyStrengthLift(exerciseName: string): StrengthLiftKey | null {
  const normalized = normalizeText(exerciseName);
  if (normalized.includes("deadlift")) {
    return "deadlift";
  }
  if (normalized.includes("bench") && normalized.includes("press")) {
    return "bench";
  }
  if (normalized.includes("squat")) {
    return "squat";
  }
  return null;
}

function sortByWorkoutDateAscending(left: StrengthHistoryPoint, right: StrengthHistoryPoint): number {
  if (left.workout_date !== right.workout_date) {
    return left.workout_date < right.workout_date ? -1 : 1;
  }
  return left.workout_id.localeCompare(right.workout_id);
}

function toWorkoutSetLike(set: WorkoutSetRow, exercise: WorkoutExerciseRow): WorkoutSetLike {
  return {
    ...set,
    catalog_exercise_id: exercise.catalog_exercise_id,
    exercise_id: exercise.exercise_id,
    exercise_name: exercise.exercise_name,
  };
}

function isRecentPr(workoutDate: string, referenceDate: Date): boolean {
  const referenceDay = Date.parse(`${referenceDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const workoutDay = Date.parse(`${workoutDate}T00:00:00.000Z`);
  if (Number.isNaN(referenceDay) || Number.isNaN(workoutDay)) {
    return false;
  }
  const dayDelta = Math.floor((referenceDay - workoutDay) / 86400000);
  return dayDelta >= 0 && dayDelta <= 30;
}

export function buildStrengthDashboardSummary(params: {
  workouts: WorkoutRow[];
  exercises: WorkoutExerciseRow[];
  setsByExerciseId: Map<string, WorkoutSetRow[]>;
  displayUnit: TrainingWeightUnit;
  referenceDate?: Date;
}): StrengthDashboardSummary {
  const { workouts, exercises, setsByExerciseId, displayUnit, referenceDate = new Date() } = params;
  const completedWorkouts = workouts.filter((workout) => workout.completed_at !== null);
  const workoutsById = new Map(completedWorkouts.map((workout) => [workout.id, workout]));

  const historyByExercise = new Map<string, StrengthHistoryPoint[]>();
  const exerciseNameByKey = new Map<string, string>();

  for (const exercise of exercises) {
    const workout = workoutsById.get(exercise.workout_id);
    if (!workout) {
      continue;
    }

    const setRows = setsByExerciseId.get(exercise.id) ?? [];
    const setLikes = setRows.map((set) => toWorkoutSetLike(set, exercise));
    const completedWeightedSets = setLikes.filter((set) => set.is_completed);
    const bestEstimate = completedWeightedSets
      .map((set) => estimateSetOneRepMax(set, displayUnit)?.estimatedOneRepMax ?? null)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const heaviestWeight = completedWeightedSets
      .filter((set) => set.weight !== null && set.weight_unit !== null)
      .map((set) => estimateSetOneRepMax({ ...set, reps: 1 }, displayUnit)?.estimatedOneRepMax ?? null)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const repPr = completedWeightedSets
      .map((set) => set.reps)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => right - left)[0] ?? null;
    const totalVolume = calculateExerciseVolume(setLikes, displayUnit);

    const exerciseKey = exerciseIdentityKey(exercise);
    const list = historyByExercise.get(exerciseKey) ?? [];
    list.push({
      workout_id: workout.id,
      workout_name: workout.name,
      workout_date: workout.workout_date,
      estimated_one_rep_max: bestEstimate,
      heaviest_weight: heaviestWeight,
      rep_pr: repPr,
      total_volume: totalVolume,
      is_lifetime_pr: false,
    });
    historyByExercise.set(exerciseKey, list);
    if (!exerciseNameByKey.has(exerciseKey)) {
      exerciseNameByKey.set(exerciseKey, exercise.exercise_name);
    }
  }

  const exerciseSnapshots: ExerciseStrengthSnapshot[] = [];
  for (const [exerciseKey, points] of historyByExercise.entries()) {
    const sortedAscending = [...points].sort(sortByWorkoutDateAscending);
    let runningBest: number | null = null;
    let lastPrDate: string | null = null;
    for (const point of sortedAscending) {
      if (point.estimated_one_rep_max === null) {
        continue;
      }
      if (runningBest === null || point.estimated_one_rep_max > runningBest) {
        runningBest = point.estimated_one_rep_max;
        point.is_lifetime_pr = true;
        lastPrDate = point.workout_date;
      }
    }
    const sortedDescending = [...sortedAscending].reverse();
    const current = sortedDescending.find((point) => point.estimated_one_rep_max !== null) ?? null;
    const heaviestWeight = sortedDescending
      .map((point) => point.heaviest_weight)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const repPr = sortedDescending
      .map((point) => point.rep_pr)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const totalVolume = sortedDescending.reduce((sum, point) => sum + (point.total_volume ?? 0), 0);

    exerciseSnapshots.push({
      exercise_key: exerciseKey,
      exercise_name: exerciseNameByKey.get(exerciseKey) ?? "Exercise",
      current_estimated_one_rep_max: current?.estimated_one_rep_max ?? null,
      lifetime_estimated_one_rep_max: runningBest,
      rep_pr: repPr,
      heaviest_weight: heaviestWeight,
      total_volume: totalVolume > 0 ? totalVolume : null,
      last_pr_workout_date: lastPrDate,
      has_recent_pr: lastPrDate ? isRecentPr(lastPrDate, referenceDate) : false,
      history: sortedDescending,
    });
  }

  const liftSummaries: Record<StrengthLiftKey, StrengthLiftSummary> = {
    bench: { key: "bench", current_estimated_one_rep_max: null, lifetime_estimated_one_rep_max: null },
    squat: { key: "squat", current_estimated_one_rep_max: null, lifetime_estimated_one_rep_max: null },
    deadlift: { key: "deadlift", current_estimated_one_rep_max: null, lifetime_estimated_one_rep_max: null },
  };

  for (const snapshot of exerciseSnapshots) {
    const liftKey = classifyStrengthLift(snapshot.exercise_name);
    if (!liftKey) {
      continue;
    }
    const lift = liftSummaries[liftKey];
    if (
      snapshot.current_estimated_one_rep_max !== null &&
      (lift.current_estimated_one_rep_max === null || snapshot.current_estimated_one_rep_max > lift.current_estimated_one_rep_max)
    ) {
      lift.current_estimated_one_rep_max = snapshot.current_estimated_one_rep_max;
    }
    if (
      snapshot.lifetime_estimated_one_rep_max !== null &&
      (lift.lifetime_estimated_one_rep_max === null || snapshot.lifetime_estimated_one_rep_max > lift.lifetime_estimated_one_rep_max)
    ) {
      lift.lifetime_estimated_one_rep_max = snapshot.lifetime_estimated_one_rep_max;
    }
  }

  const liftCurrents = [liftSummaries.bench, liftSummaries.squat, liftSummaries.deadlift]
    .map((lift) => lift.current_estimated_one_rep_max)
    .filter((value): value is number => value !== null);
  const liftLifetimes = [liftSummaries.bench, liftSummaries.squat, liftSummaries.deadlift]
    .map((lift) => lift.lifetime_estimated_one_rep_max)
    .filter((value): value is number => value !== null);

  const totalCurrent = liftCurrents.length ? liftCurrents.reduce((sum, value) => sum + value, 0) : null;
  const totalLifetime = liftLifetimes.length ? liftLifetimes.reduce((sum, value) => sum + value, 0) : null;
  const thousandClubProgressPercent = totalCurrent !== null ? Math.min(100, (totalCurrent / 1000) * 100) : null;

  const latestPrHistoryPoint = exerciseSnapshots
    .flatMap((snapshot) =>
      snapshot.history
        .filter((point) => point.is_lifetime_pr && point.estimated_one_rep_max !== null)
        .map((point) => ({
          exercise_name: snapshot.exercise_name,
          workout_date: point.workout_date,
          estimated_one_rep_max: point.estimated_one_rep_max!,
        })),
    )
    .sort((left, right) => {
      if (left.workout_date !== right.workout_date) {
        return left.workout_date < right.workout_date ? 1 : -1;
      }
      return right.estimated_one_rep_max - left.estimated_one_rep_max;
    })[0] ?? null;

  return {
    bench: liftSummaries.bench,
    squat: liftSummaries.squat,
    deadlift: liftSummaries.deadlift,
    total_current: totalCurrent,
    total_lifetime: totalLifetime,
    thousand_club_progress_percent: thousandClubProgressPercent,
    latest_pr: latestPrHistoryPoint,
    exercise_snapshots: exerciseSnapshots.sort((left, right) => {
      if (left.has_recent_pr !== right.has_recent_pr) {
        return left.has_recent_pr ? -1 : 1;
      }
      return left.exercise_name.localeCompare(right.exercise_name);
    }),
  };
}
