import {
  MUSCLE_TAXONOMY,
  coerceMuscleIdArray,
  getMuscleLabel,
  type MuscleId,
} from "./muscles";

const PRIMARY_WEIGHT = 2;
const SECONDARY_WEIGHT = 1;

export interface WorkoutMuscleAggregationInput {
  exercise_id: string;
  exercise_name: string;
  primary_muscles: string[] | null | undefined;
  secondary_muscles: string[] | null | undefined;
}

export interface MuscleScore {
  muscle: MuscleId;
  raw_score: number;
  normalized_intensity: number;
  primary_hits: number;
  secondary_hits: number;
}

export type MetadataCoverage = "none" | "partial" | "full";

export interface WorkoutMuscleAggregation {
  exercise_count: number;
  exercises_with_metadata: number;
  metadata_coverage: MetadataCoverage;
  strongest_score: number;
  ranked_muscles: MuscleScore[];
  primary_targeted_muscles: MuscleId[];
  secondary_targeted_muscles: MuscleId[];
}

interface MutableMuscleScore {
  raw_score: number;
  primary_hits: number;
  secondary_hits: number;
}

export function aggregateWorkoutMuscles(
  exercises: WorkoutMuscleAggregationInput[],
): WorkoutMuscleAggregation {
  const scoreMap = new Map<MuscleId, MutableMuscleScore>();
  let exercisesWithMetadata = 0;

  for (const exercise of exercises) {
    const primaryMuscles = coerceMuscleIdArray(exercise.primary_muscles);
    const secondaryMuscles = coerceMuscleIdArray(exercise.secondary_muscles).filter(
      (muscle) => !primaryMuscles.includes(muscle),
    );

    if (primaryMuscles.length > 0 || secondaryMuscles.length > 0) {
      exercisesWithMetadata += 1;
    }

    for (const muscle of primaryMuscles) {
      const current = scoreMap.get(muscle) ?? { raw_score: 0, primary_hits: 0, secondary_hits: 0 };
      current.raw_score += PRIMARY_WEIGHT;
      current.primary_hits += 1;
      scoreMap.set(muscle, current);
    }

    for (const muscle of secondaryMuscles) {
      const current = scoreMap.get(muscle) ?? { raw_score: 0, primary_hits: 0, secondary_hits: 0 };
      current.raw_score += SECONDARY_WEIGHT;
      current.secondary_hits += 1;
      scoreMap.set(muscle, current);
    }
  }

  const rankedWithoutNormalization: Omit<MuscleScore, "normalized_intensity">[] = MUSCLE_TAXONOMY.map((muscle) => {
    const entry = scoreMap.get(muscle);
    return {
      muscle,
      raw_score: entry?.raw_score ?? 0,
      primary_hits: entry?.primary_hits ?? 0,
      secondary_hits: entry?.secondary_hits ?? 0,
    };
  })
    .filter((entry) => entry.raw_score > 0)
    .sort((left, right) => {
      if (right.raw_score !== left.raw_score) {
        return right.raw_score - left.raw_score;
      }
      if (right.primary_hits !== left.primary_hits) {
        return right.primary_hits - left.primary_hits;
      }
      if (right.secondary_hits !== left.secondary_hits) {
        return right.secondary_hits - left.secondary_hits;
      }
      return MUSCLE_TAXONOMY.indexOf(left.muscle) - MUSCLE_TAXONOMY.indexOf(right.muscle);
    });

  const strongestScore = rankedWithoutNormalization[0]?.raw_score ?? 0;
  const rankedMuscles: MuscleScore[] = rankedWithoutNormalization.map((entry) => ({
    ...entry,
    normalized_intensity: strongestScore > 0 ? entry.raw_score / strongestScore : 0,
  }));

  const primaryTargetedMuscles = rankedMuscles.filter((entry) => entry.primary_hits > 0).map((entry) => entry.muscle);
  const secondaryTargetedMuscles = rankedMuscles
    .filter((entry) => entry.secondary_hits > 0)
    .map((entry) => entry.muscle);

  const metadataCoverage: MetadataCoverage =
    exercises.length === 0 || exercisesWithMetadata === 0
      ? "none"
      : exercisesWithMetadata === exercises.length
        ? "full"
        : "partial";

  return {
    exercise_count: exercises.length,
    exercises_with_metadata: exercisesWithMetadata,
    metadata_coverage: metadataCoverage,
    strongest_score: strongestScore,
    ranked_muscles: rankedMuscles,
    primary_targeted_muscles: primaryTargetedMuscles,
    secondary_targeted_muscles: secondaryTargetedMuscles,
  };
}

export function buildPrimaryFocusLabel(aggregation: WorkoutMuscleAggregation, limit = 3): string | null {
  const topPrimary = aggregation.ranked_muscles
    .filter((entry) => entry.primary_hits > 0)
    .slice(0, limit)
    .map((entry) => getMuscleLabel(entry.muscle).toLowerCase());

  if (topPrimary.length === 0) {
    return null;
  }

  return `Primary focus: ${topPrimary.join(", ")}`;
}
