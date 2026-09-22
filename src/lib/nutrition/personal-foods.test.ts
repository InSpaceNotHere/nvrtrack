import { describe, expect, it } from "vitest";

import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "../data/auth-context";
import {
  buildFrequentPersonalFoods,
  buildRecentPersonalFoods,
  frequentFoodsFromEntries,
  uniqueRecentFoodsFromEntries,
} from "./personal-foods";

function makeEntry(overrides: Partial<FoodEntryRow> = {}): FoodEntryRow {
  return {
    id: "entry-1",
    user_id: "user-1",
    food_id: null,
    entry_date: "2026-09-22",
    meal_type: "lunch",
    servings: 1,
    note: null,
    food_name: "Chicken Breast",
    brand_name: null,
    serving_size: 100,
    serving_unit: "g",
    calories_per_serving: 165,
    protein_per_serving_g: 31,
    carbohydrate_per_serving_g: 0,
    fat_per_serving_g: 3.6,
    fiber_per_serving_g: null,
    created_at: "2026-09-22T12:00:00.000Z",
    updated_at: "2026-09-22T12:00:00.000Z",
    catalog_food_id: "cat-breast-cooked",
    fdc_id: 171140,
    source_status: "usda_catalog",
    source_name: "chicken breast cooked",
    source_data_type: "Foundation",
    source_description: "Chicken breast cooked",
    source_brand: null,
    source_gtin_upc: null,
    source_retrieved_at: "2026-07-20T00:00:00.000Z",
    source_serving_quantity: 1,
    source_serving_unit: "piece",
    source_serving_weight_grams: 120,
    amount_value: 100,
    amount_unit: "g",
    amount_grams: 100,
    calories_per_100g: 165,
    protein_g_per_100g: 31,
    carbohydrate_g_per_100g: 0,
    fat_g_per_100g: 3.6,
    fiber_g_per_100g: null,
    sugar_g_per_100g: null,
    sodium_mg_per_100g: null,
    ...overrides,
  };
}

function makeCatalog(overrides: Partial<FoodCatalogRow> = {}): FoodCatalogRow {
  return {
    id: "cat-breast-cooked",
    fdc_id: 171140,
    description: "Chicken breast cooked",
    normalized_name: "chicken breast cooked",
    aliases: ["chicken breast"],
    data_type: "Foundation",
    brand_owner: null,
    brand_name: null,
    gtin_upc: null,
    food_category: "Poultry",
    ingredients: null,
    serving_size: 1,
    serving_unit: "piece",
    serving_weight_grams: 120,
    calories_per_100g: 165,
    protein_g_per_100g: 31,
    carbohydrate_g_per_100g: 0,
    fat_g_per_100g: 3.6,
    fiber_g_per_100g: null,
    sugar_g_per_100g: null,
    sodium_mg_per_100g: 74,
    source_published_date: null,
    source_modified_date: null,
    retrieved_at: "2026-07-20T00:00:00.000Z",
    is_active: true,
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeSaved(overrides: Partial<FoodRow> = {}): FoodRow {
  return {
    id: "food-shake",
    user_id: "user-1",
    name: "Old shake",
    brand: null,
    serving_size: 1,
    serving_unit: "serving",
    calories: 200,
    protein_g: 30,
    carbohydrate_g: 8,
    fat_g: 3,
    fiber_g: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    catalog_food_id: null,
    fdc_id: null,
    source_status: "manual",
    source_name: null,
    source_data_type: null,
    source_description: null,
    source_brand: null,
    source_gtin_upc: null,
    source_retrieved_at: null,
    serving_weight_grams: null,
    calories_per_100g: null,
    protein_g_per_100g: null,
    carbohydrate_g_per_100g: null,
    fat_g_per_100g: null,
    fiber_g_per_100g: null,
    sugar_g_per_100g: null,
    sodium_mg_per_100g: null,
    ...overrides,
  };
}

describe("recent foods", () => {
  it("orders by created_at and dedupes by logical identity", () => {
    const entries = [
      makeEntry({ id: "e1", catalog_food_id: "a", created_at: "2026-09-22T10:00:00.000Z" }),
      makeEntry({ id: "e2", catalog_food_id: "b", created_at: "2026-09-22T11:00:00.000Z" }),
      makeEntry({ id: "e3", catalog_food_id: "a", created_at: "2026-09-22T12:00:00.000Z" }),
    ];
    const recent = uniqueRecentFoodsFromEntries(entries);
    expect(recent.map((item) => item.identity.catalogFoodId)).toEqual(["a", "b"]);
    expect(recent[0]?.lastLoggedAt).toBe("2026-09-22T12:00:00.000Z");
  });

  it("does not treat saved-food creation date as recency", () => {
    const saved = makeSaved({ created_at: "2020-01-01T00:00:00.000Z" });
    const entries = [
      makeEntry({
        id: "logged-shake",
        catalog_food_id: null,
        food_id: saved.id,
        created_at: "2026-09-22T15:00:00.000Z",
        food_name: saved.name,
      }),
    ];
    const recent = buildRecentPersonalFoods(entries, [], [saved]);
    expect(recent[0]?.identity.foodId).toBe(saved.id);
    expect(recent[0]?.lastLoggedAt).toBe("2026-09-22T15:00:00.000Z");
  });
});

describe("frequent foods", () => {
  it("counts only entries inside the 45-day window and tie-breaks by recency then identity", () => {
    const now = new Date("2026-09-22T00:00:00.000Z");
    const entries = [
      makeEntry({ id: "old", catalog_food_id: "old-food", created_at: "2026-07-01T00:00:00.000Z" }),
      makeEntry({ id: "a1", catalog_food_id: "a", created_at: "2026-09-20T00:00:00.000Z" }),
      makeEntry({ id: "a2", catalog_food_id: "a", created_at: "2026-09-21T00:00:00.000Z" }),
      makeEntry({ id: "b1", catalog_food_id: "b", created_at: "2026-09-21T12:00:00.000Z" }),
      makeEntry({ id: "b2", catalog_food_id: "b", created_at: "2026-09-21T13:00:00.000Z" }),
      makeEntry({ id: "c1", catalog_food_id: "c", created_at: "2026-09-22T00:00:00.000Z" }),
    ];
    const frequent = frequentFoodsFromEntries(entries, now);
    expect(frequent.map((item) => item.identity.catalogFoodId)).toEqual(["b", "a", "c"]);
    expect(frequent.find((item) => item.identity.catalogFoodId === "old-food")).toBeUndefined();
    expect(frequent[0]?.count).toBe(2);
  });

  it("hydrates catalog names from catalog rows without extra queries", () => {
    const catalog = makeCatalog();
    const entries = [makeEntry({ created_at: "2026-09-22T12:00:00.000Z" }), makeEntry({ id: "e2", created_at: "2026-09-21T12:00:00.000Z" })];
    const frequent = buildFrequentPersonalFoods(entries, [catalog], [], new Date("2026-09-22T18:00:00.000Z"));
    expect(frequent[0]?.name).toBe("Chicken Breast");
    expect(frequent[0]?.occurrenceCount).toBe(2);
    expect(frequent[0]?.catalogFood?.id).toBe(catalog.id);
  });
});
