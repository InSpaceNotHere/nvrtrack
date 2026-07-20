import { describe, expect, it } from "vitest";

import type { WorkoutExerciseRow, WorkoutRow, WorkoutSetRow } from "./types";
import { buildStrengthDashboardSummary } from "./strength";
import { groupSetsByWorkoutExerciseId } from "./session";

function makeWorkout(overrides: Partial<WorkoutRow>): WorkoutRow {
  return {
    id: "workout-1",
    user_id: "user-1",
    name: "Workout",
    workout_date: "2026-07-20",
    started_at: "2026-07-20T10:00:00.000Z",
    completed_at: "2026-07-20T11:00:00.000Z",
    notes: null,
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T11:00:00.000Z",
    ...overrides,
  };
}

function makeExercise(overrides: Partial<WorkoutExerciseRow>): WorkoutExerciseRow {
  return {
    id: "exercise-1",
    user_id: "user-1",
    workout_id: "workout-1",
    exercise_id: null,
    catalog_exercise_id: null,
    exercise_name: "Barbell Bench Press",
    position: 0,
    notes: null,
    source_primary_muscles: ["chest"],
    source_secondary_muscles: ["triceps"],
    source_body_region: "upper_body",
    source_movement_pattern: "horizontal_press",
    source_muscle_metadata_version: 1,
    created_at: "2026-07-20T10:05:00.000Z",
    updated_at: "2026-07-20T10:05:00.000Z",
    ...overrides,
  };
}

function makeSet(overrides: Partial<WorkoutSetRow>): WorkoutSetRow {
  return {
    id: "set-1",
    user_id: "user-1",
    workout_exercise_id: "exercise-1",
    position: 0,
    set_type: "working",
    weight: 225,
    weight_unit: "lb",
    reps: 5,
    rpe: 8,
    is_completed: true,
    notes: null,
    created_at: "2026-07-20T10:10:00.000Z",
    updated_at: "2026-07-20T10:10:00.000Z",
    ...overrides,
  };
}

describe("training strength summary", () => {
  it("computes live bench/squat/deadlift current totals and 1000 club progress", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-10" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-11" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-12" }),
    ];
    const exercises = [
      makeExercise({ id: "bench-ex", workout_id: "w1", exercise_name: "Barbell Bench Press" }),
      makeExercise({ id: "squat-ex", workout_id: "w2", exercise_name: "Back Squat" }),
      makeExercise({ id: "deadlift-ex", workout_id: "w3", exercise_name: "Conventional Deadlift" }),
    ];
    const sets = [
      makeSet({ id: "bench-set", workout_exercise_id: "bench-ex", weight: 235, reps: 3 }),
      makeSet({ id: "squat-set", workout_exercise_id: "squat-ex", weight: 315, reps: 3 }),
      makeSet({ id: "deadlift-set", workout_exercise_id: "deadlift-ex", weight: 405, reps: 3 }),
    ];
    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-13T00:00:00.000Z"),
    });

    expect(summary.bench.current_estimated_one_rep_max).toBeGreaterThan(250);
    expect(summary.squat.current_estimated_one_rep_max).toBeGreaterThan(340);
    expect(summary.deadlift.current_estimated_one_rep_max).toBeGreaterThan(440);
    expect(summary.total_current).toBeGreaterThan(1000);
    expect(summary.thousand_club_progress_percent).toBe(100);
  });

  it("marks lifetime PRs and recent PR indicators", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-01" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-15" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-20" }),
    ];
    const exercises = [
      makeExercise({ id: "e1", workout_id: "w1", exercise_name: "Barbell Bench Press" }),
      makeExercise({ id: "e2", workout_id: "w2", exercise_name: "Barbell Bench Press" }),
      makeExercise({ id: "e3", workout_id: "w3", exercise_name: "Barbell Bench Press" }),
    ];
    const sets = [
      makeSet({ id: "s1", workout_exercise_id: "e1", weight: 205, reps: 5 }),
      makeSet({ id: "s2", workout_exercise_id: "e2", weight: 225, reps: 5 }),
      makeSet({ id: "s3", workout_exercise_id: "e3", weight: 220, reps: 5 }),
    ];
    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-25T00:00:00.000Z"),
    });

    const benchSnapshot = summary.exercise_snapshots.find((snapshot) => snapshot.exercise_name === "Barbell Bench Press");
    expect(benchSnapshot).not.toBeUndefined();
    expect(benchSnapshot?.lifetime_estimated_one_rep_max).toBeGreaterThan(250);
    expect(benchSnapshot?.has_recent_pr).toBe(true);
    expect(summary.latest_pr?.exercise_name).toBe("Barbell Bench Press");
  });
});
