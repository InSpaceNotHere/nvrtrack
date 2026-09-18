import { convertWeight, isWeightUnit, roundWeight } from "../weight/conversions";
import { calculateExerciseVolume, estimateSetOneRepMax } from "./calculations";
import { toCanonicalLift, type CanonicalLift } from "./canonical-lifts";
import type { TrainingWeightUnit, WorkoutExerciseRow, WorkoutRow, WorkoutSetLike, WorkoutSetRow } from "./types";

export type StrengthLiftKey = "bench" | "squat" | "deadlift";
const MAX_REPS_FOR_ESTIMATED_1RM = 12;

type StrengthWorkoutInput = Pick<WorkoutRow, "id" | "name" | "workout_date" | "started_at" | "completed_at" | "created_at">;
type StrengthExerciseInput = Pick<WorkoutExerciseRow, "id" | "workout_id" | "exercise_id" | "catalog_exercise_id" | "exercise_name"> & {
  source_canonical_lift?: string | null;
};
type StrengthSetInput = Pick<
  WorkoutSetRow,
  "id" | "user_id" | "workout_exercise_id" | "position" | "set_type" | "weight" | "weight_unit" | "reps" | "rpe" | "is_completed" | "notes" | "created_at" | "updated_at"
>;

export interface StrengthHistorySetRow {
  workout: StrengthWorkoutInput;
  exercise: StrengthExerciseInput;
  set: StrengthSetInput;
}

export interface StrengthHistoryPoint {
  workout_id: string;
  workout_name: string;
  workout_date: string;
  estimated_one_rep_max: number | null;
  tested_one_rep_max: number | null;
  heaviest_weight: number | null;
  rep_pr: number | null;
  rep_pr_reps: number | null;
  rep_prs_by_reps: Record<string, number>;
  total_volume: number | null;
  is_lifetime_pr: boolean;
}

export interface ExerciseStrengthSnapshot {
  exercise_key: string;
  exercise_name: string;
  canonical_lift: CanonicalLift | null;
  current_estimated_one_rep_max: number | null;
  lifetime_estimated_one_rep_max: number | null;
  current_tested_one_rep_max: number | null;
  lifetime_tested_one_rep_max: number | null;
  rep_pr: number | null;
  rep_pr_reps: number | null;
  rep_prs_by_reps: Record<string, number>;
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
  current_tested_one_rep_max: number | null;
  lifetime_tested_one_rep_max: number | null;
}

