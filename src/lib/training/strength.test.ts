import { describe, expect, it } from "vitest";

import type { WorkoutExerciseRow, WorkoutRow, WorkoutSetRow } from "./types";
import { buildStrengthDashboardSummary, buildStrengthDashboardSummaryFromHistoryRows } from "./strength";
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
  } as WorkoutExerciseRow;
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
  it("keeps lifetime semantics identical when built from focused strength history rows", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-01" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-08" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-15", completed_at: null }),
    ];
    const exercises = [
      { ...makeExercise({ id: "e1", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
      { ...makeExercise({ id: "e2", workout_id: "w2", exercise_name: "Back Squat" }), source_canonical_lift: "squat" },
      { ...makeExercise({ id: "e3", workout_id: "w3", exercise_name: "Conventional Deadlift" }), source_canonical_lift: "deadlift" },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "s1", workout_exercise_id: "e1", weight: 225, reps: 5 }),
      makeSet({ id: "s2", workout_exercise_id: "e1", weight: 245, reps: 1 }),
      makeSet({ id: "s3", workout_exercise_id: "e2", weight: 315, reps: 3 }),
      makeSet({ id: "s4", workout_exercise_id: "e2", weight: 335, reps: 1 }),
      makeSet({ id: "s5", workout_exercise_id: "e3", weight: 405, reps: 1, is_completed: false }),
    ];

    const fromGraph = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-20T00:00:00.000Z"),
    });

    const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const historyRows = sets
      .filter((set) => set.is_completed && (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0)
      .map((set) => {
        const exercise = exerciseById.get(set.workout_exercise_id)!;
        const workout = workoutById.get(exercise.workout_id)!;
        return {
          workout: {
            id: workout.id,
            name: workout.name,
            workout_date: workout.workout_date,
            started_at: workout.started_at,
            completed_at: workout.completed_at,
            created_at: workout.created_at,
          },
          exercise: {
            id: exercise.id,
            workout_id: exercise.workout_id,
            exercise_id: exercise.exercise_id,
            catalog_exercise_id: exercise.catalog_exercise_id,
            exercise_name: exercise.exercise_name,
            source_canonical_lift: (exercise as WorkoutExerciseRow & { source_canonical_lift?: string | null }).source_canonical_lift ?? null,
          },
          set,
        };
      });

    const fromFocusedRows = buildStrengthDashboardSummaryFromHistoryRows({
      rows: historyRows,
      displayUnit: "lb",
      referenceDate: new Date("2026-07-20T00:00:00.000Z"),
    });

    expect(fromFocusedRows).toEqual(fromGraph);
  });

  it("uses canonical lift metadata and excludes similarly named non-canonical variations", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-10" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-11" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-12" }),
      makeWorkout({ id: "w4", workout_date: "2026-07-13" }),
    ];
    const exercises = [
      { ...makeExercise({ id: "bench-ex", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
      { ...makeExercise({ id: "incline-ex", workout_id: "w2", exercise_name: "Incline Bench Press" }), source_canonical_lift: null },
      { ...makeExercise({ id: "squat-ex", workout_id: "w3", exercise_name: "Back Squat" }), source_canonical_lift: "squat" },
      { ...makeExercise({ id: "deadlift-ex", workout_id: "w4", exercise_name: "Conventional Deadlift" }), source_canonical_lift: "deadlift" },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "bench-set", workout_exercise_id: "bench-ex", weight: 250, reps: 1 }),
      makeSet({ id: "incline-set", workout_exercise_id: "incline-ex", weight: 315, reps: 1 }),
      makeSet({ id: "squat-set", workout_exercise_id: "squat-ex", weight: 350, reps: 1 }),
      makeSet({ id: "deadlift-set", workout_exercise_id: "deadlift-ex", weight: 410, reps: 1 }),
    ];
    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-13T00:00:00.000Z"),
    });

    expect(summary.bench.lifetime_tested_one_rep_max).toBe(250);
    expect(summary.squat.lifetime_tested_one_rep_max).toBe(350);
    expect(summary.deadlift.lifetime_tested_one_rep_max).toBe(410);
    expect(summary.bench.lifetime_tested_one_rep_max).not.toBe(315);
    expect(summary.total_tested).toBe(1010);
    expect(summary.thousand_club_progress_percent).toBe(100);
  });

  it("separates tested 1RM from estimated 1RM", () => {
    const workouts = [makeWorkout({ id: "w1", workout_date: "2026-07-20" })];
    const exercises = [
      { ...makeExercise({ id: "e1", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
    ] as WorkoutExerciseRow[];
    const sets = [makeSet({ id: "s1", workout_exercise_id: "e1", weight: 225, reps: 5 })];
    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-20T00:00:00.000Z"),
    });

    expect(summary.bench.lifetime_tested_one_rep_max).toBeNull();
    expect(summary.bench.lifetime_estimated_one_rep_max).toBe(262.5);
    expect(summary.total_tested).toBeNull();
  });

  it("calculates rep PRs by exact rep count and tracks lifetime heaviest weight", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-01" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-08" }),
    ];
    const exercises = [
      { ...makeExercise({ id: "e1", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
      { ...makeExercise({ id: "e2", workout_id: "w2", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "s1", workout_exercise_id: "e1", weight: 215, reps: 5 }),
      makeSet({ id: "s2", workout_exercise_id: "e2", weight: 225, reps: 4 }),
      makeSet({ id: "s3", workout_exercise_id: "e2", weight: 220, reps: 5 }),
    ];

    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
      referenceDate: new Date("2026-07-08T00:00:00.000Z"),
    });

    const benchSnapshot = summary.exercise_snapshots.find((snapshot) => snapshot.exercise_name === "Barbell Bench Press");
    expect(benchSnapshot?.rep_prs_by_reps["5"]).toBe(220);
    expect(benchSnapshot?.rep_prs_by_reps["4"]).toBe(225);
    expect(benchSnapshot?.heaviest_weight).toBe(225);
  });

  it("applies Epley estimate only within the configured rep limit", () => {
    const workouts = [makeWorkout({ id: "w1", workout_date: "2026-07-20" })];
    const exercises = [
      { ...makeExercise({ id: "e1", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "s1", workout_exercise_id: "e1", weight: 135, reps: 20 }),
      makeSet({ id: "s2", workout_exercise_id: "e1", weight: 185, reps: 8 }),
    ];

    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
    });

    expect(summary.bench.lifetime_estimated_one_rep_max).toBe(234.33);
  });

  it("normalizes units before strict tested 1000 LB Club qualification", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-10" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-11" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-12" }),
    ];
    const exercises = [
      { ...makeExercise({ id: "b1", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
      { ...makeExercise({ id: "s1", workout_id: "w2", exercise_name: "Back Squat" }), source_canonical_lift: "squat" },
      { ...makeExercise({ id: "d1", workout_id: "w3", exercise_name: "Conventional Deadlift" }), source_canonical_lift: "deadlift" },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "sb", workout_exercise_id: "b1", weight: 120, weight_unit: "kg", reps: 1 }),
      makeSet({ id: "ss", workout_exercise_id: "s1", weight: 160, weight_unit: "kg", reps: 1 }),
      makeSet({ id: "sd", workout_exercise_id: "d1", weight: 190, weight_unit: "kg", reps: 1 }),
    ];

    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
    });

    expect(summary.total_tested).toBe(1036.17);
    expect(summary.thousand_club_progress_percent).toBe(100);
  });

  it("requires all three canonical tested lifts and preserves ambiguous historical exercises as unclassified", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-10" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-11" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-12" }),
    ];
    const exercises = [
      { ...makeExercise({ id: "bench", workout_id: "w1", exercise_name: "Barbell Bench Press" }), source_canonical_lift: "bench_press" },
      { ...makeExercise({ id: "squat", workout_id: "w2", exercise_name: "Back Squat" }), source_canonical_lift: "squat" },
      { ...makeExercise({ id: "ambiguous", workout_id: "w3", exercise_name: "Bench Press" }), source_canonical_lift: null },
    ] as WorkoutExerciseRow[];
    const sets = [
      makeSet({ id: "sb", workout_exercise_id: "bench", weight: 245, reps: 1 }),
      makeSet({ id: "ss", workout_exercise_id: "squat", weight: 335, reps: 1 }),
      makeSet({ id: "sa", workout_exercise_id: "ambiguous", weight: 255, reps: 1 }),
    ];

    const summary = buildStrengthDashboardSummary({
      workouts,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(sets),
      displayUnit: "lb",
    });

    expect(summary.total_tested).toBeNull();
    expect(summary.deadlift.lifetime_tested_one_rep_max).toBeNull();
    const ambiguousSnapshot = summary.exercise_snapshots.find((snapshot) => snapshot.exercise_name === "Bench Press");
    expect(ambiguousSnapshot?.canonical_lift).toBeNull();
  });
});
