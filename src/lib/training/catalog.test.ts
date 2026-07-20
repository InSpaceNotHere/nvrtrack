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
    primary_muscle_group: "glutes",
    equipment: "barbell",
  },
  {
    name: "Cable Lateral Raise",
    normalized_name: "cable lateral raise",
    aliases: ["side raise"],
    primary_muscle_group: "shoulders",
    equipment: "cable",
  },
  {
    name: "Triceps Pushdown",
    normalized_name: "triceps pushdown",
    aliases: ["tricep pressdown", "rope pushdown"],
    primary_muscle_group: "triceps",
    equipment: "cable",
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

  it("filters by query, muscle, and equipment", () => {
    const byQuery = filterCatalogExercises(SAMPLE, { query: "pressdown" });
    expect(byQuery.map((exercise) => exercise.name)).toEqual(["Triceps Pushdown"]);

    const byMuscle = filterCatalogExercises(SAMPLE, { muscle: "shoulders" });
    expect(byMuscle.map((exercise) => exercise.name)).toEqual(["Cable Lateral Raise"]);

    const byEquipment = filterCatalogExercises(SAMPLE, { equipment: "barbell" });
    expect(byEquipment.map((exercise) => exercise.name)).toEqual(["Romanian Deadlift"]);
  });

  it("builds sorted facet lists", () => {
    const facets = buildCatalogFacets(SAMPLE);
    expect(facets.muscles).toEqual(["glutes", "shoulders", "triceps"]);
    expect(facets.equipment).toEqual(["barbell", "cable"]);
  });
});
