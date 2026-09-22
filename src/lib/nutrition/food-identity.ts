import { normalizeCatalogSearchText } from "./catalog-search";
import { humanizeUsdaStyleLabel } from "./food-display-name";

export type FoodIdentityType = "catalog" | "saved" | "snapshot";

export interface LogicalFoodIdentity {
  type: FoodIdentityType;
  key: string;
  catalogFoodId: string | null;
  foodId: string | null;
  snapshotKey: string | null;
}

export interface FoodIdentitySource {
  catalog_food_id?: string | null;
  food_id?: string | null;
  fdc_id?: number | null;
  food_name?: string | null;
  name?: string | null;
  brand_name?: string | null;
  brand?: string | null;
  source_description?: string | null;
  source_brand?: string | null;
  source_name?: string | null;
  serving_size?: number | null;
  serving_unit?: string | null;
  calories_per_serving?: number | null;
  calories?: number | null;
  protein_per_serving_g?: number | null;
  protein_g?: number | null;
  carbohydrate_per_serving_g?: number | null;
  carbohydrate_g?: number | null;
  fat_per_serving_g?: number | null;
  fat_g?: number | null;
}

/**
 * User-facing identity for Recent, Frequent, and (later) Favorites matching.
 *
 * Stored food_entries are never rewritten. This only groups presentation cards.
 *
 * Priority:
 * 1. USDA source — `fdc:{id}` when fdc_id is present (catalog_food_id kept for hydration).
 *    Raw vs cooked stay distinct because they have different FDC ids.
 * 2. Catalog row — `catalog:{uuid}` when there is no FDC id.
 * 3. Saved/custom library — `saved:{food_id}`
 * 4. Snapshot-only custom — humanized name + brand + rounded per-serving macros.
 *    Serving size/unit and source_description are ignored so portion metadata
 *    does not create duplicate cards.
 */
export function getPersonalFoodIdentity(source: FoodIdentitySource): LogicalFoodIdentity {
  const catalogFoodId = source.catalog_food_id?.trim() || null;
  const foodId = source.food_id?.trim() || null;
  const fdcId =
    typeof source.fdc_id === "number" && Number.isFinite(source.fdc_id) && source.fdc_id > 0
      ? Math.trunc(source.fdc_id)
      : null;

  if (fdcId) {
    return {
      type: catalogFoodId ? "catalog" : "snapshot",
      key: `fdc:${fdcId}`,
      catalogFoodId,
      foodId: null,
      snapshotKey: `fdc:${fdcId}`,
    };
  }

  if (catalogFoodId) {
    return {
      type: "catalog",
      key: `catalog:${catalogFoodId}`,
      catalogFoodId,
      foodId: null,
      snapshotKey: null,
    };
  }

  if (foodId) {
    return {
      type: "saved",
      key: `saved:${foodId}`,
      catalogFoodId: null,
      foodId,
      snapshotKey: null,
    };
  }

  const snapshotKey = buildCustomSnapshotKey(source);
  return {
    type: "snapshot",
    key: `snapshot:${snapshotKey}`,
    catalogFoodId: null,
    foodId: null,
    snapshotKey,
  };
}

/** @deprecated Use getPersonalFoodIdentity. Kept as an alias so Favorites storage shares the same keys. */
export function getLogicalFoodIdentity(source: FoodIdentitySource): LogicalFoodIdentity {
  return getPersonalFoodIdentity(source);
}

export function identityFromCatalogFoodId(catalogFoodId: string): LogicalFoodIdentity {
  return getPersonalFoodIdentity({ catalog_food_id: catalogFoodId });
}

export function identityFromSavedFoodId(foodId: string): LogicalFoodIdentity {
  return getPersonalFoodIdentity({ food_id: foodId });
}

export function identitiesMatch(left: LogicalFoodIdentity, right: LogicalFoodIdentity): boolean {
  return left.key === right.key;
}

function buildCustomSnapshotKey(source: FoodIdentitySource): string {
  const rawName = source.food_name || source.name || "Food";
  const name = normalizeCatalogSearchText(humanizeUsdaStyleLabel(rawName));
  const brand = normalizeCatalogSearchText(source.brand_name || source.brand || source.source_brand || "");
  const calories = roundIdentityNumber(source.calories_per_serving ?? source.calories, 0);
  const protein = roundIdentityNumber(source.protein_per_serving_g ?? source.protein_g, 1);
  const carbs = roundIdentityNumber(source.carbohydrate_per_serving_g ?? source.carbohydrate_g, 1);
  const fat = roundIdentityNumber(source.fat_per_serving_g ?? source.fat_g, 1);
  return `custom:${name || "food"}|${brand}|${calories}|${protein}|${carbs}|${fat}`;
}

function roundIdentityNumber(value: number | null | undefined, digits: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "x";
  }
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}
