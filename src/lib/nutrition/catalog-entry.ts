import type { FoodCatalogRow, FoodEntryRow } from "../data/auth-context";
import {
  calculateNutritionForAmount,
  isSupportedAmountUnit,
  type SourceServingDefinition,
  type SupportedAmountUnit,
} from "./serving";
import type { NormalizedNutrientsPer100g } from "../usda/types";

export interface CatalogEntryAmountInput {
  amountValue: number;
  amountUnit: SupportedAmountUnit;
}

export interface CatalogEntryCalculatedSnapshot {
  serving_size: number;
  serving_unit: string;
  servings: number;
  calories_per_serving: number;
  protein_per_serving_g: number;
  carbohydrate_per_serving_g: number;
  fat_per_serving_g: number;
  fiber_per_serving_g: number | null;
  amount_value: number;
  amount_unit: string;
  amount_grams: number;
  source_serving_quantity: number | null;
  source_serving_unit: string | null;
  source_serving_weight_grams: number | null;
}

export interface CatalogSourceMetadataSnapshot {
  catalog_food_id: string;
  fdc_id: number;
  source_status: "usda_catalog";
  source_name: string;
  source_data_type: string;
  source_description: string;
  source_brand: string | null;
  source_gtin_upc: string | null;
  source_retrieved_at: string;
  calories_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbohydrate_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  fiber_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
}

