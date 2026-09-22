import { CATALOG_DISPLAY_NAMES_BY_FDC_ID } from "./catalog-display-names";
import { roundNutritionValue } from "./calculations";

export interface CatalogDisplaySource {
  fdc_id?: number | null;
  description?: string | null;
  normalized_name?: string | null;
}

export interface EntryDisplaySource {
  fdc_id?: number | null;
  food_name: string;
  source_description?: string | null;
}

function collapseDuplicateClauses(value: string): string {
  return value
    .replace(/,\s*cooked,\s*cooked/gi, ", cooked")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

/** Presentation-only. Never writes back to catalog or log rows. */
export function humanizeUsdaStyleLabel(raw: string): string {
  let value = raw.trim();
  if (!value) {
    return value;
  }

  value = value.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/gi, "");
  value = value.replace(/\s*\(may contain additives[^)]*\)/gi, "");
  value = value.replace(/\s*\(includes onion[^)]*\)/gi, "");

  const replacements: Array<[RegExp | string, string]> = [
    [/^Chicken, broilers? or fryers, breast, skinless, boneless, meat only, cooked, braised$/i, "Chicken Breast, cooked"],
    [/^Chicken, broilers? or fryers, breast, skinless, boneless, meat only, raw$/i, "Chicken Breast, raw"],
    [/^Chicken, broilers? or fryers, breast, meat only, cooked, roasted$/i, "Chicken Breast, roasted"],
    [/^Rice, white, long-grain, regular, enriched, cooked$/i, "White Rice"],
    [/^Rice, white, medium-grain, enriched, cooked$/i, "White Rice, medium-grain"],
    [/^Chicken, broilers? or fryers, /i, "Chicken, "],
    [/^Fish, /i, ""],
    [/^Cereals, oats, /i, "Oats, "],
    [/^Nuts, /i, ""],
    [/^Oil, /i, ""],
    ["broiler or fryers, ", ""],
    ["broilers or fryers, ", ""],
    ["skinless, boneless, ", ""],
    ["boneless, skinless, ", ""],
    [", boneless, skinless", ""],
    [", meat only", ""],
    ["meat only, ", ""],
    [", separable lean only", ""],
    [", separable lean and fat", ""],
    ["trimmed to 0\" fat, ", ""],
    ["trimmed to 1/8\" fat, ", ""],
    [", boiled, drained, without salt", ", cooked"],
    ["without added salt, ", ""],
    ["without salt, ", ""],
    [", without salt", ""],
    ["cooked, dry heat", "cooked"],
    ["cooked, moist heat", "cooked"],
    ["enriched, cooked", "cooked"],
  ];

  for (const [from, to] of replacements) {
    value = typeof from === "string" ? value.replaceAll(from, to) : value.replace(from, to);
  }

  return collapseDuplicateClauses(value);
}

export function getCatalogDisplayName(source: CatalogDisplaySource): string {
  if (typeof source.fdc_id === "number" && CATALOG_DISPLAY_NAMES_BY_FDC_ID[source.fdc_id]) {
    return CATALOG_DISPLAY_NAMES_BY_FDC_ID[source.fdc_id];
  }
  if (source.description?.trim()) {
    return humanizeUsdaStyleLabel(source.description);
  }
  if (source.normalized_name?.trim()) {
    return humanizeUsdaStyleLabel(source.normalized_name);
  }
  return "Food";
}

export function getFoodEntryDisplayName(entry: EntryDisplaySource): string {
  if (typeof entry.fdc_id === "number" && CATALOG_DISPLAY_NAMES_BY_FDC_ID[entry.fdc_id]) {
    return CATALOG_DISPLAY_NAMES_BY_FDC_ID[entry.fdc_id];
  }
  return humanizeUsdaStyleLabel(entry.food_name || entry.source_description || "Food");
}

export function formatMacroSummary(input: {
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
}): string {
  const calories = roundNutritionValue(input.calories, 0);
  const protein = roundNutritionValue(input.protein_g, 1);
  const carbs = roundNutritionValue(input.carbohydrate_g, 1);
  const fat = roundNutritionValue(input.fat_g, 1);
  return `${calories} cal · ${protein}P · ${carbs}C · ${fat}F`;
}

export function perHundredGramMacros(source: {
  calories_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbohydrate_g_per_100g: number | null;
  fat_g_per_100g: number | null;
}): { calories: number; protein_g: number; carbohydrate_g: number; fat_g: number } {
  return {
    calories: source.calories_per_100g ?? 0,
    protein_g: source.protein_g_per_100g ?? 0,
    carbohydrate_g: source.carbohydrate_g_per_100g ?? 0,
    fat_g: source.fat_g_per_100g ?? 0,
  };
}
