import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { calculateDailyTotals, calculateEntryTotals } from "./calculations";
import { getFoodEntryDisplayName } from "./food-display-name";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("historical nutrition logs stay snapshot-only", () => {
  it("loads Today and Home entries from food_entries without joining foods or food_catalog", () => {
    const dataLayer = read("src/lib/data/nutrition.ts");
    const functionStart = dataLayer.indexOf("export async function getMyFoodEntriesForDate");
    expect(functionStart).toBeGreaterThan(-1);
    const functionBody = dataLayer.slice(functionStart, functionStart + 900);
    expect(functionBody).toContain('.from("food_entries")');
    expect(functionBody).toContain('.select("*")');
    expect(functionBody).not.toMatch(/from\(["']foods["']\)/);
    expect(functionBody).not.toMatch(/from\(["']food_catalog["']\)/);
    expect(functionBody).not.toMatch(/foods\s*\(/);
    expect(functionBody).not.toContain("api.nal.usda.gov");

    const todayPage = read("src/app/(protected)/nutrition/page.tsx");
    expect(todayPage).toContain("getMyFoodEntriesForDate(selectedDate)");
    expect(todayPage).toContain("entries={entriesResult.data ?? []}");
    expect(todayPage).not.toMatch(/food_catalog/);

    const homePage = read("src/app/(protected)/page.tsx");
    expect(homePage).toContain("getMyFoodEntriesForDate(todayDate)");
    expect(homePage).toContain("calculateDailyTotals(nutritionEntriesResult.data ?? [])");
    expect(homePage).not.toMatch(/food_catalog/);
  });

  it("renders diary names and calories from the stored entry, not a live catalog row", () => {
    const todayView = read("src/components/nutrition/nutrition-today-view.tsx");
    expect(todayView).toContain("calculateDailyTotals(entries)");
    expect(todayView).toContain("calculateEntryTotals(entry)");
    expect(todayView).toContain("getFoodEntryDisplayName(entry)");
    expect(todayView).not.toMatch(/getActiveFoodCatalogById/);
    expect(todayView).not.toMatch(/from\(["']food_catalog["']\)/);
    expect(todayView).not.toMatch(/api\.nal\.usda\.gov/);
  });

  it("keeps totals when food_id and catalog_food_id are null and fdc_id is present", () => {
    const historical = {
      servings: 1.5,
      calories_per_serving: 200,
      protein_per_serving_g: 10,
      carbohydrate_per_serving_g: 20,
      fat_per_serving_g: 8,
      fiber_per_serving_g: 2,
    };
    expect(calculateEntryTotals(historical)).toEqual({
      calories: 300,
      protein_g: 15,
      carbohydrate_g: 30,
      fat_g: 12,
      fiber_g: 3,
    });
    expect(getFoodEntryDisplayName({ fdc_id: 171140, food_name: "legacy chicken name" })).toBe("Chicken Breast");
  });

  it("keeps the stored custom snapshot after the saved food is edited or deleted", () => {
    const loggedWhenSavedFoodWas120 = {
      servings: 1,
      calories_per_serving: 120,
      protein_per_serving_g: 18,
      carbohydrate_per_serving_g: 6,
      fat_per_serving_g: 0,
      fiber_per_serving_g: 0,
    };
    const laterSavedFoodCalories = 999;
    expect(calculateEntryTotals(loggedWhenSavedFoodWas120).calories).toBe(120);
    expect(calculateEntryTotals(loggedWhenSavedFoodWas120).calories).not.toBe(laterSavedFoodCalories);
    expect(
      getFoodEntryDisplayName({
        fdc_id: null,
        food_name: "Label Yogurt",
      }),
    ).toBe("Label Yogurt");
  });

  it("uses the same daily total function on Home and Nutrition Today", () => {
    const entries = [
      {
        servings: 1,
        calories_per_serving: 240,
        protein_per_serving_g: 20,
        carbohydrate_per_serving_g: 30,
        fat_per_serving_g: 8,
        fiber_per_serving_g: 4,
      },
      {
        servings: 0.5,
        calories_per_serving: 100,
        protein_per_serving_g: 10,
        carbohydrate_per_serving_g: 4,
        fat_per_serving_g: 2,
        fiber_per_serving_g: null,
      },
    ];
    expect(calculateDailyTotals(entries)).toEqual({
      calories: 290,
      protein_g: 25,
      carbohydrate_g: 32,
      fat_g: 9,
      fiber_g: 4,
    });
  });
});

describe("focused Add Food chrome", () => {
  it("hides global bottom nav on Add Food and custom food editor routes", () => {
    const shell = read("src/components/layout/app-shell.tsx");
    expect(shell).toContain('pathname.startsWith("/nutrition/add")');
    expect(shell).toContain('pathname.startsWith("/nutrition/foods/new")');
    expect(shell).toContain("/nutrition/foods/");
    expect(shell).toContain("/edit$");
    expect(shell).toContain("isFocusedTaskRoute");
    expect(shell).toContain("MobileBottomNav");
    const focusedReturn = shell.indexOf("if (isOnboardingRoute || isFocusedTaskRoute)");
    const navIndex = shell.lastIndexOf("<MobileBottomNav");
    expect(focusedReturn).toBeGreaterThan(-1);
    expect(navIndex).toBeGreaterThan(focusedReturn);
  });
});

describe("USDA runtime env is not required", () => {
  it("documents USDA_FDC_API_KEY as optional script-only and absent from runtime source", () => {
    expect(existsSync(path.join(ROOT, "src/app/api/usda/search/route.ts"))).toBe(false);
    const envExample = read(".env.example");
    expect(envExample).toMatch(/# USDA_FDC_API_KEY=/);
    expect(envExample).toMatch(/Only needed for catalog generation scripts/);
    const nextConfig = existsSync(path.join(ROOT, "next.config.ts"))
      ? read("next.config.ts")
      : existsSync(path.join(ROOT, "next.config.js"))
        ? read("next.config.js")
        : "";
    expect(nextConfig).not.toContain("USDA_FDC_API_KEY");
  });
});
