import { describe, expect, it } from "vitest";

import {
  formatTodayWorkoutHeadline,
  resolveHomeTodayWorkout,
  type ResolveHomeTodayWorkoutInput,
} from "./home-today-workout";
import type { PlannerDayPlan } from "./planner";

function buildInput(overrides: Partial<ResolveHomeTodayWorkoutInput> = {}): ResolveHomeTodayWorkoutInput {
  return {
    todayDate: "2026-09-21",
    weekdayLabel: "Monday",
    todayPlan: null,
    activeWorkout: null,
    todaysCompletedWorkout: null,
    plannerUninitialized: false,
    ...overrides,
  };
}

function buildPlan(overrides: Partial<PlannerDayPlan> = {}): PlannerDayPlan {
  return {
    date: "2026-09-21",
    weekday: 1,
    weekday_label: "Monday",
    status: "scheduled",
    template_id: "template-push",
    template_name: "Push",
    template_type: "push",
    estimated_duration_minutes: 60,
    exercise_count: 6,
    muscle_targeting: {
      exercise_count: 0,
      exercises_with_metadata: 0,
      metadata_coverage: "none",
      strongest_score: 0,
      ranked_muscles: [],
      primary_targeted_muscles: [],
      secondary_targeted_muscles: [],
    },
    workout_id: null,
    moved_to_date: null,
    moved_from_date: null,
    ...overrides,
  };
}

describe("resolveHomeTodayWorkout", () => {
  it("returns scheduled state when a template is planned for today", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({ template_name: "Classic PPL Push" }),
      }),
    );

    expect(resolved.state).toBe("scheduled");
    expect(formatTodayWorkoutHeadline(resolved)).toBe("Monday — Classic PPL Push");
  });

  it("returns active when the scheduled workout is in progress", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({ template_name: "Push Day" }),
        activeWorkout: {
          id: "workout-active",
          name: "Push Day",
          workout_date: "2026-09-21",
        },
      }),
    );

    expect(resolved.state).toBe("active");
    expect(resolved.workoutId).toBe("workout-active");
    expect(resolved.isActiveWorkoutSameAsPlanned).toBe(true);
    expect(resolved.scheduledContextName).toBeNull();
  });

  it("prioritizes active workout when a different workout is in progress", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({ template_name: "Push Day" }),
        activeWorkout: {
          id: "workout-travel",
          name: "Hotel Pump",
          workout_date: "2026-09-21",
        },
      }),
    );

    expect(resolved.state).toBe("active");
    expect(resolved.workoutName).toBe("Hotel Pump");
    expect(formatTodayWorkoutHeadline(resolved)).toBe("Hotel Pump");
    expect(resolved.isActiveWorkoutSameAsPlanned).toBe(false);
    expect(resolved.scheduledContextName).toBe("Push Day");
  });

  it("returns completed state when today's scheduled workout is completed", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({ template_name: "Full Body Basics Day 1", workout_id: "workout-complete" }),
        todaysCompletedWorkout: {
          id: "workout-complete",
          name: "Full Body Basics Day 1",
          workout_date: "2026-09-21",
        },
      }),
    );

    expect(resolved.state).toBe("completed");
    expect(resolved.workoutId).toBe("workout-complete");
    expect(resolved.scheduledContextName).toBeNull();
  });

  it("returns rest state for resolved rest days", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({
          status: "rest",
          template_id: null,
          template_name: null,
          template_type: null,
        }),
      }),
    );

    expect(resolved.state).toBe("rest");
    expect(formatTodayWorkoutHeadline(resolved)).toBe("Monday — Rest Day");
    expect(resolved.scheduledContextName).toBeNull();
  });

  it("returns skipped state for explicit skipped overrides", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({
          status: "skipped",
          template_name: "Legs",
        }),
      }),
    );

    expect(resolved.state).toBe("skipped");
  });

  it("returns moved state for explicit moved overrides", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({
          status: "moved",
          template_name: "Upper",
          moved_to_date: "2026-09-22",
        }),
      }),
    );

    expect(resolved.state).toBe("moved");
  });

  it("keeps an active workout even when no program is assigned", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        plannerUninitialized: true,
        activeWorkout: {
          id: "workout-active",
          name: "Hotel Pump",
          workout_date: "2026-09-21",
        },
      }),
    );

    expect(resolved.state).toBe("active");
    expect(resolved.workoutName).toBe("Hotel Pump");
  });

  it("returns no_program when the planner is uninitialized and nothing is in progress", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        plannerUninitialized: true,
      }),
    );

    expect(resolved.state).toBe("no_program");
    expect(formatTodayWorkoutHeadline(resolved)).toBe("No workout planned today");
  });

  it("returns to scheduled state once an unrelated active workout is gone", () => {
    const resolved = resolveHomeTodayWorkout(
      buildInput({
        todayPlan: buildPlan({ template_name: "Push Day" }),
        activeWorkout: null,
      }),
    );

    expect(resolved.state).toBe("scheduled");
    expect(formatTodayWorkoutHeadline(resolved)).toBe("Monday — Push Day");
    expect(resolved.scheduledContextName).toBeNull();
  });
});
