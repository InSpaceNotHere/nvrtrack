export interface CatalogExerciseLike {
  name: string;
  normalized_name?: string | null;
  aliases?: string[] | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  primary_muscle_group?: string | null;
  body_region?: string | null;
  movement_pattern?: string | null;
  equipment?: string | null;
}

export interface CatalogFilterOptions {
  query?: string;
  muscle?: string;
  body_region?: string;
  movement_pattern?: string;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCatalogSearchTerm(value: string): string {
  return collapseWhitespace(value.toLowerCase().replace(/[^a-z0-9 ]/g, " "));
}

export function includesNormalizedTerm(source: string, normalizedTerm: string): boolean {
  if (!normalizedTerm) {
    return true;
  }
  return normalizeCatalogSearchTerm(source).includes(normalizedTerm);
}

export function matchesCatalogQuery(exercise: CatalogExerciseLike, query: string): boolean {
  const term = normalizeCatalogSearchTerm(query);
  if (!term) {
    return true;
  }

  if (includesNormalizedTerm(exercise.name, term)) {
    return true;
  }

  if (exercise.normalized_name && includesNormalizedTerm(exercise.normalized_name, term)) {
    return true;
  }

  return (exercise.aliases ?? []).some((alias) => includesNormalizedTerm(alias, term));
}

export function filterCatalogExercises<T extends CatalogExerciseLike>(exercises: T[], filters: CatalogFilterOptions): T[] {
  const term = normalizeCatalogSearchTerm(filters.query ?? "");
  const muscleFilter = normalizeCatalogSearchTerm(filters.muscle ?? "");
  const bodyRegionFilter = normalizeCatalogSearchTerm(filters.body_region ?? "");
  const movementPatternFilter = normalizeCatalogSearchTerm(filters.movement_pattern ?? "");

  return exercises.filter((exercise) => {
    if (term && !matchesCatalogQuery(exercise, term)) {
      return false;
    }

    if (muscleFilter) {
      const primaryMuscles = (exercise.primary_muscles ?? [exercise.primary_muscle_group ?? ""]).map((value) =>
        normalizeCatalogSearchTerm(value),
      );
      if (!primaryMuscles.includes(muscleFilter)) {
        return false;
      }
    }

    if (bodyRegionFilter) {
      const exerciseBodyRegion = normalizeCatalogSearchTerm(exercise.body_region ?? "");
      if (exerciseBodyRegion !== bodyRegionFilter) {
        return false;
      }
    }

    if (movementPatternFilter) {
      const exerciseMovementPattern = normalizeCatalogSearchTerm(exercise.movement_pattern ?? "");
      if (exerciseMovementPattern !== movementPatternFilter) {
        return false;
      }
    }

    return true;
  });
}

export function buildCatalogFacets<T extends CatalogExerciseLike>(exercises: T[]): {
  muscles: string[];
  body_regions: string[];
  movement_patterns: string[];
} {
  const muscles = new Set<string>();
  const bodyRegions = new Set<string>();
  const movementPatterns = new Set<string>();

  for (const exercise of exercises) {
    for (const muscle of exercise.primary_muscles ?? []) {
      if (muscle) {
        muscles.add(muscle);
      }
    }
    if (exercise.primary_muscle_group) {
      muscles.add(exercise.primary_muscle_group);
    }
    if (exercise.body_region) {
      bodyRegions.add(exercise.body_region);
    }
    if (exercise.movement_pattern) {
      movementPatterns.add(exercise.movement_pattern);
    }
  }

  return {
    muscles: [...muscles].sort((a, b) => a.localeCompare(b)),
    body_regions: [...bodyRegions].sort((a, b) => a.localeCompare(b)),
    movement_patterns: [...movementPatterns].sort((a, b) => a.localeCompare(b)),
  };
}
