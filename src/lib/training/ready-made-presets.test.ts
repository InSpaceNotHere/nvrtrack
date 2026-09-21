import { describe, expect, it } from "vitest";

import type { ExerciseCatalogRow } from "@/lib/data/exercise-catalog";
import {
  READY_MADE_PRESETS,
  buildReadyMadePresetResolution,
  buildTemplateExerciseGuidanceLabel,
} from "./ready-made-presets";

function makeCatalogRow(input: {
  id: string;
  name: string;
  normalized_name?: string;
  aliases?: string[];
  equipment?: string;
}): ExerciseCatalogRow {
  return {
    id: input.id,
    name: input.name,
    normalized_name: input.normalized_name ?? input.name.toLowerCase(),
    aliases: input.aliases ?? [],
    primary_muscle_group: "full body",
    secondary_muscle_groups: [],
    equipment: input.equipment ?? "dumbbell",
    movement_pattern: "full_body",
    instructions: null,
    is_active: true,
    created_at: "2026-09-21T00:00:00.000Z",
    updated_at: "2026-09-21T00:00:00.000Z",
    primary_muscles: [],
    secondary_muscles: [],
    body_region: null,
    canonical_lift: null,
    muscle_metadata_version: 1,
  };
}

describe("ready-made preset definitions", () => {
  it("provides exactly five top-level choices in the expected order", () => {
    expect(READY_MADE_PRESETS).toHaveLength(5);
    expect(READY_MADE_PRESETS.map((preset) => preset.title)).toEqual([
      "Full Body Basics",
      "Classic PPL",
      "PPL + Upper/Lower",
      "Glute Killer",
      "Arms Killer",
    ]);
    expect(READY_MADE_PRESETS[0].startHereHint).toBe("Not sure where to start? Start here.");
  });

  it("keeps focused workouts separate from weekly programs", () => {
    const glute = READY_MADE_PRESETS.find((preset) => preset.id === "glute-killer");
    const arms = READY_MADE_PRESETS.find((preset) => preset.id === "arms-killer");
    expect(glute?.kind).toBe("focused_workout");
    expect(arms?.kind).toBe("focused_workout");
    expect(glute?.schedule).toEqual([]);
    expect(arms?.schedule).toEqual([]);
  });

  it("maps weekdays correctly for classic PPL, PPL+UL, and full-body basics", () => {
    const classic = READY_MADE_PRESETS.find((preset) => preset.id === "classic-ppl");
    expect(classic?.schedule.map((entry) => entry.sessionKey)).toEqual([
      "push",
      "pull",
      "legs",
      "push",
      "pull",
      "legs",
      null,
    ]);

    const pplUpperLower = READY_MADE_PRESETS.find((preset) => preset.id === "ppl-upper-lower");
    expect(pplUpperLower?.schedule.map((entry) => entry.sessionKey)).toEqual([
      "push",
      "pull",
      "legs",
      null,
      "upper",
      "lower",
      null,
    ]);

    const fullBody = READY_MADE_PRESETS.find((preset) => preset.id === "full-body-basics");
    expect(fullBody?.schedule.map((entry) => entry.sessionKey)).toEqual([
      "full-body",
      null,
      "full-body",
      null,
      "full-body",
      null,
      null,
    ]);
  });

  it("keeps per-leg prescription explicit for reverse lunge", () => {
    const glute = READY_MADE_PRESETS.find((preset) => preset.id === "glute-killer");
    const reverseLunge = glute?.sessions
      .flatMap((session) => session.exercises)
      .find((exercise) => exercise.requestedName === "Reverse Lunge");
    expect(reverseLunge?.isPerLeg).toBe(true);
  });
});

