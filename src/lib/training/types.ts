import type { Database } from "@/types/database";

export type TrainingWeightUnit = "lb" | "kg";

export type WorkoutSetType = "warmup" | "working" | "top" | "backoff" | "drop" | "failure";

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];
export type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"];
export type WorkoutSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];

export interface WorkoutSetLike {
  id?: string;
  catalog_exercise_id?: string | null;
  exercise_id?: string | null;
  exercise_name?: string | null;
  position: number;
  set_type: string;
  weight: number | null;
  weight_unit: string | null;
  reps: number | null;
  is_completed: boolean;
  notes: string | null;
}

export interface WorkoutSetOneRepMaxResult {
  estimatedOneRepMax: number;
  displayUnit: TrainingWeightUnit;
}

export interface BestSetResult {
  set: WorkoutSetLike;
  estimatedOneRepMax: number;
  displayUnit: TrainingWeightUnit;
}

export interface PersonalRecordCandidateResult {
  isPr: boolean;
  candidateEstimatedOneRepMax: number | null;
  previousBestEstimatedOneRepMax: number | null;
  displayUnit: TrainingWeightUnit;
}
