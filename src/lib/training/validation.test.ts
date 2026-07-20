import { describe, expect, it } from "vitest";

import {
  normalizeExerciseInput,
  normalizeWorkoutExerciseInput,
  normalizeWorkoutInput,
  normalizeWorkoutSetInput,
} from "./validation";

describe("training validation - exercises", () => {
  it("normalizes valid exercise fields", () => {
    const result = normalizeExerciseInput({
      name: "  Bench Press  ",
      muscle_group: "  Chest ",
      equipment: " Barbell ",
      notes: " Main lift ",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      name: "Bench Press",
      muscle_group: "Chest",
      equipment: "Barbell",
      notes: "Main lift",
    });
  });

  it("rejects blank exercise name", () => {
    const result = normalizeExerciseInput({
      name: " ",
      muscle_group: null,
      equipment: null,
      notes: null,
    });

    expect(result.data).toBeNull();
    expect(result.errors.name).toBeDefined();
  });
});

describe("training validation - workouts", () => {
  it("normalizes workout with optional fields", () => {
    const result = normalizeWorkoutInput({
      name: " Push Day ",
      workout_date: "2026-07-20",
      started_at: "2026-07-20T16:00:00.000Z",
      completed_at: "2026-07-20T17:00:00.000Z",
      notes: "  Solid session  ",
    });

    expect(result.errors).toEqual({});
    expect(result.data?.name).toBe("Push Day");
    expect(result.data?.notes).toBe("Solid session");
  });

  it("rejects completed_at before started_at", () => {
    const result = normalizeWorkoutInput({
      name: "Leg Day",
      workout_date: "2026-07-20",
      started_at: "2026-07-20T17:00:00.000Z",
      completed_at: "2026-07-20T16:00:00.000Z",
    });

    expect(result.data).toBeNull();
    expect(result.errors.completed_at).toContain("cannot be before");
  });
});

describe("training validation - workout exercises", () => {
  it("normalizes valid workout exercise input", () => {
    const result = normalizeWorkoutExerciseInput({
      exercise_id: "8f898f9f-c4d5-4cbc-a98a-4eb9003c1478",
      exercise_name: "  Incline Dumbbell Press ",
      position: "2",
      notes: "  keep elbows tucked ",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      exercise_id: "8f898f9f-c4d5-4cbc-a98a-4eb9003c1478",
      exercise_name: "Incline Dumbbell Press",
      position: 2,
      notes: "keep elbows tucked",
    });
  });

  it("rejects invalid workout exercise position", () => {
    const result = normalizeWorkoutExerciseInput({
      exercise_name: "Row",
      position: "-1",
    });

    expect(result.data).toBeNull();
    expect(result.errors.position).toBeDefined();
  });
});

describe("training validation - sets", () => {
  it("normalizes valid completed set", () => {
    const result = normalizeWorkoutSetInput({
      position: "0",
      set_type: "working",
      weight: "225",
      weight_unit: "lb",
      reps: "5",
      rpe: "8.5",
      is_completed: "true",
      notes: "  solid  ",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      position: 0,
      set_type: "working",
      weight: 225,
      weight_unit: "lb",
      reps: 5,
      rpe: 8.5,
      is_completed: true,
      notes: "solid",
    });
  });

  it("normalizes blank optional fields to null", () => {
    const result = normalizeWorkoutSetInput({
      position: 1,
      set_type: "warmup",
      weight: "",
      weight_unit: "",
      reps: "",
      rpe: "",
      is_completed: false,
      notes: " ",
    });

    expect(result.errors).toEqual({});
    expect(result.data?.weight).toBeNull();
    expect(result.data?.weight_unit).toBeNull();
    expect(result.data?.reps).toBeNull();
    expect(result.data?.rpe).toBeNull();
    expect(result.data?.notes).toBeNull();
  });

  it("rejects invalid weight unit and non-numeric fields", () => {
    const result = normalizeWorkoutSetInput({
      position: "abc",
      set_type: "unknown",
      weight: "-10",
      weight_unit: "stone",
      reps: "-1",
      rpe: "11",
      is_completed: true,
      notes: "",
    });

    expect(result.data).toBeNull();
    expect(result.errors.position).toBeDefined();
    expect(result.errors.set_type).toBeDefined();
    expect(result.errors.weight).toBeDefined();
    expect(result.errors.weight_unit).toBeDefined();
    expect(result.errors.reps).toBeDefined();
    expect(result.errors.rpe).toBeDefined();
  });

  it("requires meaningful content on completed sets", () => {
    const result = normalizeWorkoutSetInput({
      position: 2,
      set_type: "working",
      is_completed: true,
      weight: "",
      reps: "",
      notes: " ",
    });

    expect(result.data).toBeNull();
    expect(result.errors.is_completed).toContain("require reps, weight, or a note");
  });
});
