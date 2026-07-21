import { describe, expect, it } from "vitest";

import {
  buildCatalogFacets,
  filterCatalogExercises,
  matchesCatalogQuery,
  normalizeCatalogSearchTerm,
} from "./catalog";

const SAMPLE = [
  {
    name: "Romanian Deadlift",
    normalized_name: "romanian deadlift",
    aliases: ["RDL"],
    primary_muscles: ["glutes"],
    body_region: "posterior_chain",
    movement_pattern: "hinge",
  },
  {
    name: "Cable Lateral Raise",
    normalized_name: "cable lateral raise",
    aliases: ["side raise"],
    primary_muscles: ["side_delts"],
    body_region: "upper_body",
    movement_pattern: "shoulder_abduction",
  },
  {
    name: "Triceps Pushdown",
    normalized_name: "triceps pushdown",
    aliases: ["tricep pressdown", "rope pushdown"],
    primary_muscles: ["triceps"],
    body_region: "upper_body",
    movement_pattern: "elbow_extension",
  },
];

describe("training catalog helpers", () => {
  it("normalizes search text consistently", () => {
    expect(normalizeCatalogSearchTerm("  Tricep-PressDown!! ")).toBe("tricep pressdown");
  });

  it("matches aliases and canonical names", () => {
    expect(matchesCatalogQuery(SAMPLE[0], "rdl")).toBe(true);
    expect(matchesCatalogQuery(SAMPLE[1], "side raise")).toBe(true);
    expect(matchesCatalogQuery(SAMPLE[2], "pushdown")).toBe(true);
    expect(matchesCatalogQuery(SAMPLE[2], "bench")).toBe(false);
  });

  it("filters by query, muscle, body region, and movement pattern", () => {
    const byQuery = filterCatalogExercises(SAMPLE, { query: "pressdown" });
    expect(byQuery.map((exercise) => exercise.name)).toEqual(["Triceps Pushdown"]);

    const byMuscle = filterCatalogExercises(SAMPLE, { muscle: "side_delts" });
    expect(byMuscle.map((exercise) => exercise.name)).toEqual(["Cable Lateral Raise"]);

    const byBodyRegion = filterCatalogExercises(SAMPLE, { body_region: "posterior_chain" });
    expect(byBodyRegion.map((exercise) => exercise.name)).toEqual(["Romanian Deadlift"]);

    const byMovementPattern = filterCatalogExercises(SAMPLE, { movement_pattern: "elbow_extension" });
    expect(byMovementPattern.map((exercise) => exercise.name)).toEqual(["Triceps Pushdown"]);
  });

  it("builds sorted facet lists", () => {
    const facets = buildCatalogFacets(SAMPLE);
    expect(facets.muscles).toEqual(["glutes", "side_delts", "triceps"]);
    expect(facets.body_regions).toEqual(["posterior_chain", "upper_body"]);
    expect(facets.movement_patterns).toEqual(["elbow_extension", "hinge", "shoulder_abduction"]);
  });
});
