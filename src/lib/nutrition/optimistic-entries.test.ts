import { describe, expect, it } from "vitest";

import type { FoodEntryRow } from "@/lib/data/auth-context";

import { removeFoodEntryById, replaceFoodEntry } from "./optimistic-entries";

function entry(id: string, calories: number): FoodEntryRow {
  return {
    id,
    user_id: "u1",
    food_id: null,
    catalog_food_id: null,
    fdc_id: null,
    entry_date: "2026-09-24",
    meal_type: "breakfast",
    servings: 1,
    food_name: id,
    brand_name: null,
    serving_size: 1,
    serving_unit: "serving",
    calories_per_serving: calories,
    protein_per_serving_g: 0,
    carbohydrate_per_serving_g: 0,
    fat_per_serving_g: 0,
    fiber_per_serving_g: 0,
    note: null,
    created_at: "2026-09-24T00:00:00.000Z",
    updated_at: "2026-09-24T00:00:00.000Z",
    source_status: "manual",
    source_name: null,
    source_data_type: null,
    source_description: null,
    source_brand: null,
    source_gtin_upc: null,
    source_retrieved_at: null,
    amount_value: null,
    amount_unit: null,
    amount_grams: null,
    source_serving_quantity: null,
    source_serving_weight_grams: null,
    source_serving_unit: null,
    calories_per_100g: null,
    protein_g_per_100g: null,
    carbohydrate_g_per_100g: null,
    fat_g_per_100g: null,
    fiber_g_per_100g: null,
    sugar_g_per_100g: null,
    sodium_mg_per_100g: null,
  } as FoodEntryRow;
}

describe("optimistic nutrition diary rows", () => {
  it("removes a row without touching the rest", () => {
    const rows = [entry("a", 100), entry("b", 200)];
    expect(removeFoodEntryById(rows, "a").map((row) => row.id)).toEqual(["b"]);
    expect(rows).toHaveLength(2);
  });

  it("replaces an edited snapshot in place", () => {
    const rows = [entry("a", 100), entry("b", 200)];
    const next = { ...entry("a", 180) };
    expect(replaceFoodEntry(rows, next)[0]?.calories_per_serving).toBe(180);
    expect(replaceFoodEntry(rows, next)[1]?.id).toBe("b");
  });
});