describe("ready-made preset catalog resolution", () => {
  it("resolves equivalents deliberately and reports no missing mappings when candidates exist", () => {
    const catalog: ExerciseCatalogRow[] = [
      makeCatalogRow({ id: "1", name: "Dumbbell Biceps Curl", equipment: "dumbbell" }),
      makeCatalogRow({ id: "2", name: "Dumbbell Hammer Curl", equipment: "dumbbell" }),
      makeCatalogRow({ id: "3", name: "Dumbbell Overhead Triceps Extension", equipment: "dumbbell" }),
      makeCatalogRow({ id: "4", name: "Triceps Pushdown", equipment: "cable" }),
      makeCatalogRow({ id: "5", name: "Hip Thrust", equipment: "barbell" }),
      makeCatalogRow({ id: "6", name: "Romanian Deadlift", equipment: "barbell" }),
      makeCatalogRow({ id: "7", name: "Reverse Lunge", equipment: "bodyweight" }),
      makeCatalogRow({ id: "8", name: "Machine Hip Abduction", equipment: "machine" }),
      makeCatalogRow({ id: "9", name: "Dumbbell Shoulder Press", equipment: "dumbbell" }),
      makeCatalogRow({ id: "10", name: "Barbell Bench Press", equipment: "barbell" }),
      makeCatalogRow({ id: "11", name: "Incline Dumbbell Bench Press", equipment: "dumbbell" }),
      makeCatalogRow({ id: "12", name: "Dumbbell Lateral Raise", equipment: "dumbbell" }),
      makeCatalogRow({ id: "13", name: "Lat Pulldown", equipment: "cable" }),
      makeCatalogRow({ id: "14", name: "Seated Cable Row", equipment: "cable" }),
      makeCatalogRow({ id: "15", name: "Cable Reverse Fly", equipment: "cable" }),
      makeCatalogRow({ id: "16", name: "Back Squat", equipment: "barbell" }),
      makeCatalogRow({ id: "17", name: "Seated Leg Curl", equipment: "machine" }),
      makeCatalogRow({ id: "18", name: "Leg Extension", equipment: "machine" }),
      makeCatalogRow({ id: "19", name: "Standing Calf Raise", equipment: "machine" }),
      makeCatalogRow({ id: "20", name: "Leg Press", equipment: "machine" }),
      makeCatalogRow({ id: "21", name: "Goblet Squat", equipment: "dumbbell" }),
      makeCatalogRow({ id: "22", name: "Dumbbell Bench Press", equipment: "dumbbell" }),
      makeCatalogRow({ id: "23", name: "Dumbbell Romanian Deadlift", equipment: "dumbbell" }),
      makeCatalogRow({ id: "24", name: "Crunch", equipment: "bodyweight" }),
    ];

    const resolution = buildReadyMadePresetResolution(catalog);
    expect(resolution.missingExercises).toEqual([]);

    const armsPreset = resolution.presets.find((preset) => preset.id === "arms-killer");
    const curl = armsPreset?.sessions
      .flatMap((session) => session.exercises)
      .find((exercise) => exercise.key === "dumbbell-curl");
    expect(curl?.resolvedName).toBe("Dumbbell Biceps Curl");
    expect(curl?.substitutionUsed).toBe("Dumbbell Biceps Curl");
  });

  it("reports missing mappings instead of silently dropping exercises", () => {
    const resolution = buildReadyMadePresetResolution([
      makeCatalogRow({ id: "1", name: "Barbell Bench Press" }),
    ]);
    expect(resolution.missingExercises.length).toBeGreaterThan(0);
    expect(
      resolution.missingExercises.some(
        (entry) => entry.presetId === "full-body-basics" && entry.requestedName === "Goblet Squat",
      ),
    ).toBe(true);
  });
});

describe("template guidance labels", () => {
  it("formats set, rep, rest, and per-leg guidance", () => {
    expect(
      buildTemplateExerciseGuidanceLabel({
        workingSets: 2,
        repMin: 8,
        repMax: 12,
        restSecondsMin: 60,
        restSecondsMax: 120,
        isPerLeg: true,
      }),
    ).toBe("2 working sets x 8-12 reps per leg; rest 1-2 min.");
  });
});
