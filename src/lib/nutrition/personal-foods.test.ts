import { describe, expect, it } from "vitest";

import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "../data/auth-context";
import {
  buildFrequentPersonalFoods,
  buildRecentPersonalFoods,
  frequentFoodsFromEntries,
  PERSONAL_FREQUENT_WINDOW_DAYS,
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
  it("orders by created_at and dedupes by personal identity", () => {
    const entries = [
      makeEntry({ id: "e1", catalog_food_id: "a", fdc_id: 1, created_at: "2026-09-22T10:00:00.000Z" }),
      makeEntry({ id: "e2", catalog_food_id: "b", fdc_id: 2, created_at: "2026-09-22T11:00:00.000Z" }),
      makeEntry({ id: "e3", catalog_food_id: "a", fdc_id: 1, created_at: "2026-09-22T12:00:00.000Z" }),
    ];
    const recent = uniqueRecentFoodsFromEntries(entries);
    expect(recent.map((item) => item.identity.key)).toEqual(["fdc:1", "fdc:2"]);
    expect(recent[0]?.lastLoggedAt).toBe("2026-09-22T12:00:00.000Z");
    expect(recent[0]?.count).toBe(2);
    expect(recent[0]?.latestEntry.id).toBe("e3");
  });

  it("collapses repeated snapshot-only custom logs into one Recent item", () => {
    const entries = [
      makeEntry({
        id: "s1",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Speed Layer Bowl",
        serving_size: 1,
        serving_unit: "serving",
        calories_per_serving: 111,
        protein_per_serving_g: 9,
        carbohydrate_per_serving_g: 7,
        fat_per_serving_g: 3,
        created_at: "2026-09-22T10:00:00.000Z",
      }),
      makeEntry({
        id: "s2",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Speed Layer Bowl",
        source_description: "legacy snapshot",
        serving_size: 2,
        serving_unit: "serving",
        calories_per_serving: 111,
        protein_per_serving_g: 9,
        carbohydrate_per_serving_g: 7,
        fat_per_serving_g: 3,
        created_at: "2026-09-22T12:00:00.000Z",
      }),
    ];
    const recent = uniqueRecentFoodsFromEntries(entries);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.latestEntry.id).toBe("s2");
    expect(recent[0]?.count).toBe(2);
  });

  it("uses the most recent logged portion as the card representation", () => {
    const entries = [
      makeEntry({
        id: "older",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Overnight oats",
        serving_size: 1,
        serving_unit: "bowl",
        calories_per_serving: 320,
        protein_per_serving_g: 18,
        carbohydrate_per_serving_g: 42,
        fat_per_serving_g: 8,
        created_at: "2026-09-22T08:00:00.000Z",
      }),
      makeEntry({
        id: "newer",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Overnight oats",
        serving_size: 250,
        serving_unit: "g",
        calories_per_serving: 320,
        protein_per_serving_g: 18,
        carbohydrate_per_serving_g: 42,
        fat_per_serving_g: 8,
        created_at: "2026-09-22T18:00:00.000Z",
      }),
    ];
    const recent = buildRecentPersonalFoods(entries, [], []);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.snapshotEntry?.id).toBe("newer");
    expect(recent[0]?.basis).toBe("250 g");
  });

  it("keeps distinct custom foods separate even when logged close together", () => {
    const recent = uniqueRecentFoodsFromEntries([
      makeEntry({
        id: "a",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "House salsa",
        calories_per_serving: 40,
        protein_per_serving_g: 1,
        carbohydrate_per_serving_g: 8,
        fat_per_serving_g: 0,
        created_at: "2026-09-22T12:00:00.000Z",
      }),
      makeEntry({
        id: "b",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "House guacamole",
        calories_per_serving: 40,
        protein_per_serving_g: 1,
        carbohydrate_per_serving_g: 8,
        fat_per_serving_g: 0,
        created_at: "2026-09-22T12:01:00.000Z",
      }),
    ]);
    expect(recent).toHaveLength(2);
  });

  it("keeps raw vs cooked catalog foods distinct", () => {
    const recent = uniqueRecentFoodsFromEntries([
      makeEntry({ id: "cooked", catalog_food_id: "breast-cooked", fdc_id: 171140, created_at: "2026-09-22T12:00:00.000Z" }),
      makeEntry({ id: "raw", catalog_food_id: "breast-raw", fdc_id: 171077, food_name: "Chicken Breast, raw", created_at: "2026-09-22T11:00:00.000Z" }),
    ]);
    expect(recent).toHaveLength(2);
  });

  it("does not treat saved-food creation date as recency", () => {
    const saved = makeSaved({ created_at: "2020-01-01T00:00:00.000Z" });
    const entries = [
      makeEntry({
        id: "logged-shake",
        catalog_food_id: null,
        fdc_id: null,
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
  it("keeps the 45-day window", () => {
    expect(PERSONAL_FREQUENT_WINDOW_DAYS).toBe(45);
  });
  it("counts only entries inside the 45-day window and tie-breaks by recency then identity", () => {
    const now = new Date("2026-09-22T00:00:00.000Z");
    const entries = [
      makeEntry({ id: "old", catalog_food_id: "old-food", fdc_id: 9, created_at: "2026-07-01T00:00:00.000Z" }),
      makeEntry({ id: "a1", catalog_food_id: "a", fdc_id: 1, created_at: "2026-09-20T00:00:00.000Z" }),
      makeEntry({ id: "a2", catalog_food_id: "a", fdc_id: 1, created_at: "2026-09-21T00:00:00.000Z" }),
      makeEntry({ id: "b1", catalog_food_id: "b", fdc_id: 2, created_at: "2026-09-21T12:00:00.000Z" }),
      makeEntry({ id: "b2", catalog_food_id: "b", fdc_id: 2, created_at: "2026-09-21T13:00:00.000Z" }),
      makeEntry({ id: "c1", catalog_food_id: "c", fdc_id: 3, created_at: "2026-09-22T00:00:00.000Z" }),
    ];
    const frequent = frequentFoodsFromEntries(entries, now);
    expect(frequent.map((item) => item.identity.key)).toEqual(["fdc:2", "fdc:1", "fdc:3"]);
    expect(frequent.find((item) => item.identity.key === "fdc:9")).toBeUndefined();
    expect(frequent[0]?.count).toBe(2);
  });

  it("aggregates repeated equivalent logs for saved, catalog, and snapshot foods", () => {
    const now = new Date("2026-09-22T18:00:00.000Z");
    const entries = [
      makeEntry({ id: "c1", catalog_food_id: "cat-breast-cooked", fdc_id: 171140, created_at: "2026-09-22T12:00:00.000Z" }),
      makeEntry({ id: "c2", catalog_food_id: null, fdc_id: 171140, created_at: "2026-09-22T13:00:00.000Z" }),
      makeEntry({
        id: "sv1",
        catalog_food_id: null,
        fdc_id: null,
        food_id: "food-shake",
        food_name: "Old shake",
        created_at: "2026-09-22T10:00:00.000Z",
      }),
      makeEntry({
        id: "sv2",
        catalog_food_id: null,
        fdc_id: null,
        food_id: "food-shake",
        food_name: "Old shake",
        created_at: "2026-09-21T10:00:00.000Z",
      }),
      makeEntry({
        id: "sn1",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Egg bite",
        serving_size: 1,
        serving_unit: "piece",
        calories_per_serving: 180,
        protein_per_serving_g: 14,
        carbohydrate_per_serving_g: 2,
        fat_per_serving_g: 12,
        created_at: "2026-09-22T08:00:00.000Z",
      }),
      makeEntry({
        id: "sn2",
        catalog_food_id: null,
        fdc_id: null,
        food_id: null,
        food_name: "Egg bite",
        serving_size: 2,
        serving_unit: "piece",
        calories_per_serving: 180,
        protein_per_serving_g: 14,
        carbohydrate_per_serving_g: 2,
        fat_per_serving_g: 12,
        created_at: "2026-09-22T09:00:00.000Z",
      }),
    ];
    const frequent = frequentFoodsFromEntries(entries, now);
    expect(frequent.find((item) => item.identity.key === "fdc:171140")?.count).toBe(2);
    expect(frequent.find((item) => item.identity.key === "saved:food-shake")?.count).toBe(2);
    expect(frequent.find((item) => item.identity.key.startsWith("snapshot:"))?.count).toBe(2);
  });

  it("hydrates catalog names from catalog rows without extra queries", () => {
    const catalog = makeCatalog();
    const entries = [makeEntry({ created_at: "2026-09-22T12:00:00.000Z" }), makeEntry({ id: "e2", created_at: "2026-09-21T12:00:00.000Z" })];
    const frequent = buildFrequentPersonalFoods(entries, [catalog], [], new Date("2026-09-22T18:00:00.000Z"));
    expect(frequent[0]?.name).toBe("Chicken Breast");
    expect(frequent[0]?.occurrenceCount).toBe(2);
    expect(frequent[0]?.catalogFood?.id).toBe(catalog.id);
  });

  it("hydrates a catalog row when equivalent snapshot-only FDC logs share the identity", () => {
    const catalog = makeCatalog();
    const entries = [
      makeEntry({
        id: "legacy",
        catalog_food_id: null,
        fdc_id: catalog.fdc_id,
        created_at: "2026-09-22T13:00:00.000Z",
      }),
      makeEntry({
        id: "catalog",
        catalog_food_id: catalog.id,
        fdc_id: catalog.fdc_id,
        created_at: "2026-09-22T12:00:00.000Z",
      }),
    ];
    const recent = buildRecentPersonalFoods(entries, [catalog], []);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.identity.key).toBe(`fdc:${catalog.fdc_id}`);
    expect(recent[0]?.kind).toBe("catalog");
    expect(recent[0]?.catalogFood?.id).toBe(catalog.id);
    expect(recent[0]?.snapshotEntry?.id).toBe("legacy");
  });
});
