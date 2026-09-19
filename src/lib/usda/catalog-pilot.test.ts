import { describe, expect, it } from "vitest";

import {
  buildFoodCatalogPilotLockFile,
  buildPilotLockRecordFromDetailResponse,
  generateFoodCatalogPilotSeedSql,
  hasSecretLikeValue,
  matchesPreparationExpectation,
  validateFoodCatalogPilotManifest,
  validateFoodCatalogPilotLockFile,
  type FoodCatalogManifestRecord,
  type FoodCatalogPilotManifest,
} from "./catalog-pilot";
import type { UsdaFoodDetailResponse } from "./types";

const baseManifestRecord: FoodCatalogManifestRecord = {
  target: "Chicken breast, boneless, skinless, raw",
  fdcId: 12345,
  displayName: "Chicken breast, boneless, skinless, raw",
  exactUsdaDescription: "Chicken breast, boneless, skinless, raw",
  expectedDataType: "Foundation",
  category: "protein",
  aliases: ["chicken breast raw", "raw chicken breast"],
  preparationExpectation: "raw",
};

const baseManifest: FoodCatalogPilotManifest = {
  version: "food-catalog-pilot-manifest-v1",
  records: [baseManifestRecord],
};

function makeDetail(overrides: Partial<UsdaFoodDetailResponse> = {}): UsdaFoodDetailResponse {
  return {
    fdcId: 12345,
    description: "Chicken breast, boneless, skinless, raw",
    dataType: "Foundation",
    publicationDate: "2024-01-01",
    modifiedDate: "2024-02-01",
    foodNutrients: [
      { nutrientId: 1008, unitName: "kcal", value: 165 },
      { nutrientId: 1003, unitName: "g", value: 31 },
      { nutrientId: 1005, unitName: "g", value: 0 },
      { nutrientId: 1004, unitName: "g", value: 3.6 },
      { nutrientId: 1079, unitName: "g", value: 0 },
    ],
    foodPortions: [
      {
        amount: 1,
        gramWeight: 100,
        portionDescription: "100 g",
        measureUnit: { name: "g" },
      },
    ],
    ...overrides,
  };
}

describe("food catalog pilot manifest validation", () => {
  it("validates a correct manifest", () => {
    expect(() => validateFoodCatalogPilotManifest(baseManifest)).not.toThrow();
  });

  it("rejects duplicate FDC IDs", () => {
    const duplicateManifest: FoodCatalogPilotManifest = {
      ...baseManifest,
      records: [
        baseManifestRecord,
        {
          ...baseManifestRecord,
          target: "Duplicate",
          displayName: "Duplicate display",
        },
      ],
    };

    expect(() => validateFoodCatalogPilotManifest(duplicateManifest)).toThrowError(/duplicate manifest fdcid/i);
  });
});

describe("food catalog pilot lock building", () => {
  it("rejects data-type mismatches", () => {
    expect(() =>
      buildPilotLockRecordFromDetailResponse({
        manifestRecord: {
          ...baseManifestRecord,
          expectedDataType: "SR Legacy",
        },
        detailResponse: makeDetail({ dataType: "Foundation" }),
        retrievedAtIso: "2026-07-20T20:00:00.000Z",
      }),
    ).toThrowError(/data type mismatch/i);
  });

  it("rejects missing core nutrients", () => {
    expect(() =>
      buildPilotLockRecordFromDetailResponse({
        manifestRecord: baseManifestRecord,
        detailResponse: makeDetail({
          foodNutrients: [
            { nutrientId: 1008, unitName: "kcal", value: 165 },
            { nutrientId: 1003, unitName: "g", value: 31 },
            { nutrientId: 1005, unitName: "g", value: 0 },
          ],
        }),
        retrievedAtIso: "2026-07-20T20:00:00.000Z",
      }),
    ).toThrowError(/missing required core nutrients/i);
  });

  it("preserves missing optional nutrients as null", () => {
    const record = buildPilotLockRecordFromDetailResponse({
      manifestRecord: baseManifestRecord,
      detailResponse: makeDetail({
        foodNutrients: [
          { nutrientId: 1008, unitName: "kcal", value: 165 },
          { nutrientId: 1003, unitName: "g", value: 31 },
          { nutrientId: 1005, unitName: "g", value: 0 },
          { nutrientId: 1004, unitName: "g", value: 3.6 },
        ],
      }),
      retrievedAtIso: "2026-07-20T20:00:00.000Z",
    });

    expect(record.nutrientsPer100g.fiber_g).toBeNull();
    expect(record.nutrientsPer100g.sugar_g).toBeNull();
    expect(record.nutrientsPer100g.sodium_mg).toBeNull();
  });

  it("preserves source metadata fields", () => {
    const record = buildPilotLockRecordFromDetailResponse({
      manifestRecord: baseManifestRecord,
      detailResponse: makeDetail({
        publicationDate: "2023-12-31",
        modifiedDate: "2024-06-15",
      }),
      retrievedAtIso: "2026-07-20T20:00:00.000Z",
    });

    expect(record.sourcePublishedDate).toBe("2023-12-31");
    expect(record.sourceModifiedDate).toBe("2024-06-15");
    expect(record.retrievedAt).toBe("2026-07-20T20:00:00.000Z");
  });
});

