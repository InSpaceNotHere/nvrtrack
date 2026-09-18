import { describe, expect, it } from "vitest";

import {
  calculateExerciseVolume,
  calculateSetVolume,
  calculateWorkoutVolume,
  estimateSetOneRepMax,
  evaluatePersonalRecordCandidate,
  findBestCompletedSetByEstimatedOneRepMax,
  sortWorkoutsForHistory,
} from "./calculations";
import type { WorkoutSetLike } from "./types";

function makeSet(overrides: Partial<WorkoutSetLike> = {}): WorkoutSetLike {
  return {
    position: 0,
    set_type: "working",
    weight: 225,
    weight_unit: "lb",
    reps: 5,
    is_completed: true,
    notes: null,
    ...overrides,
  };
}

describe("training calculations - volume", () => {
  it("calculates set volume", () => {
    expect(calculateSetVolume(makeSet(), "lb")).toBe(1125);
  });

  it("returns null for incomplete or weightless sets", () => {
    expect(calculateSetVolume(makeSet({ is_completed: false }), "lb")).toBeNull();
    expect(calculateSetVolume(makeSet({ weight: null }), "lb")).toBeNull();
    expect(calculateSetVolume(makeSet({ reps: null }), "lb")).toBeNull();
  });

  it("converts mixed units for exercise volume", () => {
    const volume = calculateExerciseVolume(
      [
        makeSet({ weight: 100, weight_unit: "kg", reps: 5 }),
        makeSet({ weight: 220.46, weight_unit: "lb", reps: 5 }),
      ],
      "lb",
    );

    expect(volume).toBe(2204.61);
  });

  it("returns null for exercise with no valid completed weighted sets", () => {
    const volume = calculateExerciseVolume([makeSet({ is_completed: false })], "lb");
    expect(volume).toBeNull();
  });

  it("calculates workout volume from exercise groups", () => {
    const volume = calculateWorkoutVolume(
      [
        { sets: [makeSet({ weight: 225, reps: 5 })] },
        { sets: [makeSet({ weight: 185, reps: 8 })] },
      ],
      "lb",
    );

    expect(volume).toBe(2605);
  });

  it("returns null for empty workout volume", () => {
    expect(calculateWorkoutVolume([], "lb")).toBeNull();
  });
});

describe("training calculations - one-rep max", () => {
  it("uses Epley formula for reps above one", () => {
    const estimate = estimateSetOneRepMax(makeSet({ weight: 200, reps: 5 }), "lb");
    expect(estimate?.estimatedOneRepMax).toBe(233.33);
  });

  it("uses entered weight for single rep sets", () => {
    const estimate = estimateSetOneRepMax(makeSet({ weight: 315, reps: 1 }), "lb");
    expect(estimate?.estimatedOneRepMax).toBe(315);
  });

  it("ignores invalid one-rep max sets", () => {
    expect(estimateSetOneRepMax(makeSet({ reps: 0 }), "lb")).toBeNull();
    expect(estimateSetOneRepMax(makeSet({ is_completed: false }), "lb")).toBeNull();
  });
});

describe("training calculations - best set and PR candidate", () => {
  it("selects best set by highest estimated one-rep max", () => {
    const best = findBestCompletedSetByEstimatedOneRepMax(
      [
        makeSet({ weight: 225, reps: 5 }),
        makeSet({ weight: 245, reps: 3 }),
        makeSet({ weight: 265, reps: 1 }),
      ],
      "lb",
    );

    expect(best?.estimatedOneRepMax).toBe(269.5);
    expect(best?.set.weight).toBe(245);
  });

  it("returns neutral result for empty best-set input", () => {
    expect(findBestCompletedSetByEstimatedOneRepMax([], "lb")).toBeNull();
  });

  it("marks candidate as PR when it beats prior best for same exercise id", () => {
    const result = evaluatePersonalRecordCandidate(
      makeSet({ exercise_id: "exercise-1", weight: 250, reps: 4 }),
      [
        makeSet({ exercise_id: "exercise-1", weight: 235, reps: 4 }),
        makeSet({ exercise_id: "exercise-1", weight: 245, reps: 2 }),
      ],
      "lb",
    );

    expect(result.isPr).toBe(true);
    expect(result.candidateEstimatedOneRepMax).toBe(283.33);
    expect(result.previousBestEstimatedOneRepMax).toBe(266.33);
  });

  it("uses snapshot name matching when exercise id is absent", () => {
    const result = evaluatePersonalRecordCandidate(
      makeSet({ exercise_id: null, exercise_name: "Bench Press", weight: 225, reps: 6 }),
      [
        makeSet({ exercise_id: null, exercise_name: "bench press", weight: 220, reps: 6 }),
        makeSet({ exercise_id: null, exercise_name: "squat", weight: 315, reps: 3 }),
      ],
      "lb",
    );

    expect(result.isPr).toBe(true);
    expect(result.previousBestEstimatedOneRepMax).toBe(264);
  });

  it("matches historical sets by catalog exercise id before name fallback", () => {
    const result = evaluatePersonalRecordCandidate(
      makeSet({
        catalog_exercise_id: "catalog-1",
        exercise_id: null,
        exercise_name: "Lat Pulldown",
        weight: 180,
        reps: 8,
      }),
      [
        makeSet({
          catalog_exercise_id: "catalog-1",
          exercise_id: null,
          exercise_name: "Wide Grip Pulldown",
          weight: 170,
          reps: 8,
        }),
        makeSet({
          catalog_exercise_id: "catalog-2",
          exercise_id: null,
          exercise_name: "Lat Pulldown",
          weight: 250,
          reps: 2,
        }),
      ],
      "lb",
    );

    expect(result.previousBestEstimatedOneRepMax).toBe(215.33);
    expect(result.isPr).toBe(true);
  });
});

describe("training calculations - history ordering", () => {
  it("sorts workouts by date desc, then started_at desc, then created_at desc", () => {
    const sorted = sortWorkoutsForHistory([
      {
        id: "w3",
        workout_date: "2026-07-18",
        started_at: null,
        created_at: "2026-07-18T10:00:00.000Z",
      },
      {
        id: "w2",
        workout_date: "2026-07-19",
        started_at: "2026-07-19T14:00:00.000Z",
        created_at: "2026-07-19T13:00:00.000Z",
      },
      {
        id: "w1",
        workout_date: "2026-07-19",
        started_at: "2026-07-19T15:00:00.000Z",
        created_at: "2026-07-19T12:00:00.000Z",
      },
      {
        id: "w4",
        workout_date: "2026-07-19",
        started_at: "2026-07-19T15:00:00.000Z",
        created_at: "2026-07-19T16:00:00.000Z",
      },
    ]);

    expect(sorted.map((workout) => workout.id)).toEqual(["w4", "w1", "w2", "w3"]);
  });
});
