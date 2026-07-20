export interface CatalogExerciseLike {
  name: string;
  normalized_name?: string | null;
  aliases?: string[] | null;
  primary_muscle_group?: string | null;
  equipment?: string | null;
}

export interface CatalogFilterOptions {
  query?: string;
  muscle?: string;
  equipment?: string;
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
  const equipmentFilter = normalizeCatalogSearchTerm(filters.equipment ?? "");

  return exercises.filter((exercise) => {
    if (term && !matchesCatalogQuery(exercise, term)) {
      return false;
    }

    if (muscleFilter) {
      const exerciseMuscle = normalizeCatalogSearchTerm(exercise.primary_muscle_group ?? "");
      if (exerciseMuscle !== muscleFilter) {
        return false;
      }
    }

    if (equipmentFilter) {
      const exerciseEquipment = normalizeCatalogSearchTerm(exercise.equipment ?? "");
      if (exerciseEquipment !== equipmentFilter) {
        return false;
      }
    }

    return true;
  });
}

export function buildCatalogFacets<T extends CatalogExerciseLike>(exercises: T[]): {
  muscles: string[];
  equipment: string[];
} {
  const muscles = new Set<string>();
  const equipment = new Set<string>();

  for (const exercise of exercises) {
    if (exercise.primary_muscle_group) {
      muscles.add(exercise.primary_muscle_group);
    }
    if (exercise.equipment) {
      equipment.add(exercise.equipment);
    }
  }

  return {
    muscles: [...muscles].sort((a, b) => a.localeCompare(b)),
    equipment: [...equipment].sort((a, b) => a.localeCompare(b)),
  };
}
