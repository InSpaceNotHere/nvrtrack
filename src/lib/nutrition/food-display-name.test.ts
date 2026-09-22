import { describe, expect, it } from "vitest";

import { CATALOG_DISPLAY_NAMES_BY_FDC_ID } from "./catalog-display-names";
import {
  formatMacroSummary,
  getCatalogDisplayName,
  getFoodEntryDisplayName,
  humanizeUsdaStyleLabel,
} from "./food-display-name";

describe("food display names", () => {
  it("maps reviewed catalog FDC ids to human names without rewriting source copy", () => {
    expect(CATALOG_DISPLAY_NAMES_BY_FDC_ID[171477]).toBe("Chicken Breast, roasted");
    expect(CATALOG_DISPLAY_NAMES_BY_FDC_ID[171077]).toBe("Chicken Breast, raw");
    expect(CATALOG_DISPLAY_NAMES_BY_FDC_ID[168878]).toBe("White Rice");
    expect(getCatalogDisplayName({
      fdc_id: 171477,
      description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    })).toBe("Chicken Breast, roasted");
  });

  it("humanizes raw USDA descriptions when no FDC map exists", () => {
    expect(
      humanizeUsdaStyleLabel("Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised"),
    ).toBe("Chicken Breast, cooked");
    expect(humanizeUsdaStyleLabel("Rice, white, long-grain, regular, enriched, cooked")).toBe("White Rice");
  });

  it("keeps historical entry provenance while showing a human label", () => {
    expect(
      getFoodEntryDisplayName({
        fdc_id: 171796,
        food_name: "Beef, ground, 85% lean meat / 15% fat, raw (Includes foods for USDA's Food Distribution Program)",
      }),
    ).toBe("Ground Beef 85/15, raw");
  });

  it("drops generic cooked from diary labels while keeping raw when it distinguishes nutrients", () => {
    expect(
      getFoodEntryDisplayName({
        fdc_id: 171140,
        food_name: "Chicken, broilers or fryers, breast, skinless, boneless, meat only, cooked, braised",
      }),
    ).toBe("Chicken Breast");
    expect(
      getFoodEntryDisplayName({
        fdc_id: 174032,
        food_name: "Beef, ground, 85% lean meat / 15% fat, patty, cooked, pan-broiled",
      }),
    ).toBe("Ground Beef 85/15");
    expect(
      getFoodEntryDisplayName({
        fdc_id: 171287,
        food_name: "Egg, whole, raw, fresh",
      }),
    ).toBe("Egg");
  });

  it("formats search rows without database jargon", () => {
    expect(formatMacroSummary({ calories: 165.4, protein_g: 31.02, carbohydrate_g: 0, fat_g: 3.57 })).toBe(
      "165 cal · 31P · 0C · 3.6F",
    );
  });
});