describe("preparation expectation matching", () => {
  it("matches raw wording strictly", () => {
    expect(matchesPreparationExpectation("Chicken breast, raw", "raw")).toBe(true);
    expect(matchesPreparationExpectation("Chicken breast, cooked, roasted", "raw")).toBe(false);
  });

  it("matches cooked wording", () => {
    expect(matchesPreparationExpectation("Chicken breast, cooked, roasted", "cooked")).toBe(true);
    expect(matchesPreparationExpectation("Chicken breast, raw", "cooked")).toBe(false);
  });
});

describe("deterministic lock ordering and SQL generation", () => {
  it("sorts records by FDC ID", () => {
    const recordA = buildPilotLockRecordFromDetailResponse({
      manifestRecord: {
        ...baseManifestRecord,
        fdcId: 200,
        target: "A",
        displayName: "Alpha Item",
        exactUsdaDescription: "A",
        preparationExpectation: "neutral",
      },
      detailResponse: makeDetail({ fdcId: 200, description: "A" }),
      retrievedAtIso: "2026-07-20T20:00:00.000Z",
    });
    const recordB = buildPilotLockRecordFromDetailResponse({
      manifestRecord: {
        ...baseManifestRecord,
        fdcId: 100,
        target: "B",
        displayName: "Beta Item",
        exactUsdaDescription: "B",
        preparationExpectation: "neutral",
      },
      detailResponse: makeDetail({ fdcId: 100, description: "B" }),
      retrievedAtIso: "2026-07-20T20:00:00.000Z",
    });
    const manifest: FoodCatalogPilotManifest = {
      version: "food-catalog-pilot-manifest-v1",
      records: [
        {
          ...baseManifestRecord,
          fdcId: 200,
          target: "A",
          displayName: "Alpha Item",
          exactUsdaDescription: "A",
          preparationExpectation: "neutral",
        },
        {
          ...baseManifestRecord,
          fdcId: 100,
          target: "B",
          displayName: "Beta Item",
          exactUsdaDescription: "B",
          preparationExpectation: "neutral",
        },
      ],
    };

    const lockFile = buildFoodCatalogPilotLockFile({
      manifest,
      records: [recordA, recordB],
      generatedAt: "2026-07-20T20:00:00.000Z",
    });

    expect(lockFile.records.map((record) => record.fdcId)).toEqual([100, 200]);
  });

  it("generates deterministic SQL and escapes strings", () => {
    const manifest: FoodCatalogPilotManifest = {
      version: "food-catalog-pilot-manifest-v1",
      records: [
        {
          ...baseManifestRecord,
          fdcId: 12345,
          displayName: "Farmer's Yogurt",
          exactUsdaDescription: "Farmer's Yogurt",
          aliases: ["farmer's yogurt", "plain yogurt"],
          expectedDataType: "Foundation",
          preparationExpectation: "neutral",
        },
      ],
    };
    const record = buildPilotLockRecordFromDetailResponse({
      manifestRecord: manifest.records[0],
      detailResponse: makeDetail({
        fdcId: 12345,
        description: "Farmer's Yogurt",
        dataType: "Foundation",
        brandOwner: "O'Reilly Foods",
        ingredients: "Milk, cultures",
      }),
      retrievedAtIso: "2026-07-20T20:00:00.000Z",
    });
    const lockFile = buildFoodCatalogPilotLockFile({
      manifest,
      records: [record],
      generatedAt: "2026-07-20T20:00:00.000Z",
    });
    validateFoodCatalogPilotLockFile(lockFile, manifest);

    const sqlA = generateFoodCatalogPilotSeedSql({ lockFile, manifest });
    const sqlB = generateFoodCatalogPilotSeedSql({ lockFile, manifest });
    expect(sqlA).toBe(sqlB);
    expect(sqlA).toContain("Farmer''s Yogurt");
    expect(sqlA).toContain("O''Reilly Foods");
  });

  it("flags secret-like output patterns", () => {
    expect(hasSecretLikeValue("contains sbp_1234567890abcdef1234 token")).toBe(true);
    expect(hasSecretLikeValue("plain public nutritional content")).toBe(false);
  });
});
