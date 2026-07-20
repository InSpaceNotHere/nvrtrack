import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearLiveUsdaCachesForTests,
  LiveUsdaError,
  normalizeLiveUsdaSearchGroup,
  resolveLiveUsdaFoodDetail,
  resolveSourceServingFromPortionSelection,
  searchLiveUsdaFoods,
} from "./live";

describe("live USDA server boundary", () => {
  const previousFixtureMode = process.env.USDA_FDC_FIXTURE_MODE;

  beforeEach(() => {
    process.env.USDA_FDC_FIXTURE_MODE = "1";
    clearLiveUsdaCachesForTests();
  });

  afterEach(() => {
    if (previousFixtureMode === undefined) {
      delete process.env.USDA_FDC_FIXTURE_MODE;
    } else {
      process.env.USDA_FDC_FIXTURE_MODE = previousFixtureMode;
    }
    clearLiveUsdaCachesForTests();
  });

  it("validates search groups", () => {
    expect(normalizeLiveUsdaSearchGroup("generic")).toBe("generic");
    expect(normalizeLiveUsdaSearchGroup("branded")).toBe("branded");
    expect(() => normalizeLiveUsdaSearchGroup("all")).toThrowError(/generic or branded/i);
  });

  it("returns capped generic results and keeps branded out", async () => {
    const result = await searchLiveUsdaFoods({
      query: "rice",
      group: "generic",
      limit: 5,
    });

    expect(result.group).toBe("generic");
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result.items.every((item) => !item.dataType.toLowerCase().includes("branded"))).toBe(true);
  });

  it("deduplicates branded records by GTIN and prefers most recent valid", async () => {
    const result = await searchLiveUsdaFoods({
      query: "protein bar",
      group: "branded",
      limit: 10,
    });

    expect(result.items.length).toBeGreaterThan(0);
    const gtinMatched = result.items.filter((item) => item.gtinUpc === "0123456789012");
    expect(gtinMatched).toHaveLength(1);
    expect(gtinMatched[0].fdcId).toBe(2000001);
  });

  it("maps fixture rate-limit errors to typed LiveUsdaError", async () => {
    await expect(
      searchLiveUsdaFoods({
        query: "fixture rate limit",
        group: "generic",
      }),
    ).rejects.toMatchObject<Partial<LiveUsdaError>>({
      code: "rate_limited",
      statusCode: 429,
    });
  });

  it("maps timeout and outage fixtures to safe typed errors", async () => {
    await expect(
      searchLiveUsdaFoods({
        query: "fixture timeout",
        group: "generic",
      }),
    ).rejects.toMatchObject<Partial<LiveUsdaError>>({
      code: "timeout",
    });

    await expect(
      searchLiveUsdaFoods({
        query: "fixture unavailable",
        group: "generic",
      }),
    ).rejects.toMatchObject<Partial<LiveUsdaError>>({
      code: "service_unavailable",
    });
  });

  it("never leaks api key material in surfaced errors", async () => {
    await expect(
      searchLiveUsdaFoods({
        query: "fixture malformed",
        group: "generic",
      }),
    ).rejects.toMatchObject<Partial<LiveUsdaError>>({
      code: "invalid_response",
    });

    try {
      await searchLiveUsdaFoods({
        query: "fixture malformed",
        group: "generic",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(LiveUsdaError);
      const message = (error as LiveUsdaError).message.toLowerCase();
      expect(message.includes("api_key")).toBe(false);
    }
  });

  it("normalizes detail with supported units and portions", async () => {
    const detail = await resolveLiveUsdaFoodDetail({ fdcId: 1000002 });
    expect(detail.fdcId).toBe(1000002);
    expect(detail.supportedAmountUnits).toContain("g");
    expect(detail.supportedAmountUnits).toContain("oz");
    expect(detail.supportedAmountUnits).toContain("source_serving");
    expect(detail.portionOptions.length).toBeGreaterThan(0);

    const serving = resolveSourceServingFromPortionSelection({
      detail,
      amountUnit: "source_serving",
      portionId: detail.portionOptions[0].id,
    });
    expect(serving).not.toBeNull();
    expect(serving?.weightGrams).toBeGreaterThan(0);
  });

  it("keeps explicit zero nutrients valid while flagging truly missing core macros", async () => {
    const missing = await resolveLiveUsdaFoodDetail({ fdcId: 3000001 });
    expect(missing.hasRequiredCoreNutrients).toBe(false);

    const zero = await resolveLiveUsdaFoodDetail({ fdcId: 3000002 });
    expect(zero.hasRequiredCoreNutrients).toBe(true);
    expect(zero.nutrientsPer100g.protein_g.value).toBe(0);
    expect(zero.nutrientsPer100g.protein_g.isMissing).toBe(false);
  });
});
