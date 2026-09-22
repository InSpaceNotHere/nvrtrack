import { normalizeCatalogSearchText } from "./catalog-search";

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
 * Logical food identity for Recent, Frequent, and Favorites.
 *
 * Priority:
 * 1. catalog — `catalog_food_id` (prep variants stay distinct)
 * 2. saved — `food_id` for custom/saved foods
 * 3. snapshot — historical rows missing both ids
 *    - `fdc:{fdc_id}` when a USDA FDC id is stored
 *    - otherwise a conservative name/source/macro/serving key
 *
 * Catalog grouping in search is presentation-only and is not used here.
 */
export function getLogicalFoodIdentity(source: FoodIdentitySource): LogicalFoodIdentity {
  const catalogFoodId = source.catalog_food_id?.trim() || null;
  if (catalogFoodId) {
    return {
      type: "catalog",
      key: `catalog:${catalogFoodId}`,
      catalogFoodId,
      foodId: null,
      snapshotKey: null,
    };
  }

  const foodId = source.food_id?.trim() || null;
  if (foodId) {
    return {
      type: "saved",
      key: `saved:${foodId}`,
      catalogFoodId: null,
      foodId,
      snapshotKey: null,
    };
  }

  const snapshotKey = buildSnapshotKey(source);
  return {
    type: "snapshot",
    key: `snapshot:${snapshotKey}`,
    catalogFoodId: null,
    foodId: null,
    snapshotKey,
  };
}

export function identityFromCatalogFoodId(catalogFoodId: string): LogicalFoodIdentity {
  return getLogicalFoodIdentity({ catalog_food_id: catalogFoodId });
}

export function identityFromSavedFoodId(foodId: string): LogicalFoodIdentity {
  return getLogicalFoodIdentity({ food_id: foodId });
}

export function identitiesMatch(left: LogicalFoodIdentity, right: LogicalFoodIdentity): boolean {
  return left.key === right.key;
}

function buildSnapshotKey(source: FoodIdentitySource): string {
  if (typeof source.fdc_id === "number" && Number.isFinite(source.fdc_id) && source.fdc_id > 0) {
    return `fdc:${Math.trunc(source.fdc_id)}`;
  }

  const name = normalizeCatalogSearchText(source.food_name || source.name || "");
  const description = normalizeCatalogSearchText(source.source_description || source.source_name || "");
  const brand = normalizeCatalogSearchText(source.brand_name || source.brand || source.source_brand || "");
  const servingSize = Number(source.serving_size ?? 0);
  const servingUnit = normalizeCatalogSearchText(source.serving_unit || "");
  const calories = roundIdentityNumber(source.calories_per_serving ?? source.calories, 0);
  const protein = roundIdentityNumber(source.protein_per_serving_g ?? source.protein_g, 1);
  const carbs = roundIdentityNumber(source.carbohydrate_per_serving_g ?? source.carbohydrate_g, 1);
  const fat = roundIdentityNumber(source.fat_per_serving_g ?? source.fat_g, 1);

  return [
    `name:${name || "food"}`,
    `src:${description}`,
    `brand:${brand}`,
    `kcal:${calories}`,
    `p:${protein}`,
    `c:${carbs}`,
    `f:${fat}`,
    `sz:${Number.isFinite(servingSize) ? servingSize : 0}${servingUnit}`,
  ].join("|");
}

function roundIdentityNumber(value: number | null | undefined, digits: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "x";
  }
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}
