import "server-only";

import type {
  NormalizedNutrientAmount,
  NormalizedNutrientsPer100g,
  NormalizedUsdaFoodDetail,
  NormalizedUsdaSearchResult,
} from "./types";
import { UsdaClientError } from "./types";

interface FixtureFoodRecord {
  detail: NormalizedUsdaFoodDetail;
}

function nutrient(value: number | null): NormalizedNutrientAmount {
  return {
    value,
    isMissing: value === null,
  };
}

function nutrientSet(input: {
  calories: number | null;
  protein: number | null;
  carbohydrate: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodiumMg?: number | null;
}): NormalizedNutrientsPer100g {
  return {
    calories_kcal: nutrient(input.calories),
    protein_g: nutrient(input.protein),
    carbohydrate_g: nutrient(input.carbohydrate),
    fat_g: nutrient(input.fat),
    fiber_g: nutrient(input.fiber ?? null),
    sugar_g: nutrient(input.sugar ?? null),
    sodium_mg: nutrient(input.sodiumMg ?? null),
  };
}

const FIXTURE_FOODS: FixtureFoodRecord[] = [
  {
    detail: {
      fdcId: 1000001,
      description: "Chicken, broilers or fryers, breast, skinless, boneless, meat only, raw",
      normalizedName: "chicken broilers or fryers breast skinless boneless meat only raw",
      dataType: "Foundation",
      brandOwner: null,
      brandName: null,
      gtinUpc: null,
      foodCategory: "Poultry Products",
      ingredients: null,
      servingSize: 100,
      servingUnit: "g",
      servingWeightGrams: 100,
      nutrientsPer100g: nutrientSet({
        calories: 120,
        protein: 22.5,
        carbohydrate: 0,
        fat: 2.6,
        fiber: 0,
        sugar: 0,
        sodiumMg: 72,
      }),
      sourcePublishedDate: "2024-02-01",
      sourceModifiedDate: "2025-01-15",
      sourcePortions: [
        {
          id: 5001,
          quantity: 1,
          unit: "breast",
          description: "1 breast",
          modifier: "raw",
          gramWeight: 174,
          isUsableForGramConversion: true,
        },
      ],
    },
  },
  {
    detail: {
      fdcId: 1000002,
      description: "Rice, white, medium-grain, enriched, cooked",
      normalizedName: "rice white medium grain enriched cooked",
      dataType: "Survey (FNDDS)",
      brandOwner: null,
      brandName: null,
      gtinUpc: null,
      foodCategory: "Cereal Grains and Pasta",
      ingredients: null,
      servingSize: null,
      servingUnit: null,
      servingWeightGrams: null,
      nutrientsPer100g: nutrientSet({
        calories: 130,
        protein: 2.4,
        carbohydrate: 28.2,
        fat: 0.3,
        fiber: 0.4,
        sugar: 0.1,
        sodiumMg: 1,
      }),
      sourcePublishedDate: "2023-09-10",
      sourceModifiedDate: "2024-11-20",
      sourcePortions: [
        {
          id: 5002,
          quantity: 1,
          unit: "cup",
          description: "1 cup",
          modifier: "cooked",
          gramWeight: 158,
          isUsableForGramConversion: true,
        },
      ],
    },
  },
  {
    detail: {
      fdcId: 1000003,
      description: "Oats, rolled, regular, dry",
      normalizedName: "oats rolled regular dry",
      dataType: "SR Legacy",
      brandOwner: null,
      brandName: null,
      gtinUpc: null,
      foodCategory: "Breakfast Cereals",
      ingredients: null,
      servingSize: 40,
      servingUnit: "g",
      servingWeightGrams: 40,
      nutrientsPer100g: nutrientSet({
        calories: 389,
        protein: 16.9,
        carbohydrate: 66.3,
        fat: 6.9,
        fiber: 10.6,
        sugar: 0.9,
        sodiumMg: 2,
      }),
      sourcePublishedDate: "2022-04-11",
      sourceModifiedDate: "2025-03-08",
      sourcePortions: [],
    },
  },
  {
    detail: {
      fdcId: 2000001,
      description: "Protein Bar, Chocolate Peanut Butter",
      normalizedName: "protein bar chocolate peanut butter",
      dataType: "Branded",
      brandOwner: "Fit Labs Foods",
      brandName: "Fit Labs",
      gtinUpc: "0123456789012",
      foodCategory: "Snack Bars",
      ingredients: "Protein blend, peanuts, cocoa, inulin",
      servingSize: 60,
      servingUnit: "g",
      servingWeightGrams: 60,
      nutrientsPer100g: nutrientSet({
        calories: 360,
        protein: 30,
        carbohydrate: 33,
        fat: 12,
        fiber: 6,
        sugar: 4,
        sodiumMg: 250,
      }),
      sourcePublishedDate: "2024-05-01",
      sourceModifiedDate: "2025-02-13",
      sourcePortions: [
        {
          id: 6001,
          quantity: 1,
          unit: "bar",
          description: "1 bar",
          modifier: null,
          gramWeight: 60,
          isUsableForGramConversion: true,
        },
      ],
    },
  },
  {
    detail: {
      fdcId: 2000002,
      description: "Protein Bar, Chocolate Peanut Butter",
      normalizedName: "protein bar chocolate peanut butter",
      dataType: "Branded",
      brandOwner: "Fit Labs Foods",
      brandName: "Fit Labs",
      gtinUpc: "0123456789012",
      foodCategory: "Snack Bars",
      ingredients: "Protein blend, peanuts, cocoa, inulin",
      servingSize: 60,
      servingUnit: "g",
      servingWeightGrams: 60,
      nutrientsPer100g: nutrientSet({
        calories: 358,
        protein: 29.8,
        carbohydrate: 32.5,
        fat: 11.8,
        fiber: 6.1,
        sugar: 4.1,
        sodiumMg: 248,
      }),
      sourcePublishedDate: "2024-05-01",
      sourceModifiedDate: "2024-10-10",
      sourcePortions: [
        {
          id: 6002,
          quantity: 1,
          unit: "bar",
          description: "1 bar",
          modifier: null,
          gramWeight: 60,
          isUsableForGramConversion: true,
        },
      ],
    },
  },
  {
    detail: {
      fdcId: 2000003,
      description: "Greek Yogurt, Vanilla",
      normalizedName: "greek yogurt vanilla",
      dataType: "Branded",
      brandOwner: "Example Dairy Co",
      brandName: "Dairy Peak",
      gtinUpc: "0987654321098",
      foodCategory: "Yogurt",
      ingredients: "Cultured milk, vanilla flavor",
      servingSize: 170,
      servingUnit: "g",
      servingWeightGrams: 170,
      nutrientsPer100g: nutrientSet({
        calories: 92,
        protein: 10,
        carbohydrate: 6,
        fat: 0.2,
        fiber: 0,
        sugar: 5.5,
        sodiumMg: 39,
      }),
      sourcePublishedDate: "2024-01-22",
      sourceModifiedDate: "2025-04-01",
      sourcePortions: [
        {
          id: 6003,
          quantity: 1,
          unit: "container",
          description: "1 container",
          modifier: null,
          gramWeight: 170,
          isUsableForGramConversion: true,
        },
      ],
    },
  },
  {
    detail: {
      fdcId: 3000001,
      description: "Sample food missing core nutrient",
      normalizedName: "sample food missing core nutrient",
      dataType: "Foundation",
      brandOwner: null,
      brandName: null,
      gtinUpc: null,
      foodCategory: "Samples",
      ingredients: null,
      servingSize: null,
      servingUnit: null,
      servingWeightGrams: null,
      nutrientsPer100g: nutrientSet({
        calories: 100,
        protein: null,
        carbohydrate: 10,
        fat: 4,
      }),
      sourcePublishedDate: "2021-01-01",
      sourceModifiedDate: "2021-01-01",
      sourcePortions: [],
    },
  },
  {
    detail: {
      fdcId: 3000002,
      description: "Sample food explicit zero macros",
      normalizedName: "sample food explicit zero macros",
      dataType: "Foundation",
      brandOwner: null,
      brandName: null,
      gtinUpc: null,
      foodCategory: "Samples",
      ingredients: null,
      servingSize: null,
      servingUnit: null,
      servingWeightGrams: null,
      nutrientsPer100g: nutrientSet({
        calories: 0,
        protein: 0,
        carbohydrate: 0,
        fat: 0,
      }),
      sourcePublishedDate: "2020-01-01",
      sourceModifiedDate: "2020-01-01",
      sourcePortions: [],
    },
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDataTypes(dataTypes: string[] | undefined): Set<string> {
  return new Set((dataTypes ?? []).map((value) => normalizeText(value)));
}

function dataTypeMatches(dataType: string, allowed: Set<string>): boolean {
  if (!allowed.size) {
    return true;
  }

  const normalized = normalizeText(dataType);
  for (const item of allowed) {
    if (normalized === item || normalized.includes(item) || item.includes(normalized)) {
      return true;
    }
  }

  return false;
}

function matchesFixtureQuery(record: FixtureFoodRecord, normalizedQuery: string): boolean {
  const haystack = normalizeText(
    [
      record.detail.description,
      record.detail.brandName ?? "",
      record.detail.brandOwner ?? "",
      record.detail.gtinUpc ?? "",
      record.detail.foodCategory ?? "",
    ].join(" "),
  );

  const terms = normalizedQuery.split(" ").filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

function shouldUseFixtureMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const value = process.env.USDA_FDC_FIXTURE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function maybeThrowFixtureScenarioError(query: string): void {
  const normalized = normalizeText(query);
  if (normalized.includes("fixture rate limit")) {
    throw new UsdaClientError("rate_limited", "USDA rate limit reached. Please try again soon.", 429);
  }
  if (normalized.includes("fixture timeout")) {
    throw new UsdaClientError("timeout", "USDA request timed out. Please try again.");
  }
  if (normalized.includes("fixture unavailable")) {
    throw new UsdaClientError(
      "service_unavailable",
      "USDA service is temporarily unavailable. Please try again later.",
      503,
    );
  }
  if (normalized.includes("fixture malformed")) {
    throw new UsdaClientError("invalid_response", "USDA service returned malformed JSON.");
  }
}

export function isUsdaFixtureModeEnabled(): boolean {
  return shouldUseFixtureMode();
}

export async function searchFixtureUsdaFoods(input: {
  query: string;
  pageSize: number;
  pageNumber: number;
  dataTypes?: string[];
}): Promise<NormalizedUsdaSearchResult> {
  maybeThrowFixtureScenarioError(input.query);

  const normalizedQuery = normalizeText(input.query);
  const allowedDataTypes = normalizeDataTypes(input.dataTypes);
  const filtered = FIXTURE_FOODS
    .filter((record) => dataTypeMatches(record.detail.dataType, allowedDataTypes))
    .filter((record) => matchesFixtureQuery(record, normalizedQuery))
    .map((record) => {
      const { sourcePortions: _ignoredPortions, ...summary } = record.detail;
      return summary;
    });

  const startIndex = Math.max(0, (input.pageNumber - 1) * input.pageSize);
  const foods = filtered.slice(startIndex, startIndex + input.pageSize);
  const totalHits = filtered.length;
  const totalPages = totalHits === 0 ? 1 : Math.ceil(totalHits / input.pageSize);

  return {
    foods,
    totalHits,
    currentPage: input.pageNumber,
    totalPages,
  };
}

export async function getFixtureUsdaFoodDetail(fdcId: number): Promise<NormalizedUsdaFoodDetail> {
  const record = FIXTURE_FOODS.find((item) => item.detail.fdcId === fdcId);
  if (!record) {
    throw new UsdaClientError("upstream_error", "USDA request failed. Please refine your request and retry.", 404);
  }
  return record.detail;
}
