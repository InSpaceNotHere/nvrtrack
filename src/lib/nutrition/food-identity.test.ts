import { describe, expect, it } from "vitest";

import { getLogicalFoodIdentity, identitiesMatch } from "./food-identity";

describe("logical food identity", () => {
  it("prefers catalog_food_id over food_id and snapshot fields", () => {
    const identity = getLogicalFoodIdentity({
      catalog_food_id: "cat-1",
      food_id: "food-1",
      fdc_id: 171140,
      food_name: "Chicken Breast, cooked",
    });
    expect(identity).toEqual({
      type: "catalog",
      key: "catalog:cat-1",
      catalogFoodId: "cat-1",
      foodId: null,
      snapshotKey: null,
    });
  });

  it("uses saved food_id when catalog_food_id is missing", () => {
    const identity = getLogicalFoodIdentity({
      catalog_food_id: null,
      food_id: "food-9",
      food_name: "Protein shake",
    });
    expect(identity.type).toBe("saved");
    expect(identity.key).toBe("saved:food-9");
  });

  it("uses fdc snapshot identity for historical USDA rows without catalog or saved ids", () => {
    const identity = getLogicalFoodIdentity({
      catalog_food_id: null,
      food_id: null,
      fdc_id: 171140,
      food_name: "Chicken, broilers or fryers, breast, meat only, cooked, braised",
    });
    expect(identity.type).toBe("snapshot");
    expect(identity.snapshotKey).toBe("fdc:171140");
    expect(identity.key).toBe("snapshot:fdc:171140");
  });

  it("keeps distinct catalog ids for cooked vs raw chicken breast", () => {
    const cooked = getLogicalFoodIdentity({ catalog_food_id: "breast-cooked" });
    const raw = getLogicalFoodIdentity({ catalog_food_id: "breast-raw" });
    expect(identitiesMatch(cooked, raw)).toBe(false);
  });

  it("does not merge custom foods that share a name but differ in nutrients", () => {
    const shakeA = getLogicalFoodIdentity({
      food_name: "Shake",
      serving_size: 1,
      serving_unit: "serving",
      calories_per_serving: 200,
      protein_per_serving_g: 30,
      carbohydrate_per_serving_g: 8,
      fat_per_serving_g: 3,
    });
    const shakeB = getLogicalFoodIdentity({
      food_name: "Shake",
      serving_size: 1,
      serving_unit: "serving",
      calories_per_serving: 450,
      protein_per_serving_g: 20,
      carbohydrate_per_serving_g: 40,
      fat_per_serving_g: 18,
    });
    expect(identitiesMatch(shakeA, shakeB)).toBe(false);
  });

  it("merges historical custom logs with the same snapshot identity", () => {
    const first = getLogicalFoodIdentity({
      food_name: "Egg bite",
      brand_name: "Home",
      serving_size: 2,
      serving_unit: "piece",
      calories_per_serving: 180,
      protein_per_serving_g: 14,
      carbohydrate_per_serving_g: 2,
      fat_per_serving_g: 12,
    });
    const second = getLogicalFoodIdentity({
      food_name: "Egg bite",
      brand_name: "Home",
      serving_size: 2,
      serving_unit: "piece",
      calories_per_serving: 180.4,
      protein_per_serving_g: 14.02,
      carbohydrate_per_serving_g: 2.04,
      fat_per_serving_g: 12,
    });
    expect(identitiesMatch(first, second)).toBe(true);
  });
});
