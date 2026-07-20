import { describe, expect, it } from "vitest";

import type { FoodCatalogRow, FoodEntryRow } from "../data/auth-context";
import {
  buildCatalogSourceMetadataSnapshot,
  calculateCatalogEntrySnapshot,
  getCatalogSourceServingDefinition,
  recalculateCatalogEntryFromSnapshot,
} from "./catalog-entry";

function makeCatalogRow(overrides: Partial<FoodCatalogRow> = {}): FoodCatalogRow {
  return {
    id: "catalog-1",
    fdc_id: 171077,
    description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    normalized_name: "chicken breast cooked roasted",
    aliases: ["cooked chicken breast"],
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

function makeEntryRow(overrides: Partial<FoodEntryRow> = {}): FoodEntryRow {
  return {
    id: "entry-1",
    user_id: "user-1",
    food_id: null,
    entry_date: "2026-07-20",
    meal_type: "lunch",
    servings: 1,
    note: null,
    food_name: "Chicken cooked",
    brand_name: null,
    serving_size: 100,
    serving_unit: "g",
    calories_per_serving: 165,
    protein_per_serving_g: 31,
    carbohydrate_per_serving_g: 0,
    fat_per_serving_g: 3.6,
    fiber_per_serving_g: null,
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-20T00:00:00.000Z",
    catalog_food_id: "catalog-1",
    fdc_id: 171077,
    source_status: "usda_catalog",
    source_name: "chicken breast cooked roasted",
    source_data_type: "Foundation",
    source_description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
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
    sodium_mg_per_100g: 74,
    ...overrides,
  };
}

describe("catalog-entry nutrition snapshots", () => {
  it("calculates gram-based snapshots with servings fixed to one", () => {
    const snapshot = calculateCatalogEntrySnapshot(makeCatalogRow(), {
      amountValue: 100,
      amountUnit: "g",
    });

    expect(snapshot.servings).toBe(1);
    expect(snapshot.serving_size).toBe(100);
    expect(snapshot.serving_unit).toBe("g");
    expect(snapshot.calories_per_serving).toBeCloseTo(165, 6);
  });

  it("calculates ounce-based snapshots", () => {
    const snapshot = calculateCatalogEntrySnapshot(makeCatalogRow(), {
      amountValue: 4,
      amountUnit: "oz",
    });

    expect(snapshot.amount_grams).toBeCloseTo(113.398, 3);
    expect(snapshot.calories_per_serving).toBeCloseTo(187.1, 1);
  });

  it("calculates source-serving snapshots when a trusted gram weight exists", () => {
    const snapshot = calculateCatalogEntrySnapshot(makeCatalogRow(), {
      amountValue: 2,
      amountUnit: "source_serving",
    });

    expect(snapshot.amount_grams).toBeCloseTo(240, 6);
    expect(snapshot.source_serving_weight_grams).toBe(120);
    expect(snapshot.source_serving_unit).toBe("piece");
  });

  it("rejects source-serving unit when no trusted serving weight exists", () => {
    expect(() =>
      calculateCatalogEntrySnapshot(
        makeCatalogRow({
          serving_weight_grams: null,
        }),
        {
          amountValue: 1,
          amountUnit: "source_serving",
        },
      ),
    ).toThrow("Selected source serving is unavailable for this food.");
  });

  it("rejects records missing required core per-100g nutrients", () => {
    expect(() =>
      calculateCatalogEntrySnapshot(
        makeCatalogRow({
          calories_per_100g: null,
        }),
        {
          amountValue: 100,
          amountUnit: "g",
        },
      ),
    ).toThrow("Food is missing required USDA nutrient fields");
  });

  it("preserves optional nutrient nulls in scaled snapshots", () => {
    const snapshot = calculateCatalogEntrySnapshot(
      makeCatalogRow({
        fiber_g_per_100g: null,
      }),
      {
        amountValue: 100,
        amountUnit: "g",
      },
    );

    expect(snapshot.fiber_per_serving_g).toBeNull();
  });

  it("recalculates catalog entry edits from the stored historical snapshot", () => {
    const snapshot = recalculateCatalogEntryFromSnapshot(makeEntryRow(), {
      amountValue: 4,
      amountUnit: "oz",
    });
    expect(snapshot.servings).toBe(1);
    expect(snapshot.calories_per_serving).toBeCloseTo(187.1, 1);
    expect(snapshot.source_serving_weight_grams).toBe(120);
    expect(snapshot.source_serving_unit).toBe("piece");
  });

  it("retains source metadata fields for snapshots", () => {
    const metadata = buildCatalogSourceMetadataSnapshot(makeCatalogRow());
    expect(metadata.source_status).toBe("usda_catalog");
    expect(metadata.fdc_id).toBe(171077);
    expect(metadata.source_data_type).toBe("Foundation");
  });

  it("builds source serving fallback with quantity one when serving size is missing", () => {
    const sourceServing = getCatalogSourceServingDefinition(
      makeCatalogRow({
        serving_size: null,
        serving_unit: null,
      }),
    );
    expect(sourceServing).toEqual({
      quantity: 1,
      unit: "source serving",
      weightGrams: 120,
    });
  });
});
