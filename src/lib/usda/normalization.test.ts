import { describe, expect, it } from "vitest";

import { normalizeUsdaFoodDetailResponse, normalizeUsdaSearchResponse } from "./normalization";
import type { UsdaFoodDetailResponse, UsdaSearchResponse } from "./types";

describe("USDA response normalization", () => {
  it("keeps raw and cooked descriptions distinct in search results", () => {
    const response: UsdaSearchResponse = {
      foods: [
        {
          fdcId: 101,
          description: "Chicken breast, boneless, skinless, raw",
          dataType: "Foundation",
          foodNutrients: [
            { nutrientId: 1008, unitName: "kcal", value: 120 },
            { nutrientId: 1003, unitName: "g", value: 22 },
            { nutrientId: 1005, unitName: "g", value: 0 },
            { nutrientId: 1004, unitName: "g", value: 2.6 },
          ],
        },
        {
          fdcId: 102,
          description: "Chicken breast, boneless, skinless, cooked, roasted",
          dataType: "Foundation",
          foodNutrients: [
            { nutrientId: 1008, unitName: "kcal", value: 165 },
            { nutrientId: 1003, unitName: "g", value: 31 },
            { nutrientId: 1005, unitName: "g", value: 0 },
            { nutrientId: 1004, unitName: "g", value: 3.6 },
          ],
        },
      ],
      totalHits: 2,
      currentPage: 1,
      totalPages: 1,
    };

    const normalized = normalizeUsdaSearchResponse(response);
    expect(normalized.foods).toHaveLength(2);
    expect(normalized.foods[0].description).toContain("raw");
    expect(normalized.foods[1].description).toContain("cooked, roasted");
    expect(normalized.foods[0].normalizedName).not.toBe(normalized.foods[1].normalizedName);
  });

  it("normalizes branded detail metadata and portions", () => {
    const detail: UsdaFoodDetailResponse = {
      fdcId: 200001,
      description: "Yogurt, Greek, vanilla, high protein",
      dataType: "Branded",
      brandOwner: "Example Dairy Co",
      brandName: "Example Pro",
      gtinUpc: "0123456789012",
      ingredients: "Cultured milk, vanilla, pectin",
      foodCategory: "Yogurt",
      servingSize: 170,
      servingSizeUnit: "g",
      publicationDate: "2024-02-01",
      modifiedDate: "2024-08-14",
      foodNutrients: [
        { nutrientId: 1008, unitName: "kcal", value: 92 },
        { nutrientId: 1003, unitName: "g", value: 10 },
        { nutrientId: 1005, unitName: "g", value: 6 },
        { nutrientId: 1004, unitName: "g", value: 0 },
        { nutrientId: 2000, unitName: "g", value: 5 },
        { nutrientId: 1093, unitName: "mg", value: 40 },
      ],
      foodPortions: [
        {
          id: 77,
          amount: 1,
          gramWeight: 170,
          modifier: "container",
          portionDescription: "1 container",
          measureUnit: { name: "container" },
        },
      ],
    };

    const normalized = normalizeUsdaFoodDetailResponse(detail);
    expect(normalized.fdcId).toBe(200001);
    expect(normalized.dataType).toBe("Branded");
    expect(normalized.brandOwner).toBe("Example Dairy Co");
    expect(normalized.brandName).toBe("Example Pro");
    expect(normalized.gtinUpc).toBe("0123456789012");
    expect(normalized.servingWeightGrams).toBe(170);
    expect(normalized.sourcePortions).toHaveLength(1);
    expect(normalized.sourcePortions[0].gramWeight).toBe(170);
    expect(normalized.sourcePortions[0].isUsableForGramConversion).toBe(true);
  });
});
