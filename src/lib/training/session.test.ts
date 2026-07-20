import { describe, expect, it } from "vitest";

import type { WorkoutExerciseRow, WorkoutRow, WorkoutSetRow } from "./types";
import {
  buildDuplicateSetInput,
  buildPreviousPerformanceMap,
  buildWorkoutSummaryStats,
  countCompletedWorkoutsThisWeek,
  groupSetsByWorkoutExerciseId,
  normalizeExerciseName,
  selectMostRecentActiveWorkout,
} from "./session";

function makeWorkout(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: "workout-1",
    user_id: "user-1",
    name: "Workout",
    workout_date: "2026-07-20",
    started_at: "2026-07-20T12:00:00.000Z",
    completed_at: null,
    notes: null,
    created_at: "2026-07-20T12:00:00.000Z",
    updated_at: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

function makeWorkoutExercise(overrides: Partial<WorkoutExerciseRow> = {}): WorkoutExerciseRow {
  return {
    id: "workout-exercise-1",
    user_id: "user-1",
    workout_id: "workout-1",
    exercise_id: "exercise-1",
    exercise_name: "Bench Press",
    position: 0,
    notes: null,
    created_at: "2026-07-20T12:01:00.000Z",
    updated_at: "2026-07-20T12:01:00.000Z",
    ...overrides,
  };
}

function makeWorkoutSet(overrides: Partial<WorkoutSetRow> = {}): WorkoutSetRow {
  return {
    id: "set-1",
    user_id: "user-1",
    workout_exercise_id: "workout-exercise-1",
    position: 0,
    set_type: "working",
    weight: 225,
    weight_unit: "lb",
    reps: 5,
    rpe: 8,
    is_completed: true,
    notes: null,
    created_at: "2026-07-20T12:02:00.000Z",
    updated_at: "2026-07-20T12:02:00.000Z",
    ...overrides,
  };
}

describe("training session helpers", () => {
  it("selects most recent active workout by started time", () => {
    const selection = selectMostRecentActiveWorkout([
      makeWorkout({ id: "older-active", started_at: "2026-07-20T10:00:00.000Z" }),
      makeWorkout({ id: "completed", completed_at: "2026-07-20T13:00:00.000Z" }),
      makeWorkout({ id: "newer-active", started_at: "2026-07-20T12:30:00.000Z" }),
    ]);

    expect(selection?.id).toBe("newer-active");
  });

  it("counts completed workouts in the current Monday-Sunday week", () => {
    const count = countCompletedWorkoutsThisWeek(
      [
        makeWorkout({ id: "w1", workout_date: "2026-07-20", completed_at: "2026-07-20T13:00:00.000Z" }),
        makeWorkout({ id: "w2", workout_date: "2026-07-19", completed_at: "2026-07-19T13:00:00.000Z" }),
        makeWorkout({ id: "w3", workout_date: "2026-07-21", completed_at: null }),
      ],
      new Date("2026-07-22T09:00:00.000Z"),
    );

    expect(count).toBe(1);
  });

  it("duplicates a set while forcing incomplete status", () => {
    const source = makeWorkoutSet({
      set_type: "top",
      weight: 275,
      weight_unit: "lb",
      reps: 3,
      rpe: 9,
      is_completed: true,
      notes: "Heavy set",
    });
    const duplicate = buildDuplicateSetInput(source, 4);

    expect(duplicate).toMatchObject({
      position: 4,
      set_type: "top",
      weight: 275,
      weight_unit: "lb",
      reps: 3,
      rpe: 9,
      notes: "Heavy set",
      is_completed: false,
    });
  });

  it("matches previous performance by exercise id first, then normalized snapshot name", () => {
    const currentExercises = [
      makeWorkoutExercise({ id: "current-1", workout_id: "current-workout", exercise_id: "bench-id", exercise_name: "Bench Press" }),
      makeWorkoutExercise({
        id: "current-2",
        workout_id: "current-workout",
        exercise_id: null,
        exercise_name: "  incline dumbbell press ",
      }),
    ];
    const historicalWorkouts = [
      makeWorkout({ id: "history-1", workout_date: "2026-07-18", completed_at: "2026-07-18T10:00:00.000Z" }),
      makeWorkout({ id: "history-2", workout_date: "2026-07-15", completed_at: "2026-07-15T10:00:00.000Z" }),
    ];
    const historicalExercises = [
      makeWorkoutExercise({
        id: "history-ex-1",
        workout_id: "history-1",
        exercise_id: "bench-id",
        exercise_name: "Flat Bench",
      }),
      makeWorkoutExercise({
        id: "history-ex-2",
        workout_id: "history-2",
        exercise_id: null,
        exercise_name: "Incline Dumbbell Press",
      }),
    ];
    const historicalSets = [
      makeWorkoutSet({ id: "hs-1", workout_exercise_id: "history-ex-1", weight: 245, reps: 3 }),
      makeWorkoutSet({ id: "hs-2", workout_exercise_id: "history-ex-2", weight: 95, reps: 8 }),
    ];

    const map = buildPreviousPerformanceMap({
      currentExercises,
      historicalWorkouts,
      historicalExercises,
      historicalSets,
      displayUnit: "lb",
    });

    expect(map.get("current-1")?.latestWorkoutDate).toBe("2026-07-18");
    expect(map.get("current-2")?.latestWorkoutDate).toBe("2026-07-15");
    expect(map.get("current-1")?.previousBestEstimatedOneRepMax).toBeGreaterThan(260);
    expect(map.get("current-2")?.previousBestEstimatedOneRepMax).toBeGreaterThan(100);
  });

  it("matches previous performance by catalog exercise id", () => {
    const currentExercises = [
      makeWorkoutExercise({
        id: "current-catalog",
        workout_id: "current-workout",
        exercise_id: null,
        exercise_name: "Lat Pulldown",
      }) as WorkoutExerciseRow & { catalog_exercise_id: string | null },
    ];
    currentExercises[0].catalog_exercise_id = "catalog-lat-pulldown";

    const historicalWorkouts = [
      makeWorkout({ id: "history-catalog", workout_date: "2026-07-10", completed_at: "2026-07-10T10:00:00.000Z" }),
    ];

    const historicalExercise = makeWorkoutExercise({
      id: "history-catalog-exercise",
      workout_id: "history-catalog",
      exercise_id: null,
      exercise_name: "Wide Grip Pulldown",
    }) as WorkoutExerciseRow & { catalog_exercise_id: string | null };
    historicalExercise.catalog_exercise_id = "catalog-lat-pulldown";

    const map = buildPreviousPerformanceMap({
      currentExercises,
      historicalWorkouts,
      historicalExercises: [historicalExercise],
      historicalSets: [makeWorkoutSet({ workout_exercise_id: "history-catalog-exercise", weight: 180, reps: 8 })],
      displayUnit: "lb",
    });

    expect(map.get("current-catalog")?.latestWorkoutDate).toBe("2026-07-10");
    expect(map.get("current-catalog")?.previousBestEstimatedOneRepMax).toBeGreaterThan(220);
  });

  it("builds workout summary totals and potential PR count", () => {
    const workout = makeWorkout({
      id: "current-workout",
      started_at: "2026-07-20T12:00:00.000Z",
      completed_at: "2026-07-20T13:00:00.000Z",
    });
    const exercises = [makeWorkoutExercise({ id: "current-ex-1", exercise_id: "bench-id" })];
    const currentSets = [
      makeWorkoutSet({ id: "current-set-1", workout_exercise_id: "current-ex-1", weight: 255, reps: 3, is_completed: true }),
      makeWorkoutSet({ id: "current-set-2", workout_exercise_id: "current-ex-1", weight: 135, reps: 8, is_completed: false }),
    ];
    const historicalWorkouts = [makeWorkout({ id: "history-workout", workout_date: "2026-07-10", completed_at: "2026-07-10T13:00:00.000Z" })];
    const historicalExercises = [makeWorkoutExercise({ id: "history-exercise", workout_id: "history-workout", exercise_id: "bench-id" })];
    const historicalSets = [makeWorkoutSet({ id: "history-set", workout_exercise_id: "history-exercise", weight: 235, reps: 3 })];
    const previousMap = buildPreviousPerformanceMap({
      currentExercises: exercises,
      historicalWorkouts,
      historicalExercises,
      historicalSets,
      displayUnit: "lb",
    });

    const summary = buildWorkoutSummaryStats({
      workout,
      exercises,
      setsByExerciseId: groupSetsByWorkoutExerciseId(currentSets),
      displayUnit: "lb",
      previousPerformanceMap: previousMap,
    });

    expect(summary.exerciseCount).toBe(1);
    expect(summary.totalSetCount).toBe(2);
    expect(summary.completedSetCount).toBe(1);
    expect(summary.meaningfulCompletedSetCount).toBe(1);
    expect(summary.totalVolume).toBe(765);
    expect(summary.bestEstimatedOneRepMax).toBeGreaterThan(280);
    expect(summary.potentialPrCount).toBe(1);
    expect(summary.durationMinutes).toBe(60);
  });

  it("normalizes snapshot names consistently", () => {
    expect(normalizeExerciseName("  BARBELL Row  ")).toBe("barbell row");
    expect(normalizeExerciseName(null)).toBe("");
  });

  it("groups and sorts sets by exercise and position", () => {
    const grouped = groupSetsByWorkoutExerciseId([
      makeWorkoutSet({
        id: "s2",
        workout_exercise_id: "exercise-a",
        position: 2,
        created_at: "2026-07-20T12:03:00.000Z",
      }),
      makeWorkoutSet({
        id: "s1",
        workout_exercise_id: "exercise-a",
        position: 1,
        created_at: "2026-07-20T12:02:00.000Z",
      }),
      makeWorkoutSet({
        id: "s3",
        workout_exercise_id: "exercise-b",
        position: 0,
        created_at: "2026-07-20T12:01:00.000Z",
      }),
    ]);

    expect(grouped.get("exercise-a")?.map((set) => set.id)).toEqual(["s1", "s2"]);
    expect(grouped.get("exercise-b")?.map((set) => set.id)).toEqual(["s3"]);
  });
});
