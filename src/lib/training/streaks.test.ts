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
  it("counts same-day duplicate completed workouts once", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-20T09:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-20T18:00:00.000Z" }),
      makeWorkout({ id: "w3", completed_at: "2026-07-19T09:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-20T20:00:00.000Z") })).toBe(2);
  });

  it("computes day streak across consecutive local days", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-20T09:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-19T09:00:00.000Z" }),
      makeWorkout({ id: "w3", completed_at: "2026-07-18T09:00:00.000Z" }),
      makeWorkout({ id: "w4", completed_at: "2026-07-16T09:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-20T20:00:00.000Z") })).toBe(3);
  });

  it("allows streak anchored to yesterday when today is incomplete", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-19T19:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-18T19:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-20T12:00:00.000Z") })).toBe(2);
  });

  it("returns zero for stale day streaks and day gaps", () => {
    const stale = [
      makeWorkout({ id: "w1", completed_at: "2026-07-17T09:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-16T09:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(stale, { timeZone: "UTC", reference: new Date("2026-07-20T12:00:00.000Z") })).toBe(0);

    const gap = [
      makeWorkout({ id: "w3", completed_at: "2026-07-20T09:00:00.000Z" }),
      makeWorkout({ id: "w4", completed_at: "2026-07-18T09:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(gap, { timeZone: "UTC", reference: new Date("2026-07-20T12:00:00.000Z") })).toBe(1);
  });

  it("uses configured timezone for UTC/local midnight crossover", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-20T06:30:00.000Z" }), // 2026-07-19 23:30 PDT
      makeWorkout({ id: "w2", completed_at: "2026-07-19T07:30:00.000Z" }), // 2026-07-19 00:30 PDT
    ];
    expect(
      computeWorkoutDayStreak(workouts, {
        timeZone: "America/Los_Angeles",
        reference: new Date("2026-07-20T16:00:00.000Z"),
      }),
    ).toBe(1);
  });

  it("handles DST transitions using local calendar days", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-11-01T08:30:00.000Z" }), // DST fall-back day
      makeWorkout({ id: "w2", completed_at: "2026-10-31T07:30:00.000Z" }),
    ];
    expect(
      computeWorkoutDayStreak(workouts, {
        timeZone: "America/Los_Angeles",
        reference: new Date("2026-11-01T20:00:00.000Z"),
      }),
    ).toBe(2);
  });

  it("computes consecutive local-week streaks with Monday boundary", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-22T10:00:00.000Z" }), // week of Jul 20
      makeWorkout({ id: "w2", completed_at: "2026-07-15T10:00:00.000Z" }), // week of Jul 13
      makeWorkout({ id: "w3", completed_at: "2026-07-08T10:00:00.000Z" }), // week of Jul 6
    ];
    expect(
      computeWorkoutWeeklyStreak(workouts, {
        timeZone: "UTC",
        reference: new Date("2026-07-23T12:00:00.000Z"),
      }),
    ).toBe(3);
  });

  it("counts duplicate workouts inside one week once", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-22T10:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-21T10:00:00.000Z" }),
      makeWorkout({ id: "w3", completed_at: "2026-07-14T10:00:00.000Z" }),
    ];
    expect(computeWorkoutWeeklyStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-23T12:00:00.000Z") })).toBe(2);
  });

  it("allows weekly streak anchored to previous week when current week has no workout", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-07-16T10:00:00.000Z" }), // previous week
      makeWorkout({ id: "w2", completed_at: "2026-07-08T10:00:00.000Z" }), // week before
    ];
    expect(computeWorkoutWeeklyStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-23T12:00:00.000Z") })).toBe(2);
  });

  it("returns zero weekly streak when gap exists or latest week is stale", () => {
    const weekGap = [
      makeWorkout({ id: "w1", completed_at: "2026-07-22T10:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-07-01T10:00:00.000Z" }),
    ];
    expect(computeWorkoutWeeklyStreak(weekGap, { timeZone: "UTC", reference: new Date("2026-07-23T12:00:00.000Z") })).toBe(1);

    const stale = [makeWorkout({ id: "w3", completed_at: "2026-06-10T10:00:00.000Z" })];
    expect(computeWorkoutWeeklyStreak(stale, { timeZone: "UTC", reference: new Date("2026-07-23T12:00:00.000Z") })).toBe(0);
  });

  it("handles year boundaries for weekly streaks", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2027-01-02T10:00:00.000Z" }),
      makeWorkout({ id: "w2", completed_at: "2026-12-28T10:00:00.000Z" }),
      makeWorkout({ id: "w3", completed_at: "2026-12-22T10:00:00.000Z" }),
    ];
    expect(computeWorkoutWeeklyStreak(workouts, { timeZone: "UTC", reference: new Date("2027-01-03T12:00:00.000Z") })).toBe(2);
  });

  it("ignores missing or invalid completion timestamps safely", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: null }),
      makeWorkout({ id: "w2", completed_at: "not-a-date" }),
      makeWorkout({ id: "w3", completed_at: "2026-07-20T10:00:00.000Z" }),
    ];
    expect(computeWorkoutDayStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-20T12:00:00.000Z") })).toBe(1);
    expect(computeWorkoutWeeklyStreak(workouts, { timeZone: "UTC", reference: new Date("2026-07-20T12:00:00.000Z") })).toBe(1);
  });

  it("uses configured timezone instead of browser/UTC defaults", () => {
    const workouts = [
      makeWorkout({ id: "w1", completed_at: "2026-03-09T06:30:00.000Z" }), // Mar 8 local in LA
      makeWorkout({ id: "w2", completed_at: "2026-03-08T08:30:00.000Z" }), // Mar 8 local in LA
    ];

    expect(
      computeWorkoutDayStreak(workouts, {
        timeZone: "America/Los_Angeles",
        reference: new Date("2026-03-09T18:00:00.000Z"),
      }),
    ).toBe(1);
  });
});
