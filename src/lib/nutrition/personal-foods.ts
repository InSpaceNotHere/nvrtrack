import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "@/lib/data/auth-context";
import {
  getEntryPresentationName,
  getCatalogDisplayName,
  getFoodEntryDisplayName,
  perHundredGramMacros,
} from "./food-display-name";
import {
  getPersonalFoodIdentity,
  identitiesMatch,
  type LogicalFoodIdentity,
} from "./food-identity";

export const PERSONAL_RECENT_LIMIT = 15;
export const PERSONAL_FREQUENT_LIMIT = 12;
export const PERSONAL_FREQUENT_WINDOW_DAYS = 45;
export const PERSONAL_RECENT_ENTRY_FETCH_LIMIT = 80;
export const PERSONAL_FREQUENT_ENTRY_FETCH_LIMIT = 400;

export type PersonalFoodKind = "catalog" | "saved" | "snapshot";

export interface PersonalFoodItem {
  identity: LogicalFoodIdentity;
  kind: PersonalFoodKind;
  name: string;
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  basis: string;
  lastLoggedAt: string;
  occurrenceCount: number;
  catalogFood: FoodCatalogRow | null;
  savedFood: FoodRow | null;
  snapshotEntry: FoodEntryRow | null;
}

export interface FavoriteRecord {
  identity: LogicalFoodIdentity;
  createdAt: string;
}

interface IdentityBucket {
  identity: LogicalFoodIdentity;
  count: number;
  lastLoggedAt: string;
  latestEntry: FoodEntryRow;
}

function compareIsoDesc(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left > right ? -1 : 1;
}

function bucketsFromEntries(entries: FoodEntryRow[]): Map<string, IdentityBucket> {
  const buckets = new Map<string, IdentityBucket>();
  for (const entry of entries) {
    const identity = getPersonalFoodIdentity(entry);
    const existing = buckets.get(identity.key);
    if (!existing) {
      buckets.set(identity.key, {
        identity,
        count: 1,
        lastLoggedAt: entry.created_at,
        latestEntry: entry,
      });
      continue;
    }
    existing.count += 1;
    if (identity.catalogFoodId && !existing.identity.catalogFoodId) {
      existing.identity = identity;
    } else if (identity.foodId && !existing.identity.foodId) {
      existing.identity = identity;
    }
    if (entry.created_at > existing.lastLoggedAt) {
      existing.lastLoggedAt = entry.created_at;
      existing.latestEntry = entry;
    }
  }
  return buckets;
}

export function uniqueRecentFoodsFromEntries(
  entries: FoodEntryRow[],
  options: { limit?: number } = {},
): IdentityBucket[] {
  const limit = options.limit ?? PERSONAL_RECENT_LIMIT;
  return [...bucketsFromEntries(entries).values()]
    .sort((left, right) => {
      const byRecency = compareIsoDesc(left.lastLoggedAt, right.lastLoggedAt);
      if (byRecency !== 0) {
        return byRecency;
      }
      return left.identity.key.localeCompare(right.identity.key);
    })
    .slice(0, limit);
}

export function frequentFoodsFromEntries(
  entries: FoodEntryRow[],
  now: Date,
  options: { limit?: number; windowDays?: number } = {},
): IdentityBucket[] {
  const limit = options.limit ?? PERSONAL_FREQUENT_LIMIT;
  const windowDays = options.windowDays ?? PERSONAL_FREQUENT_WINDOW_DAYS;
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const inWindow = entries.filter((entry) => entry.created_at >= cutoff);
  const buckets = [...bucketsFromEntries(inWindow).values()];

  return buckets
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      const byRecency = compareIsoDesc(left.lastLoggedAt, right.lastLoggedAt);
      if (byRecency !== 0) {
        return byRecency;
      }
      return left.identity.key.localeCompare(right.identity.key);
    })
    .slice(0, limit);
}

