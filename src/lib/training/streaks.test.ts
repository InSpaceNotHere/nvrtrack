import { describe, expect, it } from "vitest";

import type { WorkoutRow } from "./types";
import { computeWorkoutDayStreak, computeWorkoutWeeklyStreak } from "./streaks";

function makeWorkout(overrides: Partial<WorkoutRow>): WorkoutRow {
  return {
    id: "w1",
    user_id: "user-1",
    name: "Workout",
    workout_date: "2026-07-20",
    started_at: "2026-07-20T09:00:00.000Z",
    completed_at: "2026-07-20T10:00:00.000Z",
    notes: null,
    created_at: "2026-07-20T09:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("training streak calculators", () => {
  it("computes consecutive day streak", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-20" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-19" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-18" }),
      makeWorkout({ id: "w4", workout_date: "2026-07-16" }),
    ];
    expect(computeWorkoutDayStreak(workouts, "2026-07-20")).toBe(3);
  });

  it("computes weekly streak from current week backwards", () => {
    const workouts = [
      makeWorkout({ id: "w1", workout_date: "2026-07-20" }),
      makeWorkout({ id: "w2", workout_date: "2026-07-13" }),
      makeWorkout({ id: "w3", workout_date: "2026-07-06" }),
      makeWorkout({ id: "w4", workout_date: "2026-06-22" }),
    ];
    expect(computeWorkoutWeeklyStreak(workouts, "2026-07-20")).toBe(3);
  });
});
