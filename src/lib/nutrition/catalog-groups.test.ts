import { describe, expect, it } from "vitest";

import type { FoodCatalogRow } from "../data/auth-context";
import { groupCatalogFoods, rankCatalogFoodGroups } from "./catalog-groups";

function makeCatalogRow(overrides: Partial<FoodCatalogRow> = {}): FoodCatalogRow {
  return {
    id: "catalog-1",
    fdc_id: 171140,
    description: "Chicken, broilers or fryers, breast, skinless, boneless, meat only, cooked, braised",
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

const foods: FoodCatalogRow[] = [
  makeCatalogRow({ id: "breast-cooked", fdc_id: 171140 }),
  makeCatalogRow({
    id: "breast-raw",
    fdc_id: 171077,
    description: "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw",
    normalized_name: "chicken breast raw",
    aliases: ["chicken breast raw"],
    calories_per_100g: 120,
    protein_g_per_100g: 22.5,
    fat_g_per_100g: 2.6,
  }),
  makeCatalogRow({
    id: "breast-roasted",
    fdc_id: 171477,
    description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    normalized_name: "chicken breast cooked roasted",
    aliases: ["cooked chicken breast"],
    calories_per_100g: 165,
    protein_g_per_100g: 31,
    fat_g_per_100g: 3.6,
  }),
  makeCatalogRow({
    id: "breast-grilled",
    fdc_id: 171534,
    description: "Chicken, broilers or fryers, breast, meat only, cooked, grilled",
    normalized_name: "chicken breast grilled",
    aliases: ["grilled chicken breast"],
    calories_per_100g: 165,
    protein_g_per_100g: 31,
    fat_g_per_100g: 3.6,
  }),
  makeCatalogRow({
    id: "wing-cooked",
    fdc_id: 173630,
    description: "Chicken, wing, meat and skin, cooked, roasted",
    normalized_name: "chicken wing cooked",
    aliases: ["chicken wing cooked"],
    calories_per_100g: 203,
    protein_g_per_100g: 30,
    fat_g_per_100g: 8,
  }),
  makeCatalogRow({
    id: "thigh-cooked",
    fdc_id: 172388,
    description: "Chicken, thigh, meat only, cooked, roasted",
    normalized_name: "chicken thigh cooked",
    aliases: ["chicken thigh cooked"],
    calories_per_100g: 179,
    protein_g_per_100g: 24.8,
    fat_g_per_100g: 8.2,
  }),
  makeCatalogRow({
    id: "ground-chicken",
    fdc_id: 171117,
    description: "Chicken, ground, cooked",
    normalized_name: "ground chicken cooked",
    aliases: ["ground chicken"],
    calories_per_100g: 189,
    protein_g_per_100g: 23,
    fat_g_per_100g: 10.9,
  }),
  makeCatalogRow({
    id: "turkey-breast",
    fdc_id: 171496,
    description: "Turkey, breast, meat only, cooked, roasted",
    normalized_name: "turkey breast cooked",
    aliases: ["turkey breast"],
    calories_per_100g: 135,
    protein_g_per_100g: 30,
    fat_g_per_100g: 0.7,
  }),
  makeCatalogRow({
    id: "beef-cooked",
    fdc_id: 174032,
    description: "Beef, ground, 85% lean meat / 15% fat, patty, cooked, pan-broiled",
    normalized_name: "ground beef 85 15 cooked",
    aliases: ["ground beef 85 15"],
    calories_per_100g: 250,
    protein_g_per_100g: 26,
    fat_g_per_100g: 15,
  }),
  makeCatalogRow({
    id: "beef-raw",
    fdc_id: 171796,
    description: "Beef, ground, 85% lean meat / 15% fat, raw",
    normalized_name: "ground beef 85 15 raw",
    aliases: ["ground beef 85 15 raw"],
    calories_per_100g: 215,
    protein_g_per_100g: 18.6,
    fat_g_per_100g: 15,
  }),
];

describe("catalog grouping", () => {
  it("collapses chicken-breast prep rows into one group with a preferred cooked variant", () => {
    const groups = groupCatalogFoods(foods);
    const breast = groups.find((group) => group.name === "Chicken Breast");
    expect(breast).toBeTruthy();
    expect(breast?.preferred.food.id).toBe("breast-cooked");
    expect(breast?.variants.map((variant) => variant.food.id)).toEqual(["breast-cooked", "breast-raw"]);
  });

  it("keeps provenance on each grouped variant", () => {
    const groups = groupCatalogFoods(foods);
    const breast = groups.find((group) => group.name === "Chicken Breast");
    expect(breast?.preferred.food.fdc_id).toBe(171140);
    expect(breast?.preferred.food.description).toMatch(/broilers or fryers, breast/);
    expect(breast?.variants.find((variant) => variant.food.id === "breast-raw")?.food.fdc_id).toBe(171077);
  });

  it("prefers cooked Ground Beef 85/15 without deleting the raw catalog row", () => {
    const groups = groupCatalogFoods(foods);
    const beef = groups.find((group) => group.name === "Ground Beef 85/15");
    expect(beef?.preferred.food.id).toBe("beef-cooked");
    expect(beef?.variants.some((variant) => variant.food.id === "beef-raw")).toBe(true);
  });
});

describe("catalog group ranking", () => {
  it("ranks chicken breast ahead of wings, thighs, ground chicken, and turkey", () => {
    const ranked = rankCatalogFoodGroups(foods, "chicken breast");
    expect(ranked[0]?.name).toBe("Chicken Breast");
    expect(ranked.map((group) => group.name)).not.toEqual(expect.arrayContaining([
      "Chicken Wing",
      "Chicken thigh",
      "Ground chicken",
      "Turkey Breast",
    ]));
  });

  it("still finds chicken wing when the query is specific", () => {
    const ranked = rankCatalogFoodGroups(foods, "chicken wing cooked");
    expect(ranked[0]?.name).toBe("Chicken Wing");
  });
});
