import { describe, expect, it } from "vitest";

import {
  BODY_REGIONS,
  MOVEMENT_PATTERNS,
  MUSCLE_TAXONOMY,
  coerceMuscleIdArray,
  normalizeExerciseMuscleMetadata,
} from "./muscles";

describe("training muscles taxonomy", () => {
  it("keeps a controlled finite taxonomy", () => {
    expect(MUSCLE_TAXONOMY).toContain("chest");
    expect(MUSCLE_TAXONOMY).toContain("lower_back");
    expect(MUSCLE_TAXONOMY).toContain("hip_flexors");
    expect(BODY_REGIONS).toContain("upper_body");
    expect(MOVEMENT_PATTERNS).toContain("horizontal_press");
  });

  it("normalizes and deduplicates muscles", () => {
    expect(coerceMuscleIdArray([" Chest ", "chest", "TRICEPS", "unknown"])).toEqual(["chest", "triceps"]);
  });
});

describe("training muscles metadata validation", () => {
  it("rejects invalid muscle values", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: ["chest", "not_real"],
      secondary_muscles: [],
      require_primary_muscles: true,
    });

    expect(result.data).toBeNull();
    expect(result.errors.primary_muscles).toContain("unsupported");
  });

  it("rejects overlap between primary and secondary", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: ["chest"],
      secondary_muscles: ["front_delts", "chest"],
      require_primary_muscles: true,
    });

    expect(result.data).toBeNull();
    expect(result.errors.secondary_muscles).toContain("both primary and secondary");
  });

  it("requires primary muscles when explicitly requested", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: [],
      secondary_muscles: [],
      require_primary_muscles: true,
    });

    expect(result.data).toBeNull();
    expect(result.errors.primary_muscles).toContain("at least one primary");
  });

  it("allows legacy empty muscle metadata for backward compatibility", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: [],
      secondary_muscles: [],
      body_region: null,
      movement_pattern: null,
      require_primary_muscles: false,
    });

    expect(result.errors).toEqual({});
    expect(result.data?.primary_muscles).toEqual([]);
    expect(result.data?.secondary_muscles).toEqual([]);
  });

  it("rejects unsupported body region and movement pattern", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: ["quads"],
      secondary_muscles: [],
      body_region: "legs",
      movement_pattern: "pressing",
      require_primary_muscles: true,
    });

    expect(result.data).toBeNull();
    expect(result.errors.body_region).toContain("supported");
    expect(result.errors.movement_pattern).toContain("supported");
  });

  it("normalizes valid body region and movement pattern", () => {
    const result = normalizeExerciseMuscleMetadata({
      primary_muscles: ["quads"],
      secondary_muscles: ["glutes"],
      body_region: "Lower Body",
      movement_pattern: "Unilateral Leg",
      require_primary_muscles: true,
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      primary_muscles: ["quads"],
      secondary_muscles: ["glutes"],
      body_region: "lower_body",
      movement_pattern: "unilateral_leg",
    });
  });
});
