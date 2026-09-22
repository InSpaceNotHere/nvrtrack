import { describe, expect, it } from "vitest";

import { getPersonalFoodIdentity, identitiesMatch } from "./food-identity";

describe("user-facing personal food identity", () => {
  it("keys USDA-sourced foods by FDC so catalog and snapshot logs of the same food merge", () => {
    const fromCatalog = getPersonalFoodIdentity({
      catalog_food_id: "cat-1",
      fdc_id: 171140,
      food_name: "Chicken Breast, cooked",
    });
    const fromLegacy = getPersonalFoodIdentity({
      catalog_food_id: null,
      fdc_id: 171140,
      food_name: "Chicken, broilers or fryers, breast, meat only, cooked, braised",
    });
    expect(fromCatalog.key).toBe("fdc:171140");
    expect(identitiesMatch(fromCatalog, fromLegacy)).toBe(true);
    expect(fromCatalog.catalogFoodId).toBe("cat-1");
  });

  it("uses saved food_id when there is no USDA source", () => {
    const identity = getPersonalFoodIdentity({
      catalog_food_id: null,
      food_id: "food-9",
      food_name: "Protein shake",
    });
    expect(identity.key).toBe("saved:food-9");
  });

  it("keeps raw vs cooked chicken breast separate", () => {
    const cooked = getPersonalFoodIdentity({ catalog_food_id: "breast-cooked", fdc_id: 171140 });
    const raw = getPersonalFoodIdentity({ catalog_food_id: "breast-raw", fdc_id: 171077 });
    expect(identitiesMatch(cooked, raw)).toBe(false);
  });

  it("merges snapshot-only custom logs that only differ by serving metadata", () => {
    const first = getPersonalFoodIdentity({
      food_name: "Speed Layer Bowl",
      source_description: "manual label v1",
      serving_size: 1,
      serving_unit: "serving",
      calories_per_serving: 111,
      protein_per_serving_g: 9,
      carbohydrate_per_serving_g: 7,
      fat_per_serving_g: 3,
    });
    const second = getPersonalFoodIdentity({
      food_name: "Speed Layer Bowl",
      source_description: null,
      serving_size: 100,
      serving_unit: "g",
      calories_per_serving: 111.4,
      protein_per_serving_g: 9.02,
      carbohydrate_per_serving_g: 7,
      fat_per_serving_g: 3,
    });
    expect(identitiesMatch(first, second)).toBe(true);
  });

  it("does not merge custom foods that share a name but differ in nutrients", () => {
    const shakeA = getPersonalFoodIdentity({
      food_name: "Shake",
      calories_per_serving: 200,
      protein_per_serving_g: 30,
      carbohydrate_per_serving_g: 8,
      fat_per_serving_g: 3,
    });
    const shakeB = getPersonalFoodIdentity({
      food_name: "Shake",
      calories_per_serving: 450,
      protein_per_serving_g: 20,
      carbohydrate_per_serving_g: 40,
      fat_per_serving_g: 18,
    });
    expect(identitiesMatch(shakeA, shakeB)).toBe(false);
  });

  it("keeps different custom food names separate", () => {
    const salsa = getPersonalFoodIdentity({
      food_name: "House salsa",
      calories_per_serving: 40,
      protein_per_serving_g: 1,
      carbohydrate_per_serving_g: 8,
      fat_per_serving_g: 0,
    });
    const guacamole = getPersonalFoodIdentity({
      food_name: "House guacamole",
      calories_per_serving: 40,
      protein_per_serving_g: 1,
      carbohydrate_per_serving_g: 8,
      fat_per_serving_g: 0,
    });
    expect(identitiesMatch(salsa, guacamole)).toBe(false);
  });

  it("maps catalog favorites onto the same FDC key used by Recent", () => {
    const recent = getPersonalFoodIdentity({ catalog_food_id: "breast-cooked", fdc_id: 171140 });
    const storedFavorite = getPersonalFoodIdentity({ catalog_food_id: "breast-cooked", fdc_id: 171140 });
    expect(storedFavorite.key).toBe("fdc:171140");
    expect(identitiesMatch(recent, storedFavorite)).toBe(true);
  });
});
