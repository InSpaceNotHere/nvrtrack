import type {
  NormalizedNutrientAmount,
  NormalizedNutrientsPer100g,
  UsdaFoodNutrient,
} from "./types";
import { UsdaClientError } from "./types";

interface UsdaNutrientTarget {
  ids: readonly number[];
  legacyNumbers: readonly string[];
  outputUnit: "kcal" | "g" | "mg";
}

interface UsdaNutrientCandidate {
  nutrientId: number | null;
  nutrientNumber: string | null;
  unit: string | null;
  value: number | null;
}

export const USDA_NUTRIENT_IDENTIFIERS = {
  energyKcal: { ids: [1008], legacyNumbers: ["208"] },
  energyKilojoules: { ids: [1062], legacyNumbers: ["268"] },
  protein: { ids: [1003], legacyNumbers: ["203"] },
  carbohydrate: { ids: [1005], legacyNumbers: ["205"] },
  fat: { ids: [1004], legacyNumbers: ["204"] },
  fiber: { ids: [1079], legacyNumbers: ["291"] },
  sugar: { ids: [2000], legacyNumbers: ["269"] },
  sodium: { ids: [1093], legacyNumbers: ["307"] },
} as const;

const USDA_NUTRIENT_TARGETS = {
  calories_kcal: {
    ids: USDA_NUTRIENT_IDENTIFIERS.energyKcal.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.energyKcal.legacyNumbers,
    outputUnit: "kcal",
  },
  protein_g: {
    ids: USDA_NUTRIENT_IDENTIFIERS.protein.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.protein.legacyNumbers,
    outputUnit: "g",
  },
  carbohydrate_g: {
    ids: USDA_NUTRIENT_IDENTIFIERS.carbohydrate.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.carbohydrate.legacyNumbers,
    outputUnit: "g",
  },
  fat_g: {
    ids: USDA_NUTRIENT_IDENTIFIERS.fat.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.fat.legacyNumbers,
    outputUnit: "g",
  },
  fiber_g: {
    ids: USDA_NUTRIENT_IDENTIFIERS.fiber.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.fiber.legacyNumbers,
    outputUnit: "g",
  },
  sugar_g: {
    ids: USDA_NUTRIENT_IDENTIFIERS.sugar.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.sugar.legacyNumbers,
    outputUnit: "g",
  },
  sodium_mg: {
    ids: USDA_NUTRIENT_IDENTIFIERS.sodium.ids,
    legacyNumbers: USDA_NUTRIENT_IDENTIFIERS.sodium.legacyNumbers,
    outputUnit: "mg",
  },
} satisfies Record<keyof NormalizedNutrientsPer100g, UsdaNutrientTarget>;

function normalizeUnit(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().toLowerCase();
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function coerceCandidate(raw: UsdaFoodNutrient): UsdaNutrientCandidate {
  const nutrientNumber =
    trimToNull(raw.nutrientNumber) ??
    trimToNull(raw.nutrient?.number) ??
    null;
  const nutrientId =
    raw.nutrientId ??
    raw.nutrient?.id ??
    (nutrientNumber && /^\d+$/.test(nutrientNumber) ? Number(nutrientNumber) : null);
  const unit = normalizeUnit(raw.unitName ?? raw.nutrient?.unitName ?? null);
  const value =
    typeof raw.value === "number"
      ? raw.value
      : typeof raw.amount === "number"
        ? raw.amount
        : null;

  return {
    nutrientId,
    nutrientNumber,
    unit,
    value,
  };
}

function matchesTarget(candidate: UsdaNutrientCandidate, target: UsdaNutrientTarget): boolean {
  if (candidate.nutrientId !== null && target.ids.includes(candidate.nutrientId)) {
    return true;
  }

  if (candidate.nutrientNumber && target.legacyNumbers.includes(candidate.nutrientNumber)) {
    return true;
  }

  return false;
}

function convertUnit(value: number, sourceUnit: string | null, outputUnit: "kcal" | "g" | "mg"): number | null {
  if (outputUnit === "kcal") {
    if (sourceUnit === "kcal") {
      return value;
    }
    return null;
  }

  if (outputUnit === "g") {
    if (sourceUnit === "g") return value;
    if (sourceUnit === "mg") return value / 1000;
    if (sourceUnit === "µg" || sourceUnit === "mcg" || sourceUnit === "ug") return value / 1000000;
    return null;
  }

  if (sourceUnit === "mg") return value;
  if (sourceUnit === "g") return value * 1000;
  if (sourceUnit === "µg" || sourceUnit === "mcg" || sourceUnit === "ug") return value / 1000;
  return null;
}

function asNutrientAmount(value: number | null): NormalizedNutrientAmount {
  if (value === null) {
    return { value: null, isMissing: true };
  }
  return { value, isMissing: false };
}

function findTargetValue(
  candidates: UsdaNutrientCandidate[],
  target: UsdaNutrientTarget,
  targetKey: keyof NormalizedNutrientsPer100g,
): number | null {
  for (const candidate of candidates) {
    if (!matchesTarget(candidate, target)) {
      continue;
    }
    if (candidate.value === null) {
      continue;
    }
    if (candidate.value < 0) {
      throw new UsdaClientError(
        "invalid_response",
        `USDA nutrient '${targetKey}' included a negative value.`,
      );
    }

    const converted = convertUnit(candidate.value, candidate.unit, target.outputUnit);
    if (converted === null) {
      continue;
    }

    return converted;
  }

  return null;
}

export function normalizeUsdaNutrientsPer100g(rawNutrients: UsdaFoodNutrient[] | null | undefined): NormalizedNutrientsPer100g {
  const candidates = (rawNutrients ?? []).map(coerceCandidate);
  const nutrients: Partial<NormalizedNutrientsPer100g> = {};

  for (const [key, target] of Object.entries(USDA_NUTRIENT_TARGETS) as Array<
    [keyof NormalizedNutrientsPer100g, UsdaNutrientTarget]
  >) {
    const value = findTargetValue(candidates, target, key);
    nutrients[key] = asNutrientAmount(value);
  }

  return nutrients as NormalizedNutrientsPer100g;
}

export function hasRequiredMacroNutrients(nutrients: NormalizedNutrientsPer100g): boolean {
  return (
    !nutrients.calories_kcal.isMissing &&
    !nutrients.protein_g.isMissing &&
    !nutrients.carbohydrate_g.isMissing &&
    !nutrients.fat_g.isMissing
  );
}
