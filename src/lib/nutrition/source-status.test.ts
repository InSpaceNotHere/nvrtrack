import { describe, expect, it } from "vitest";

import {
  hasCoreNutritionChanged,
  isFoodSourceStatus,
  normalizeFoodSourceStatus,
  resolveFoodSourceStatusAfterNutritionEdit,
} from "./source-status";

describe("food source status helpers", () => {
  it("validates allowed statuses", () => {
    expect(isFoodSourceStatus("manual")).toBe(true);
    expect(isFoodSourceStatus("usda_catalog")).toBe(true);
    expect(isFoodSourceStatus("usda_live")).toBe(true);
    expect(isFoodSourceStatus("usda_modified")).toBe(true);
    expect(isFoodSourceStatus("legacy")).toBe(false);
    expect(isFoodSourceStatus(null)).toBe(false);
  });

  it("normalizes unknown legacy values with fallback", () => {
    expect(normalizeFoodSourceStatus("legacy", "manual")).toBe("manual");
    expect(normalizeFoodSourceStatus(undefined, null)).toBeNull();
  });

  it("detects core nutrient changes", () => {
    expect(
      hasCoreNutritionChanged(
        { calories: 100, protein_g: 20, carbohydrate_g: 5, fat_g: 1 },
        { calories: 100, protein_g: 20, carbohydrate_g: 5, fat_g: 1 },
      ),
    ).toBe(false);

    expect(
      hasCoreNutritionChanged(
        { calories: 100, protein_g: 20, carbohydrate_g: 5, fat_g: 1 },
        { calories: 110, protein_g: 20, carbohydrate_g: 5, fat_g: 1 },
      ),
    ).toBe(true);
  });

  it("marks USDA foods as modified when core nutrition is edited", () => {
    const status = resolveFoodSourceStatusAfterNutritionEdit({
      currentStatus: "usda_catalog",
      hasUsdaSource: true,
      previousCoreNutrition: { calories: 100, protein_g: 10, carbohydrate_g: 10, fat_g: 1 },
      nextCoreNutrition: { calories: 120, protein_g: 10, carbohydrate_g: 10, fat_g: 1 },
    });

    expect(status).toBe("usda_modified");
  });

  it("defaults legacy null states to manual compatibility", () => {
    const status = resolveFoodSourceStatusAfterNutritionEdit({
      currentStatus: null,
      hasUsdaSource: false,
      previousCoreNutrition: { calories: 100, protein_g: 10, carbohydrate_g: 10, fat_g: 1 },
      nextCoreNutrition: { calories: 100, protein_g: 10, carbohydrate_g: 10, fat_g: 1 },
    });

    expect(status).toBe("manual");
  });
});