function hydrateBucket(
  bucket: IdentityBucket,
  catalogById: Map<string, FoodCatalogRow>,
  savedById: Map<string, FoodRow>,
): PersonalFoodItem {
  const { identity, latestEntry } = bucket;

  if (identity.type === "catalog") {
    const catalogFood = identity.catalogFoodId ? catalogById.get(identity.catalogFoodId) ?? null : null;
    if (catalogFood) {
      const macros = perHundredGramMacros(catalogFood);
      return {
        identity,
        kind: "catalog",
        name: getEntryPresentationName(getCatalogDisplayName(catalogFood)),
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbohydrate_g: macros.carbohydrate_g,
        fat_g: macros.fat_g,
        basis: "100 g",
        lastLoggedAt: bucket.lastLoggedAt,
        occurrenceCount: bucket.count,
        catalogFood,
        savedFood: null,
        snapshotEntry: latestEntry,
      };
    }
  }

  if (identity.type === "saved") {
    const savedFood = identity.foodId ? savedById.get(identity.foodId) ?? null : null;
    if (savedFood) {
      return {
        identity,
        kind: "saved",
        name: savedFood.name,
        calories: savedFood.calories,
        protein_g: savedFood.protein_g,
        carbohydrate_g: savedFood.carbohydrate_g,
        fat_g: savedFood.fat_g,
        basis: `${savedFood.serving_size} ${savedFood.serving_unit}`,
        lastLoggedAt: bucket.lastLoggedAt,
        occurrenceCount: bucket.count,
        catalogFood: null,
        savedFood,
        snapshotEntry: latestEntry,
      };
    }
  }

  return {
    identity,
    kind: "snapshot",
    name: getFoodEntryDisplayName(latestEntry),
    calories: latestEntry.calories_per_serving,
    protein_g: latestEntry.protein_per_serving_g,
    carbohydrate_g: latestEntry.carbohydrate_per_serving_g,
    fat_g: latestEntry.fat_per_serving_g,
    basis: `${latestEntry.serving_size} ${latestEntry.serving_unit}`,
    lastLoggedAt: bucket.lastLoggedAt,
    occurrenceCount: bucket.count,
    catalogFood: null,
    savedFood: null,
    snapshotEntry: latestEntry,
  };
}

export function buildRecentPersonalFoods(
  entries: FoodEntryRow[],
  catalogFoods: FoodCatalogRow[],
  savedFoods: FoodRow[],
): PersonalFoodItem[] {
  const catalogById = new Map(catalogFoods.map((food) => [food.id, food]));
  const savedById = new Map(savedFoods.map((food) => [food.id, food]));
  return uniqueRecentFoodsFromEntries(entries).map((bucket) => hydrateBucket(bucket, catalogById, savedById));
}

export function buildFrequentPersonalFoods(
  entries: FoodEntryRow[],
  catalogFoods: FoodCatalogRow[],
  savedFoods: FoodRow[],
  now = new Date(),
): PersonalFoodItem[] {
  const catalogById = new Map(catalogFoods.map((food) => [food.id, food]));
  const savedById = new Map(savedFoods.map((food) => [food.id, food]));
  return frequentFoodsFromEntries(entries, now).map((bucket) => hydrateBucket(bucket, catalogById, savedById));
}

