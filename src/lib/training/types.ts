export type TrainingWeightUnit = "lb" | "kg";

export type WorkoutSetType = "warmup" | "working" | "top" | "backoff" | "drop" | "failure";

export interface ExerciseRow {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutRow {
  id: string;
  user_id: string;
  name: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseRow {
  id: string;
  user_id: string;
  workout_id: string;
  exercise_id: string | null;
  exercise_name: string;
  position: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSetRow {
  id: string;
  user_id: string;
  workout_exercise_id: string;
  position: number;
  set_type: WorkoutSetType;
  weight: number | null;
  weight_unit: TrainingWeightUnit | null;
  reps: number | null;
  rpe: number | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSetLike {
  id?: string;
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
