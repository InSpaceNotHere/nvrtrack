import type { FoodCatalogRow } from "@/lib/data/auth-context";

import { normalizeCatalogSearchText, rankCatalogSearchItems } from "./catalog-search";
import {
  getCatalogDisplayName,
  perHundredGramMacros,
  splitDisplayName,
  variantPriority,
} from "./food-display-name";

export interface CatalogVariant {
  food: FoodCatalogRow;
  displayName: string;
  variantLabel: string;
  isPreferred: boolean;
}

export interface CatalogFoodGroup {
  key: string;
  name: string;
  preferred: CatalogVariant;
  variants: CatalogVariant[];
  rankScore: number;
}

function macrosDifferMaterially(a: FoodCatalogRow, b: FoodCatalogRow): boolean {
  const left = perHundredGramMacros(a);
  const right = perHundredGramMacros(b);
  return (
    Math.abs(left.calories - right.calories) >= 8 ||
    Math.abs(left.protein_g - right.protein_g) >= 2 ||
    Math.abs(left.carbohydrate_g - right.carbohydrate_g) >= 2 ||
    Math.abs(left.fat_g - right.fat_g) >= 2
  );
}

function sortVariants(variants: CatalogVariant[]): CatalogVariant[] {
  return [...variants].sort((left, right) => {
    const byPriority = variantPriority(left.variantLabel) - variantPriority(right.variantLabel);
    if (byPriority !== 0) {
      return byPriority * -1;
    }
    return left.displayName.localeCompare(right.displayName);
  });
}

export function groupCatalogFoods(foods: FoodCatalogRow[]): CatalogFoodGroup[] {
  const buckets = new Map<string, CatalogVariant[]>();

  for (const food of foods) {
    const displayName = getCatalogDisplayName(food);
    const parts = splitDisplayName(displayName);
    const key = normalizeCatalogSearchText(parts.groupName);
    const variant: CatalogVariant = {
      food,
      displayName,
      variantLabel: parts.variantLabel ?? "standard",
      isPreferred: false,
    };
    const existing = buckets.get(key) ?? [];
    existing.push(variant);
    buckets.set(key, existing);
  }

  const groups: CatalogFoodGroup[] = [];
  for (const [key, variants] of buckets) {
    const sorted = sortVariants(variants).map((variant, index) => ({
      ...variant,
      isPreferred: index === 0,
    }));
    const preferred = sorted[0];
    if (!preferred) {
      continue;
    }
    const extras = sorted.slice(1).filter((variant) => macrosDifferMaterially(variant.food, preferred.food));
    const meaningfulVariants = extras.length > 0 ? [preferred, ...extras] : [preferred];

    groups.push({
      key,
      name: splitDisplayName(preferred.displayName).groupName,
      preferred,
      variants: meaningfulVariants,
      rankScore: 0,
    });
  }

  return groups.sort((left, right) => left.name.localeCompare(right.name));
}

const CLOSE_MATCH_SCORE = 800;

export function rankCatalogFoodGroups(
  foods: FoodCatalogRow[],
  query: string,
  options: { limit?: number } = {},
): CatalogFoodGroup[] {
  const groups = groupCatalogFoods(foods);
  const byId = new Map(foods.map((food) => [food.id, food]));
  const rankedItems = rankCatalogSearchItems(
    foods.map((food) => {
      const displayName = getCatalogDisplayName(food);
      const parts = splitDisplayName(displayName);
      return {
        id: food.id,
        fdc_id: food.fdc_id,
        normalized_name: food.normalized_name,
        description: food.description,
        aliases: food.aliases,
        display_name: displayName,
        group_name: parts.groupName,
      };
    }),
    query,
    { limit: Math.max(options.limit ?? 40, foods.length) },
  );

  const scoreByFoodId = new Map(rankedItems.map((item) => [item.id, item.rankScore]));
  const scored = groups
    .map((group) => {
      const best = Math.max(0, ...group.variants.map((variant) => scoreByFoodId.get(variant.food.id) ?? 0));
      return { ...group, rankScore: best };
    })
    .filter((group) => (normalizeCatalogSearchText(query) ? group.rankScore > 0 : true));

  const hasCloseMatch = scored.some((group) => group.rankScore >= CLOSE_MATCH_SCORE);
  const filtered = hasCloseMatch ? scored.filter((group) => group.rankScore >= CLOSE_MATCH_SCORE) : scored;

  return filtered
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) {
        return right.rankScore - left.rankScore;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, options.limit ?? (normalizeCatalogSearchText(query) ? 40 : 80))
    .map((group) => {
      const preferredFood = byId.get(group.preferred.food.id) ?? group.preferred.food;
      return {
        ...group,
        preferred: {
          ...group.preferred,
          food: preferredFood,
        },
      };
    });
}

export function formatVariantChipLabel(variantLabel: string): string {
  if (variantLabel === "standard") {
    return "Standard";
  }
  return variantLabel
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
