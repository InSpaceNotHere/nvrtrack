import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FOOD_CATALOG_PILOT_MANIFEST } from "../../../scripts/usda/food-catalog-manifest";
import {
  hasSecretLikeValue,
  validateFoodCatalogPilotLockFile,
  validateFoodCatalogPilotManifest,
} from "./catalog-pilot";

const LOCK_PATH = path.join(process.cwd(), "scripts", "usda", "generated", "food-catalog-reviewed.lock.json");
const SQL_PATH = path.join(process.cwd(), "scripts", "usda", "generated", "food-catalog-reviewed.sql");

const PILOT_LOCKED_PAIRS: ReadonlyArray<{ fdcId: number; description: string }> = [
  { fdcId: 171077, description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw" },
  { fdcId: 171140, description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised" },
  { fdcId: 173627, description: "Chicken, broilers or fryers, dark meat, thigh, meat only, raw" },
  { fdcId: 172388, description: "Chicken, broilers or fryers, thigh, meat only, cooked, roasted" },
  { fdcId: 174030, description: "Beef, ground, 90% lean meat / 10% fat, raw" },
  { fdcId: 171793, description: "Beef, ground, 90% lean meat / 10% fat, patty, cooked, pan-broiled" },
  { fdcId: 171287, description: "Egg, whole, raw, fresh" },
  { fdcId: 172183, description: "Egg, white, raw, fresh" },
  { fdcId: 171998, description: "Fish, salmon, Atlantic, wild, cooked, dry heat" },
  { fdcId: 175177, description: "Fish, tilapia, cooked, dry heat" },
  { fdcId: 168878, description: "Rice, white, long-grain, regular, enriched, cooked" },
  { fdcId: 169704, description: "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)" },
  { fdcId: 173904, description: "Cereals, oats, regular and quick, not fortified, dry" },
  { fdcId: 170030, description: "Potatoes, Russet, flesh and skin, baked" },
  { fdcId: 168483, description: "Sweet potato, cooked, baked in skin, flesh, without salt" },
  { fdcId: 173944, description: "Bananas, raw" },
  { fdcId: 169967, description: "Broccoli, cooked, boiled, drained, without salt" },
  { fdcId: 171265, description: "Milk, whole, 3.25% milkfat, with added vitamin D" },
  { fdcId: 170894, description: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)" },
  { fdcId: 171413, description: "Oil, olive, salad or cooking" },
];

describe("phase 2C manifest coverage and invariants", () => {
  it("keeps manifest count in the approved expansion range", () => {
    expect(FOOD_CATALOG_PILOT_MANIFEST.records.length).toBeGreaterThanOrEqual(140);
    expect(FOOD_CATALOG_PILOT_MANIFEST.records.length).toBeLessThanOrEqual(200);
  });

  it("validates manifest structure and uniqueness rules", () => {
    expect(() => validateFoodCatalogPilotManifest(FOOD_CATALOG_PILOT_MANIFEST)).not.toThrow();
  });

  it("includes required app-category coverage", () => {
    const categories = new Set(FOOD_CATALOG_PILOT_MANIFEST.records.map((record) => record.category));
    expect(categories).toEqual(
      new Set([
        "protein",
        "seafood",
        "dairy",
        "grains_and_starches",
        "fruit",
        "vegetables",
        "fats_and_extras",
      ]),
    );
  });

  it("preserves original 20 pilot IDs and exact descriptions", () => {
    const byFdc = new Map(FOOD_CATALOG_PILOT_MANIFEST.records.map((record) => [record.fdcId, record.exactUsdaDescription]));
    for (const expected of PILOT_LOCKED_PAIRS) {
      expect(byFdc.get(expected.fdcId)).toBe(expected.description);
    }
  });

  it("contains lean-percentage ground beef distinctions in raw and cooked states", () => {
    const descriptions = FOOD_CATALOG_PILOT_MANIFEST.records.map((record) => record.exactUsdaDescription.toLowerCase());
    for (const ratio of ["80% lean", "85% lean", "90% lean", "93% lean"]) {
      expect(descriptions.some((description) => description.includes(ratio) && description.includes("raw"))).toBe(true);
      expect(descriptions.some((description) => description.includes(ratio) && description.includes("cooked"))).toBe(true);
    }
  });

  it("contains explicit raw/cooked poultry and seafood pairings", () => {
    const descriptions = FOOD_CATALOG_PILOT_MANIFEST.records.map((record) => record.exactUsdaDescription.toLowerCase());
    expect(
      descriptions.some((description) => description.includes("chicken") && description.includes("breast") && description.includes("raw")),
    ).toBe(true);
    expect(
      descriptions.some((description) => description.includes("chicken") && description.includes("breast") && description.includes("cooked")),
    ).toBe(true);
    expect(
      descriptions.some((description) => description.includes("salmon") && description.includes("atlantic") && description.includes("raw")),
    ).toBe(true);
    expect(
      descriptions.some((description) => description.includes("salmon") && description.includes("atlantic") && description.includes("cooked")),
    ).toBe(true);
  });
});

describe("phase 2C reviewed lock and SQL artifacts", () => {
  it("checks reviewed lock/manifest alignment and deterministic ordering", () => {
    const raw = fs.readFileSync(LOCK_PATH, "utf8");
    const lock = JSON.parse(raw);
    expect(() => validateFoodCatalogPilotLockFile(lock, FOOD_CATALOG_PILOT_MANIFEST)).not.toThrow();
    expect(lock.records.length).toBe(FOOD_CATALOG_PILOT_MANIFEST.records.length);

    const normalizedNames = new Set<string>();
    for (const record of lock.records) {
      expect(record.nutrientsPer100g.calories_kcal).not.toBeNull();
      expect(record.nutrientsPer100g.protein_g).not.toBeNull();
      expect(record.nutrientsPer100g.carbohydrate_g).not.toBeNull();
      expect(record.nutrientsPer100g.fat_g).not.toBeNull();
      expect(normalizedNames.has(record.normalizedName)).toBe(false);
      normalizedNames.add(record.normalizedName);
    }
  });

  it("ensures generated artifacts do not contain secrets", () => {
    const lockRaw = fs.readFileSync(LOCK_PATH, "utf8");
    const sqlRaw = fs.readFileSync(SQL_PATH, "utf8");
    expect(hasSecretLikeValue(lockRaw)).toBe(false);
    expect(hasSecretLikeValue(sqlRaw)).toBe(false);
  });
});
