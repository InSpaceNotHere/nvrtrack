import { describe, expect, it } from "vitest";

import {
  normalizeUsdaFdcId,
  normalizeUsdaSearchQuery,
  normalizeUsdaSearchRequest,
  USDA_SEARCH_MAX_PAGE_SIZE,
  USDA_SEARCH_MIN_QUERY_LENGTH,
} from "./search";

describe("USDA search helpers", () => {
  it("normalizes and trims search query text", () => {
    expect(normalizeUsdaSearchQuery("  chicken   breast  ")).toBe("chicken breast");
  });

  it("validates minimum query length", () => {
    expect(() =>
      normalizeUsdaSearchRequest({
        query: "a",
      }),
    ).toThrowError(new RegExp(`${USDA_SEARCH_MIN_QUERY_LENGTH}`));
  });

  it("clamps page size and sanitizes page number", () => {
    const normalized = normalizeUsdaSearchRequest({
      query: "chicken breast",
      pageSize: 1000,
      pageNumber: 0,
      dataTypes: [" Foundation ", "", "Branded"],
    });

    expect(normalized.pageSize).toBe(USDA_SEARCH_MAX_PAGE_SIZE);
    expect(normalized.pageNumber).toBe(1);
    expect(normalized.dataTypes).toEqual(["Foundation", "Branded"]);
  });

  it("validates FDC IDs", () => {
    expect(normalizeUsdaFdcId("12345")).toBe(12345);
    expect(() => normalizeUsdaFdcId("0")).toThrowError(/positive integer/i);
    expect(() => normalizeUsdaFdcId("abc")).toThrowError(/positive integer/i);
  });
});