export function buildFavoritePersonalFoods(
  favorites: FavoriteRecord[],
  catalogFoods: FoodCatalogRow[],
  savedFoods: FoodRow[],
  recentEntries: FoodEntryRow[],
): PersonalFoodItem[] {
  const catalogById = new Map(catalogFoods.map((food) => [food.id, food]));
  const savedById = new Map(savedFoods.map((food) => [food.id, food]));
  const latestByIdentity = new Map<string, FoodEntryRow>();
  for (const entry of recentEntries) {
    const identity = getPersonalFoodIdentity(entry);
    const existing = latestByIdentity.get(identity.key);
    if (!existing || entry.created_at > existing.created_at) {
      latestByIdentity.set(identity.key, entry);
    }
  }

  const items: PersonalFoodItem[] = [];
  const sorted = [...favorites].sort((left, right) => compareIsoDesc(left.createdAt, right.createdAt));
  for (const favorite of sorted) {
    if (favorite.identity.type === "catalog" && favorite.identity.catalogFoodId) {
      const catalogFood = catalogById.get(favorite.identity.catalogFoodId);
      if (!catalogFood) {
        continue;
      }
      const identity = getPersonalFoodIdentity({ catalog_food_id: catalogFood.id, fdc_id: catalogFood.fdc_id });
      const latestEntry = latestByIdentity.get(identity.key) ?? latestByIdentity.get(favorite.identity.key) ?? null;
      const macros = perHundredGramMacros(catalogFood);
      items.push({
        identity,
        kind: "catalog",
        name: getEntryPresentationName(getCatalogDisplayName(catalogFood)),
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbohydrate_g: macros.carbohydrate_g,
        fat_g: macros.fat_g,
        basis: "100 g",
        lastLoggedAt: latestEntry?.created_at ?? favorite.createdAt,
        occurrenceCount: 0,
        catalogFood,
        savedFood: null,
        snapshotEntry: latestEntry,
      });
      continue;
    }
    if (favorite.identity.type === "saved" && favorite.identity.foodId) {
      const savedFood = savedById.get(favorite.identity.foodId);
      if (!savedFood) {
        continue;
      }
      items.push({
        identity: favorite.identity,
        kind: "saved",
        name: savedFood.name,
        calories: savedFood.calories,
        protein_g: savedFood.protein_g,
        carbohydrate_g: savedFood.carbohydrate_g,
        fat_g: savedFood.fat_g,
        basis: `${savedFood.serving_size} ${savedFood.serving_unit}`,
        lastLoggedAt: latestByIdentity.get(favorite.identity.key)?.created_at ?? favorite.createdAt,
        occurrenceCount: 0,
        catalogFood: null,
        savedFood,
        snapshotEntry: latestByIdentity.get(favorite.identity.key) ?? null,
      });
      continue;
    }
    const latestEntry = latestByIdentity.get(favorite.identity.key);
    if (latestEntry) {
      items.push(
        hydrateBucket(
          {
            identity: favorite.identity,
            count: 0,
            lastLoggedAt: latestEntry.created_at,
            latestEntry,
          },
          catalogById,
          savedById,
        ),
      );
    }
  }
  return items;
}

export function isFavoriteIdentity(favorites: LogicalFoodIdentity[], identity: LogicalFoodIdentity): boolean {
  return favorites.some((favorite) => identitiesMatch(favorite, identity));
}

export function personalItemFromCatalog(food: FoodCatalogRow): PersonalFoodItem {
  const identity = getPersonalFoodIdentity({ catalog_food_id: food.id, fdc_id: food.fdc_id });
  const macros = perHundredGramMacros(food);
  return {
    identity,
    kind: "catalog",
    name: getEntryPresentationName(getCatalogDisplayName(food)),
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbohydrate_g: macros.carbohydrate_g,
    fat_g: macros.fat_g,
    basis: "100 g",
    lastLoggedAt: new Date(0).toISOString(),
    occurrenceCount: 0,
    catalogFood: food,
    savedFood: null,
    snapshotEntry: null,
  };
}

export function personalItemFromSaved(food: FoodRow): PersonalFoodItem {
  const identity = getPersonalFoodIdentity({ food_id: food.id });
  return {
    identity,
    kind: "saved",
    name: food.name,
    calories: food.calories,
    protein_g: food.protein_g,
    carbohydrate_g: food.carbohydrate_g,
    fat_g: food.fat_g,
    basis: `${food.serving_size} ${food.serving_unit}`,
    lastLoggedAt: new Date(0).toISOString(),
    occurrenceCount: 0,
    catalogFood: null,
    savedFood: food,
    snapshotEntry: null,
  };
}