export interface StrengthDashboardSummary {
  bench: StrengthLiftSummary;
  squat: StrengthLiftSummary;
  deadlift: StrengthLiftSummary;
  total_tested: number | null;
  total_estimated: number | null;
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

function exerciseIdentityKey(exercise: StrengthExerciseInput): string {
  if (exercise.catalog_exercise_id) {
    return `catalog:${exercise.catalog_exercise_id}`;
  }
  if (exercise.exercise_id) {
    return `custom:${exercise.exercise_id}`;
  }
  return `snapshot:${normalizeText(exercise.exercise_name)}`;
}

function canonicalLiftToStrengthKey(canonicalLift: CanonicalLift | null): StrengthLiftKey | null {
  if (canonicalLift === "bench_press") return "bench";
  if (canonicalLift === "squat") return "squat";
  if (canonicalLift === "deadlift") return "deadlift";
  return null;
}

function sortByWorkoutDateAscending(left: StrengthHistoryPoint, right: StrengthHistoryPoint): number {
  if (left.workout_date !== right.workout_date) {
    return left.workout_date < right.workout_date ? -1 : 1;
  }
  return left.workout_id.localeCompare(right.workout_id);
}

function toWorkoutSetLike(set: StrengthSetInput, exercise: StrengthExerciseInput): WorkoutSetLike {
  return {
    ...set,
    catalog_exercise_id: exercise.catalog_exercise_id,
    exercise_id: exercise.exercise_id,
    exercise_name: exercise.exercise_name,
  };
}

function toCanonicalLiftFromExercise(exercise: StrengthExerciseInput): CanonicalLift | null {
  return toCanonicalLift(exercise.source_canonical_lift ?? null);
}

function toConvertedWeight(set: WorkoutSetLike, displayUnit: TrainingWeightUnit): number | null {
  if (!set.is_completed || set.weight === null || set.weight <= 0 || set.weight_unit === null || !isWeightUnit(set.weight_unit)) {
    return null;
  }
  return roundWeight(convertWeight(set.weight, set.weight_unit, displayUnit), 2);
}

function sumStrict(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) {
    return null;
  }
  let total = 0;
  for (const value of values) {
    total += value as number;
  }
  return roundWeight(total, 2);
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
  workouts: StrengthWorkoutInput[];
  exercises: StrengthExerciseInput[];
  setsByExerciseId: Map<string, StrengthSetInput[]>;
  displayUnit: TrainingWeightUnit;
  referenceDate?: Date;
}): StrengthDashboardSummary {
  const { workouts, exercises, setsByExerciseId, displayUnit, referenceDate = new Date() } = params;
  const completedWorkouts = workouts.filter((workout) => workout.completed_at !== null);
  const workoutsById = new Map(completedWorkouts.map((workout) => [workout.id, workout]));

  const historyByExercise = new Map<string, StrengthHistoryPoint[]>();
  const exerciseNameByKey = new Map<string, string>();
  const canonicalByExerciseKey = new Map<string, CanonicalLift | null>();

  for (const exercise of exercises) {
    const workout = workoutsById.get(exercise.workout_id);
    if (!workout) {
      continue;
    }

    const setRows = setsByExerciseId.get(exercise.id) ?? [];
    const setLikes = setRows.map((set) => toWorkoutSetLike(set, exercise));
    const completedWeightedSets = setLikes.filter((set) => set.is_completed);
    const estimateEligibleSets = completedWeightedSets.filter((set) => (set.reps ?? 0) >= 1 && (set.reps ?? 0) <= MAX_REPS_FOR_ESTIMATED_1RM);
    const bestEstimate = estimateEligibleSets
      .map((set) => estimateSetOneRepMax(set, displayUnit)?.estimatedOneRepMax ?? null)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const testedOneRepMax = completedWeightedSets
      .filter((set) => set.reps === 1)
      .map((set) => toConvertedWeight(set, displayUnit))
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const heaviestWeight = completedWeightedSets
      .map((set) => toConvertedWeight(set, displayUnit))
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const repPrByReps = new Map<number, number>();
    for (const set of completedWeightedSets) {
      if (!set.reps || set.reps <= 0) {
        continue;
      }
      const converted = toConvertedWeight(set, displayUnit);
      if (converted === null) {
        continue;
      }
      const previous = repPrByReps.get(set.reps);
      if (previous === undefined || converted > previous) {
        repPrByReps.set(set.reps, converted);
      }
    }
    const topRepPr = [...repPrByReps.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const totalVolume = calculateExerciseVolume(setLikes, displayUnit);

    const exerciseKey = exerciseIdentityKey(exercise);
    const list = historyByExercise.get(exerciseKey) ?? [];
    list.push({
      workout_id: workout.id,
      workout_name: workout.name,
      workout_date: workout.workout_date,
      estimated_one_rep_max: bestEstimate,
      tested_one_rep_max: testedOneRepMax,
      heaviest_weight: heaviestWeight,
      rep_pr: topRepPr?.[1] ?? null,
      rep_pr_reps: topRepPr?.[0] ?? null,
      rep_prs_by_reps: Object.fromEntries([...repPrByReps.entries()].map(([reps, weight]) => [String(reps), weight])),
      total_volume: totalVolume,
      is_lifetime_pr: false,
    });
    historyByExercise.set(exerciseKey, list);
    if (!exerciseNameByKey.has(exerciseKey)) {
      exerciseNameByKey.set(exerciseKey, exercise.exercise_name);
    }
    if (!canonicalByExerciseKey.has(exerciseKey)) {
      canonicalByExerciseKey.set(exerciseKey, toCanonicalLiftFromExercise(exercise));
    }
  }

  const exerciseSnapshots: ExerciseStrengthSnapshot[] = [];
  for (const [exerciseKey, points] of historyByExercise.entries()) {
    const sortedAscending = [...points].sort(sortByWorkoutDateAscending);
    let runningEstimatedBest: number | null = null;
    let runningTestedBest: number | null = null;
    let runningHeaviest: number | null = null;
    const runningRepPrs = new Map<number, number>();
    let lastPrDate: string | null = null;
    for (const point of sortedAscending) {
      let pointIsPr = false;

      if (point.estimated_one_rep_max !== null && (runningEstimatedBest === null || point.estimated_one_rep_max > runningEstimatedBest)) {
        runningEstimatedBest = point.estimated_one_rep_max;
        pointIsPr = true;
      }
      if (point.tested_one_rep_max !== null && (runningTestedBest === null || point.tested_one_rep_max > runningTestedBest)) {
        runningTestedBest = point.tested_one_rep_max;
        pointIsPr = true;
      }
      if (point.heaviest_weight !== null && (runningHeaviest === null || point.heaviest_weight > runningHeaviest)) {
        runningHeaviest = point.heaviest_weight;
        pointIsPr = true;
      }

      for (const [repsValue, weight] of Object.entries(point.rep_prs_by_reps)) {
        const reps = Number(repsValue);
        if (!Number.isFinite(reps) || reps <= 0) {
          continue;
        }
        const previous = runningRepPrs.get(reps);
        if (previous === undefined || weight > previous) {
          runningRepPrs.set(reps, weight);
          pointIsPr = true;
        }
      }

      point.is_lifetime_pr = pointIsPr;
      if (pointIsPr) {
        lastPrDate = point.workout_date;
      }
    }

    const sortedDescending = [...sortedAscending].reverse();
    const current = sortedDescending.find((point) => point.estimated_one_rep_max !== null) ?? null;
    const currentTested = sortedDescending.find((point) => point.tested_one_rep_max !== null) ?? null;
    const heaviestWeight = sortedDescending
      .map((point) => point.heaviest_weight)
      .filter((value): value is number => value !== null)
      .sort((left, right) => right - left)[0] ?? null;
    const lifetimeRepPrs = new Map<number, number>();
    for (const point of sortedDescending) {
      for (const [repsValue, weight] of Object.entries(point.rep_prs_by_reps)) {
        const reps = Number(repsValue);
        if (!Number.isFinite(reps) || reps <= 0) {
          continue;
        }
        const previous = lifetimeRepPrs.get(reps);
        if (previous === undefined || weight > previous) {
          lifetimeRepPrs.set(reps, weight);
        }
      }
    }
    const topRepPr = [...lifetimeRepPrs.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const totalVolume = sortedDescending.reduce((sum, point) => sum + (point.total_volume ?? 0), 0);

    exerciseSnapshots.push({
      exercise_key: exerciseKey,
      exercise_name: exerciseNameByKey.get(exerciseKey) ?? "Exercise",
      canonical_lift: canonicalByExerciseKey.get(exerciseKey) ?? null,
      current_estimated_one_rep_max: current?.estimated_one_rep_max ?? null,
      lifetime_estimated_one_rep_max: runningEstimatedBest,
      current_tested_one_rep_max: currentTested?.tested_one_rep_max ?? null,
      lifetime_tested_one_rep_max: runningTestedBest,
      rep_pr: topRepPr?.[1] ?? null,
      rep_pr_reps: topRepPr?.[0] ?? null,
      rep_prs_by_reps: Object.fromEntries([...lifetimeRepPrs.entries()].sort((a, b) => a[0] - b[0]).map(([reps, weight]) => [String(reps), weight])),
      heaviest_weight: heaviestWeight,
      total_volume: totalVolume > 0 ? totalVolume : null,
      last_pr_workout_date: lastPrDate,
      has_recent_pr: lastPrDate ? isRecentPr(lastPrDate, referenceDate) : false,
      history: sortedDescending,
    });
  }

  const liftSummaries: Record<StrengthLiftKey, StrengthLiftSummary> = {
    bench: {
      key: "bench",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
    squat: {
      key: "squat",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
    deadlift: {
      key: "deadlift",
      current_estimated_one_rep_max: null,
      lifetime_estimated_one_rep_max: null,
      current_tested_one_rep_max: null,
      lifetime_tested_one_rep_max: null,
    },
  };

  for (const snapshot of exerciseSnapshots) {
    const liftKey = canonicalLiftToStrengthKey(snapshot.canonical_lift);
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
    if (
      snapshot.current_tested_one_rep_max !== null &&
      (lift.current_tested_one_rep_max === null || snapshot.current_tested_one_rep_max > lift.current_tested_one_rep_max)
    ) {
      lift.current_tested_one_rep_max = snapshot.current_tested_one_rep_max;
    }
    if (
      snapshot.lifetime_tested_one_rep_max !== null &&
      (lift.lifetime_tested_one_rep_max === null || snapshot.lifetime_tested_one_rep_max > lift.lifetime_tested_one_rep_max)
    ) {
      lift.lifetime_tested_one_rep_max = snapshot.lifetime_tested_one_rep_max;
    }
  }

  const totalTested = sumStrict([
    liftSummaries.bench.lifetime_tested_one_rep_max,
    liftSummaries.squat.lifetime_tested_one_rep_max,
    liftSummaries.deadlift.lifetime_tested_one_rep_max,
  ]);
  const totalEstimated = sumStrict([
    liftSummaries.bench.lifetime_estimated_one_rep_max,
    liftSummaries.squat.lifetime_estimated_one_rep_max,
    liftSummaries.deadlift.lifetime_estimated_one_rep_max,
  ]);
  const thousandClubProgressPercent = totalTested !== null ? Math.min(100, (totalTested / 1000) * 100) : null;

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
    total_tested: totalTested,
    total_estimated: totalEstimated,
    total_current: totalTested,
    total_lifetime: totalEstimated,
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

export function buildStrengthDashboardSummaryFromHistoryRows(params: {
  rows: StrengthHistorySetRow[];
  displayUnit: TrainingWeightUnit;
  referenceDate?: Date;
}): StrengthDashboardSummary {
  const workoutsById = new Map<string, StrengthWorkoutInput>();
  const exercisesById = new Map<string, StrengthExerciseInput>();
  const setsByExerciseId = new Map<string, StrengthSetInput[]>();

  for (const row of params.rows) {
    workoutsById.set(row.workout.id, row.workout);
    exercisesById.set(row.exercise.id, row.exercise);

    const list = setsByExerciseId.get(row.exercise.id);
    if (list) {
      list.push(row.set);
    } else {
      setsByExerciseId.set(row.exercise.id, [row.set]);
    }
  }

  return buildStrengthDashboardSummary({
    workouts: [...workoutsById.values()],
    exercises: [...exercisesById.values()],
    setsByExerciseId,
    displayUnit: params.displayUnit,
    referenceDate: params.referenceDate,
  });
}
