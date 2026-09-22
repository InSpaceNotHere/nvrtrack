import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  containsInternalNutritionLanguage,
  sanitizeFavoritesUserMessage,
} from "./user-facing-copy";

const NUTRITION_UI_FILES = [
  "src/components/nutrition/add-food-view.tsx",
  "src/components/nutrition/personal-food-rail.tsx",
  "src/components/nutrition/food-result-row.tsx",
  "src/components/nutrition/food-portion-sheet.tsx",
  "src/components/nutrition/custom-food-form.tsx",
  "src/components/nutrition/saved-food-manager.tsx",
  "src/app/(protected)/nutrition/add/page.tsx",
  "src/app/(protected)/nutrition/foods/new/page.tsx",
  "src/app/(protected)/actions/nutrition-favorites-actions.ts",
];

function quotedStrings(source: string): string[] {
  const matches = source.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g) ?? [];
  return matches.map((value) => value.slice(1, -1));
}

describe("nutrition user-facing copy", () => {
  it("never renders migration, table, or backend language in favorites errors", () => {
    expect(sanitizeFavoritesUserMessage("Favorites are waiting on the nutrition_food_favorites migration.")).toBe(
      "Couldn't update favorites.",
    );
    expect(sanitizeFavoritesUserMessage("Could not find the table 'public.nutrition_food_favorites' in the schema cache")).toBe(
      "Couldn't update favorites.",
    );
    expect(sanitizeFavoritesUserMessage("Couldn't update favorites.")).toBe("Couldn't update favorites.");
  });

  it("keeps Nutrition UI string literals free of storage/migration language", () => {
    for (const relativePath of NUTRITION_UI_FILES) {
      const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      const rendered = quotedStrings(source).filter((value) => !value.startsWith("@/") && !value.includes("http"));
      for (const value of rendered) {
        expect(containsInternalNutritionLanguage(value), `${relativePath}: ${value}`).toBe(false);
      }
    }
  });
});
