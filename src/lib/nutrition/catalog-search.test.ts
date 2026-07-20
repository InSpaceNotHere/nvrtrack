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
});
