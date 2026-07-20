import { describe, expect, it } from "vitest";

import { aggregateWorkoutMuscles, buildPrimaryFocusLabel } from "./muscle-aggregation";

describe("workout muscle aggregation", () => {
  it("scores primary and secondary muscles deterministically", () => {
    const result = aggregateWorkoutMuscles([
      {
        exercise_id: "1",
        exercise_name: "Barbell Bench Press",
        primary_muscles: ["chest"],
        secondary_muscles: ["front_delts", "triceps"],
      },
      {
        exercise_id: "2",
        exercise_name: "Triceps Pushdown",
        primary_muscles: ["triceps"],
        secondary_muscles: ["front_delts"],
      },
    ]);

    expect(result.exercise_count).toBe(2);
    expect(result.metadata_coverage).toBe("full");
    expect(result.ranked_muscles.slice(0, 3).map((entry) => entry.muscle)).toEqual([
      "triceps",
      "chest",
      "front_delts",
    ]);
    expect(result.ranked_muscles[0]?.raw_score).toBe(3);
    expect(result.ranked_muscles[0]?.normalized_intensity).toBe(1);
  });

  it("keeps stable ranking when raw scores tie", () => {
    const result = aggregateWorkoutMuscles([
      {
        exercise_id: "1",
        exercise_name: "Lift A",
        primary_muscles: ["lats"],
        secondary_muscles: [],
      },
      {
        exercise_id: "2",
        exercise_name: "Lift B",
        primary_muscles: ["upper_back"],
        secondary_muscles: [],
      },
    ]);

    expect(result.ranked_muscles.map((entry) => entry.muscle)).toEqual(["lats", "upper_back"]);
  });

  it("returns none coverage for empty workouts", () => {
    const result = aggregateWorkoutMuscles([]);
    expect(result.metadata_coverage).toBe("none");
    expect(result.ranked_muscles).toEqual([]);
  });

  it("marks partial coverage when only some exercises include metadata", () => {
    const result = aggregateWorkoutMuscles([
      {
        exercise_id: "1",
        exercise_name: "Old unknown exercise",
        primary_muscles: [],
        secondary_muscles: [],
      },
      {
        exercise_id: "2",
        exercise_name: "Back Squat",
        primary_muscles: ["quads", "glutes"],
        secondary_muscles: ["hamstrings", "adductors", "lower_back"],
      },
    ]);

    expect(result.metadata_coverage).toBe("partial");
    expect(result.exercises_with_metadata).toBe(1);
    expect(result.ranked_muscles.map((entry) => entry.muscle)).toContain("glutes");
  });

  it("recalculates correctly when an exercise is removed", () => {
    const full = aggregateWorkoutMuscles([
      {
        exercise_id: "1",
        exercise_name: "Bench",
        primary_muscles: ["chest"],
        secondary_muscles: ["triceps"],
      },
      {
        exercise_id: "2",
        exercise_name: "Pull-Up",
        primary_muscles: ["lats", "upper_back"],
        secondary_muscles: ["biceps"],
      },
    ]);

    const afterRemove = aggregateWorkoutMuscles([
      {
        exercise_id: "2",
        exercise_name: "Pull-Up",
        primary_muscles: ["lats", "upper_back"],
        secondary_muscles: ["biceps"],
      },
    ]);

    expect(full.ranked_muscles.map((entry) => entry.muscle)).toContain("chest");
    expect(afterRemove.ranked_muscles.map((entry) => entry.muscle)).not.toContain("chest");
  });

  it("builds a top-muscle summary label", () => {
    const result = aggregateWorkoutMuscles([
      {
        exercise_id: "1",
        exercise_name: "Bench",
        primary_muscles: ["chest"],
        secondary_muscles: ["triceps"],
      },
      {
        exercise_id: "2",
        exercise_name: "Dip",
        primary_muscles: ["triceps"],
        secondary_muscles: ["chest"],
      },
    ]);

    expect(buildPrimaryFocusLabel(result)).toBe("Primary focus: chest, triceps");
  });
});
