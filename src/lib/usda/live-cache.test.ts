import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { searchUsdaFoodsMock, getUsdaFoodDetailMock } = vi.hoisted(() => ({
  searchUsdaFoodsMock: vi.fn(),
  getUsdaFoodDetailMock: vi.fn(),
}));

vi.mock("./client", () => ({
  searchUsdaFoods: searchUsdaFoodsMock,
  getUsdaFoodDetail: getUsdaFoodDetailMock,
}));

vi.mock("./fixtures", () => ({
  isUsdaFixtureModeEnabled: () => false,
  searchFixtureUsdaFoods: vi.fn(),
  getFixtureUsdaFoodDetail: vi.fn(),
}));

import type { NormalizedNutrientsPer100g, NormalizedUsdaFoodDetail, NormalizedUsdaFoodSummary } from "./types";
import {
  clearLiveUsdaCachesForTests,
  getLiveUsdaCacheStatsForTests,
  LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES,
  LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES,
  resolveLiveUsdaFoodDetail,
  searchLiveUsdaFoods,
} from "./live";

function createNutrients(): NormalizedNutrientsPer100g {
  return {
    calories_kcal: { value: 100, isMissing: false },
    protein_g: { value: 10, isMissing: false },
    carbohydrate_g: { value: 20, isMissing: false },
    fat_g: { value: 5, isMissing: false },
    fiber_g: { value: 2, isMissing: false },
    sugar_g: { value: 3, isMissing: false },
    sodium_mg: { value: 120, isMissing: false },
  };
}

function createSummary(fdcId: number, description: string, dataType = "Foundation"): NormalizedUsdaFoodSummary {
  return {
    fdcId,
    description,
    normalizedName: description.toLowerCase(),
    dataType,
    brandOwner: null,
    brandName: null,
    gtinUpc: null,
    foodCategory: "Test",
    ingredients: null,
    servingSize: 100,
    servingUnit: "g",
    servingWeightGrams: 100,
    nutrientsPer100g: createNutrients(),
    sourcePublishedDate: "2024-01-01",
    sourceModifiedDate: "2024-01-02",
  };
}

function createDetail(fdcId: number): NormalizedUsdaFoodDetail {
  return {
    ...createSummary(fdcId, `Detail ${fdcId}`),
    sourcePortions: [
      {
        id: fdcId,
        quantity: 1,
        unit: "serving",
        description: null,
        modifier: null,
        gramWeight: 100,
        isUsableForGramConversion: true,
      },
    ],
  };
}

describe("USDA live cache hardening", () => {
  const previousFixtureMode = process.env.USDA_FDC_FIXTURE_MODE;

  beforeEach(() => {
    delete process.env.USDA_FDC_FIXTURE_MODE;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    vi.clearAllMocks();
    clearLiveUsdaCachesForTests();

    searchUsdaFoodsMock.mockImplementation(async ({ query }: { query: string }) => ({
      foods: [createSummary(Number(query.replace(/\D/g, "")) || 1, `Food ${query}`)],
      totalHits: 1,
      currentPage: 1,
      totalPages: 1,
    }));
    getUsdaFoodDetailMock.mockImplementation(async (fdcId: number) => createDetail(fdcId));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearLiveUsdaCachesForTests();
    if (previousFixtureMode === undefined) {
      delete process.env.USDA_FDC_FIXTURE_MODE;
    } else {
      process.env.USDA_FDC_FIXTURE_MODE = previousFixtureMode;
    }
  });

  it("enforces search cache max size with deterministic LRU eviction", async () => {
    for (let index = 0; index < LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES; index += 1) {
      await searchLiveUsdaFoods({ query: `search ${index}`, group: "generic", limit: 5 });
    }
    expect(getLiveUsdaCacheStatsForTests().searchSize).toBe(LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES);

    await searchLiveUsdaFoods({ query: "search 0", group: "generic", limit: 5 });
    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES);

    await searchLiveUsdaFoods({ query: "search overflow", group: "generic", limit: 5 });
    expect(getLiveUsdaCacheStatsForTests().searchSize).toBe(LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES);

    await searchLiveUsdaFoods({ query: "search 1", group: "generic", limit: 5 });
    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES + 2);

    await searchLiveUsdaFoods({ query: "search 0", group: "generic", limit: 5 });
    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES + 2);
  });

  it("enforces detail cache max size with deterministic LRU eviction", async () => {
    for (let index = 1; index <= LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES; index += 1) {
      await resolveLiveUsdaFoodDetail({ fdcId: index });
    }
    expect(getLiveUsdaCacheStatsForTests().detailSize).toBe(LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES);

    await resolveLiveUsdaFoodDetail({ fdcId: 1 });
    expect(getUsdaFoodDetailMock).toHaveBeenCalledTimes(LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES);

    await resolveLiveUsdaFoodDetail({ fdcId: 999_999 });
    expect(getLiveUsdaCacheStatsForTests().detailSize).toBe(LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES);

    await resolveLiveUsdaFoodDetail({ fdcId: 2 });
    expect(getUsdaFoodDetailMock).toHaveBeenCalledTimes(LIVE_USDA_DETAIL_CACHE_MAX_ENTRIES + 2);
  });

  it("preserves TTL behavior and prunes expired entries during cache operations", async () => {
    await searchLiveUsdaFoods({ query: "ttl test", group: "generic" });
    await searchLiveUsdaFoods({ query: "ttl test", group: "generic" });
    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_001);
    await searchLiveUsdaFoods({ query: "ttl test", group: "generic" });
    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(2);

    for (let index = 0; index < 5; index += 1) {
      await searchLiveUsdaFoods({ query: `stale ${index}`, group: "generic" });
    }
    expect(getLiveUsdaCacheStatsForTests().searchSize).toBeGreaterThanOrEqual(5);

    vi.advanceTimersByTime(60_001);
    await searchLiveUsdaFoods({ query: "post-expiry", group: "generic" });
    expect(getLiveUsdaCacheStatsForTests().searchSize).toBe(1);
  });

  it("never caches failed USDA requests", async () => {
    searchUsdaFoodsMock.mockRejectedValueOnce(new Error("upstream failure"));
    await expect(searchLiveUsdaFoods({ query: "fail me", group: "generic" })).rejects.toThrow();

    searchUsdaFoodsMock.mockRejectedValueOnce(new Error("upstream failure"));
    await expect(searchLiveUsdaFoods({ query: "fail me", group: "generic" })).rejects.toThrow();

    expect(searchUsdaFoodsMock).toHaveBeenCalledTimes(2);
    expect(getLiveUsdaCacheStatsForTests().searchSize).toBe(0);
  });

  it("keeps search and detail caches independent and clearable", async () => {
    await resolveLiveUsdaFoodDetail({ fdcId: 777 });
    await searchLiveUsdaFoods({ query: "independent cache", group: "generic" });
    expect(getLiveUsdaCacheStatsForTests()).toEqual({ searchSize: 1, detailSize: 1 });

    for (let index = 0; index < LIVE_USDA_SEARCH_CACHE_MAX_ENTRIES + 4; index += 1) {
      await searchLiveUsdaFoods({ query: `independent ${index}`, group: "generic" });
    }

    const detailCallsBefore = getUsdaFoodDetailMock.mock.calls.length;
    await resolveLiveUsdaFoodDetail({ fdcId: 777 });
    expect(getUsdaFoodDetailMock.mock.calls.length).toBe(detailCallsBefore);

    clearLiveUsdaCachesForTests();
    expect(getLiveUsdaCacheStatsForTests()).toEqual({ searchSize: 0, detailSize: 0 });
  });
});
