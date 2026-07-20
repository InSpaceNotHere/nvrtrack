import { describe, expect, it } from "vitest";

import { normalizeCatalogSearchText, rankCatalogSearchItems } from "./catalog-search";

const ITEMS = [
  {
    id: "1",
    fdc_id: 1001,
    normalized_name: "chicken breast raw",
    description: "Chicken, broilers or fryers, breast, meat only, raw",
    aliases: ["chicken breast raw"],
  },
  {
    id: "2",
    fdc_id: 1002,
    normalized_name: "chicken breast cooked roasted",
    description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    aliases: ["cooked chicken breast"],
  },
  {
    id: "3",
    fdc_id: 1003,
    normalized_name: "white rice cooked",
    description: "Rice, white, long-grain, regular, cooked",
    aliases: ["white rice cooked"],
  },
];

describe("catalog search ranking", () => {
  it("normalizes query text deterministically", () => {
    expect(normalizeCatalogSearchText("  Chicken  Breast, Cooked! ")).toBe("chicken breast cooked");
  });

  it("prefers exact normalized-name matches first", () => {
    const ranked = rankCatalogSearchItems(ITEMS, "chicken breast raw");
    expect(ranked[0]?.id).toBe("1");
  });

  it("supports alias-based ranking", () => {
    const ranked = rankCatalogSearchItems(ITEMS, "cooked chicken breast");
    expect(ranked[0]?.id).toBe("2");
  });

  it("keeps raw and cooked records separate", () => {
    const ranked = rankCatalogSearchItems(ITEMS, "chicken breast");
    expect(ranked.map((item) => item.id)).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("applies recent usage tie-break bonus", () => {
    const ranked = rankCatalogSearchItems(
      [
        { ...ITEMS[0], normalized_name: "oats dry" },
        { ...ITEMS[1], id: "4", fdc_id: 2002, normalized_name: "oats instant" },
      ],
      "oats",
      { recentFdcIds: [2002] },
    );
    expect(ranked[0]?.fdc_id).toBe(2002);
  });

  it("enforces result limits with large candidate sets", () => {
    const largeItems = Array.from({ length: 180 }).map((_, index) => ({
      id: `item-${index + 1}`,
      fdc_id: 4000 + index,
      normalized_name: `food ${String(index + 1).padStart(3, "0")} chicken breast`,
      description: `Food ${index + 1} chicken breast cooked`,
      aliases: [`food ${index + 1} chicken`],
    }));
    const ranked = rankCatalogSearchItems(largeItems, "chicken", { limit: 40 });
    expect(ranked).toHaveLength(40);
  });

  it("keeps stable alphabetical and fdc tie-breaking", () => {
    const tied = [
      {
        id: "a",
        fdc_id: 9002,
        normalized_name: "alpha oats cooked",
        description: "Alpha oats cooked",
        aliases: ["alpha oats cooked"],
      },
      {
        id: "b",
        fdc_id: 9001,
        normalized_name: "alpha oats cooked",
        description: "Alpha oats cooked",
        aliases: ["alpha oats cooked"],
      },
      {
        id: "c",
        fdc_id: 9003,
        normalized_name: "beta oats cooked",
        description: "Beta oats cooked",
        aliases: ["beta oats cooked"],
      },
    ];
    const ranked = rankCatalogSearchItems(tied, "oats cooked", { limit: 10 });
    expect(ranked.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});