export function parseAmountValue(input: string | number): number {
  const parsed = typeof input === "number" ? input : Number(input.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
  return parsed;
}

export function parseAmountUnit(input: string): SupportedAmountUnit {
  if (!isSupportedAmountUnit(input)) {
    throw new Error("Unsupported amount unit.");
  }
  return input;
}

function createNormalizedNutrientsPer100gFromCatalog(row: FoodCatalogRow): NormalizedNutrientsPer100g {
  return {
    calories_kcal: { value: row.calories_per_100g, isMissing: row.calories_per_100g === null },
    protein_g: { value: row.protein_g_per_100g, isMissing: row.protein_g_per_100g === null },
    carbohydrate_g: { value: row.carbohydrate_g_per_100g, isMissing: row.carbohydrate_g_per_100g === null },
    fat_g: { value: row.fat_g_per_100g, isMissing: row.fat_g_per_100g === null },
    fiber_g: { value: row.fiber_g_per_100g, isMissing: row.fiber_g_per_100g === null },
    sugar_g: { value: row.sugar_g_per_100g, isMissing: row.sugar_g_per_100g === null },
    sodium_mg: { value: row.sodium_mg_per_100g, isMissing: row.sodium_mg_per_100g === null },
  };
}

function createNormalizedNutrientsPer100gFromEntry(entry: FoodEntryRow): NormalizedNutrientsPer100g {
  return {
    calories_kcal: { value: entry.calories_per_100g, isMissing: entry.calories_per_100g === null },
    protein_g: { value: entry.protein_g_per_100g, isMissing: entry.protein_g_per_100g === null },
    carbohydrate_g: { value: entry.carbohydrate_g_per_100g, isMissing: entry.carbohydrate_g_per_100g === null },
    fat_g: { value: entry.fat_g_per_100g, isMissing: entry.fat_g_per_100g === null },
    fiber_g: { value: entry.fiber_g_per_100g, isMissing: entry.fiber_g_per_100g === null },
    sugar_g: { value: entry.sugar_g_per_100g, isMissing: entry.sugar_g_per_100g === null },
    sodium_mg: { value: entry.sodium_mg_per_100g, isMissing: entry.sodium_mg_per_100g === null },
  };
}

export function getCatalogSourceServingDefinition(row: FoodCatalogRow): SourceServingDefinition | null {
  if (row.serving_weight_grams === null || row.serving_weight_grams <= 0) {
    return null;
  }

  return {
    quantity: row.serving_size && row.serving_size > 0 ? row.serving_size : 1,
    unit: row.serving_unit?.trim() || "source serving",
    weightGrams: row.serving_weight_grams,
  };
}

function getEntrySourceServingDefinition(entry: FoodEntryRow): SourceServingDefinition | null {
  if (
    entry.source_serving_weight_grams === null ||
    entry.source_serving_weight_grams <= 0 ||
    entry.source_serving_quantity === null ||
    entry.source_serving_quantity <= 0 ||
    !entry.source_serving_unit?.trim()
  ) {
    return null;
  }

  return {
    quantity: entry.source_serving_quantity,
    unit: entry.source_serving_unit,
    weightGrams: entry.source_serving_weight_grams,
  };
}

function toCalculatedSnapshot(
  amountValue: number,
  amountUnit: SupportedAmountUnit,
  calculated: ReturnType<typeof calculateNutritionForAmount>,
  fallbackSourceServing: SourceServingDefinition | null,
): CatalogEntryCalculatedSnapshot {
  if (
    calculated.nutrients.calories_kcal.value === null ||
    calculated.nutrients.protein_g.value === null ||
    calculated.nutrients.carbohydrate_g.value === null ||
    calculated.nutrients.fat_g.value === null
  ) {
    throw new Error("Food is missing required USDA nutrient fields (calories, protein, carbohydrates, fat).");
  }

  const sourceServingQuantity = calculated.sourceServingQuantity ?? fallbackSourceServing?.quantity ?? null;
  const sourceServingUnit = calculated.sourceServingUnit ?? fallbackSourceServing?.unit ?? null;
  const sourceServingWeightGrams =
    calculated.sourceServingWeightGrams ?? fallbackSourceServing?.weightGrams ?? null;

  return {
    serving_size: amountValue,
    serving_unit: amountUnit,
    servings: 1,
    calories_per_serving: calculated.nutrients.calories_kcal.value,
    protein_per_serving_g: calculated.nutrients.protein_g.value,
    carbohydrate_per_serving_g: calculated.nutrients.carbohydrate_g.value,
    fat_per_serving_g: calculated.nutrients.fat_g.value,
    fiber_per_serving_g: calculated.nutrients.fiber_g.value,
    amount_value: amountValue,
    amount_unit: amountUnit,
    amount_grams: calculated.amountGrams,
    source_serving_quantity: sourceServingQuantity,
    source_serving_unit: sourceServingUnit,
    source_serving_weight_grams: sourceServingWeightGrams,
  };
}

export function buildCatalogSourceMetadataSnapshot(row: FoodCatalogRow): CatalogSourceMetadataSnapshot {
  return {
    catalog_food_id: row.id,
    fdc_id: row.fdc_id,
    source_status: "usda_catalog",
    source_name: row.normalized_name,
    source_data_type: row.data_type,
    source_description: row.description,
    source_brand: row.brand_name ?? row.brand_owner,
    source_gtin_upc: row.gtin_upc,
    source_retrieved_at: row.retrieved_at,
    calories_per_100g: row.calories_per_100g,
    protein_g_per_100g: row.protein_g_per_100g,
    carbohydrate_g_per_100g: row.carbohydrate_g_per_100g,
    fat_g_per_100g: row.fat_g_per_100g,
    fiber_g_per_100g: row.fiber_g_per_100g,
    sugar_g_per_100g: row.sugar_g_per_100g,
    sodium_mg_per_100g: row.sodium_mg_per_100g,
  };
}

export function calculateCatalogEntrySnapshot(
  row: FoodCatalogRow,
  input: CatalogEntryAmountInput,
): CatalogEntryCalculatedSnapshot {
  const sourceServingDefinition = getCatalogSourceServingDefinition(row);
  const sourceServing = input.amountUnit === "source_serving" ? sourceServingDefinition : null;
  const calculated = calculateNutritionForAmount({
    amountValue: input.amountValue,
    amountUnit: input.amountUnit,
    sourceServing,
    nutrientsPer100g: createNormalizedNutrientsPer100gFromCatalog(row),
  });

  return toCalculatedSnapshot(input.amountValue, input.amountUnit, calculated, sourceServingDefinition);
}

export function recalculateCatalogEntryFromSnapshot(
  entry: FoodEntryRow,
  input: CatalogEntryAmountInput,
): CatalogEntryCalculatedSnapshot {
  const sourceServingDefinition = getEntrySourceServingDefinition(entry);
  const sourceServing = input.amountUnit === "source_serving" ? sourceServingDefinition : null;
  const calculated = calculateNutritionForAmount({
    amountValue: input.amountValue,
    amountUnit: input.amountUnit,
    sourceServing,
    nutrientsPer100g: createNormalizedNutrientsPer100gFromEntry(entry),
  });

  return toCalculatedSnapshot(input.amountValue, input.amountUnit, calculated, sourceServingDefinition);
}
