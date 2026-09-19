import type { NormalizedNutrientAmount, NormalizedNutrientsPer100g } from "@/lib/usda/types";

export const OUNCES_TO_GRAMS = 28.349523125;

export const SUPPORTED_AMOUNT_UNITS = ["g", "oz", "source_serving"] as const;
export type SupportedAmountUnit = (typeof SUPPORTED_AMOUNT_UNITS)[number];

export interface SourceServingDefinition {
  quantity: number;
  unit: string;
  weightGrams: number;
}

export interface ServingCalculationInput {
  amountValue: number;
  amountUnit: SupportedAmountUnit;
  nutrientsPer100g: NormalizedNutrientsPer100g;
  sourceServing?: SourceServingDefinition | null;
  requireCoreNutrients?: boolean;
}

export interface ServingCalculationResult {
  amountValue: number;
  amountUnit: SupportedAmountUnit;
  amountGrams: number;
  sourceServingQuantity: number | null;
  sourceServingUnit: string | null;
  sourceServingWeightGrams: number | null;
  nutrients: {
    calories_kcal: NormalizedNutrientAmount;
    protein_g: NormalizedNutrientAmount;
    carbohydrate_g: NormalizedNutrientAmount;
    fat_g: NormalizedNutrientAmount;
    fiber_g: NormalizedNutrientAmount;
    sugar_g: NormalizedNutrientAmount;
    sodium_mg: NormalizedNutrientAmount;
  };
}

function assertPositiveAmount(amountValue: number): void {
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new Error("Amount must be greater than 0.");
  }
}

function scaleNutrient(nutrient: NormalizedNutrientAmount, factor: number): NormalizedNutrientAmount {
  if (nutrient.isMissing || nutrient.value === null) {
    return { value: null, isMissing: true };
  }
  return { value: nutrient.value * factor, isMissing: false };
}

function assertRequiredCoreNutrients(nutrients: NormalizedNutrientsPer100g): void {
  if (
    nutrients.calories_kcal.isMissing ||
    nutrients.protein_g.isMissing ||
    nutrients.carbohydrate_g.isMissing ||
    nutrients.fat_g.isMissing
  ) {
    throw new Error(
      "Food is missing required USDA nutrient fields (calories, protein, carbohydrates, fat).",
    );
  }
}

function resolveAmountGrams(
  amountValue: number,
  amountUnit: SupportedAmountUnit,
  sourceServing: SourceServingDefinition | null | undefined,
): {
  amountGrams: number;
  sourceServingQuantity: number | null;
  sourceServingUnit: string | null;
  sourceServingWeightGrams: number | null;
} {
  if (amountUnit === "g") {
    return {
      amountGrams: amountValue,
      sourceServingQuantity: null,
      sourceServingUnit: null,
      sourceServingWeightGrams: null,
    };
  }

  if (amountUnit === "oz") {
    return {
      amountGrams: amountValue * OUNCES_TO_GRAMS,
      sourceServingQuantity: null,
      sourceServingUnit: null,
      sourceServingWeightGrams: null,
    };
  }

  if (!sourceServing) {
    throw new Error("Selected source serving is unavailable for this food.");
  }

  if (
    !Number.isFinite(sourceServing.quantity) ||
    sourceServing.quantity <= 0 ||
    !Number.isFinite(sourceServing.weightGrams) ||
    sourceServing.weightGrams <= 0
  ) {
    throw new Error("Selected source serving does not include a reliable gram conversion.");
  }

  const unit = sourceServing.unit.trim();
  if (!unit) {
    throw new Error("Selected source serving is missing its unit label.");
  }

  return {
    amountGrams: amountValue * sourceServing.weightGrams,
    sourceServingQuantity: sourceServing.quantity,
    sourceServingUnit: unit,
    sourceServingWeightGrams: sourceServing.weightGrams,
  };
}

export function isSupportedAmountUnit(value: string): value is SupportedAmountUnit {
  return SUPPORTED_AMOUNT_UNITS.includes(value as SupportedAmountUnit);
}

export function calculateNutritionForAmount(input: ServingCalculationInput): ServingCalculationResult {
  assertPositiveAmount(input.amountValue);
  if (!isSupportedAmountUnit(input.amountUnit)) {
    throw new Error("Unsupported amount unit.");
  }

  const requireCoreNutrients = input.requireCoreNutrients !== false;
  if (requireCoreNutrients) {
    assertRequiredCoreNutrients(input.nutrientsPer100g);
  }

  const amount = resolveAmountGrams(input.amountValue, input.amountUnit, input.sourceServing);
  if (!Number.isFinite(amount.amountGrams) || amount.amountGrams <= 0) {
    throw new Error("Unable to resolve a reliable gram amount for this entry.");
  }

  const factor = amount.amountGrams / 100;

  return {
    amountValue: input.amountValue,
    amountUnit: input.amountUnit,
    amountGrams: amount.amountGrams,
    sourceServingQuantity: amount.sourceServingQuantity,
    sourceServingUnit: amount.sourceServingUnit,
    sourceServingWeightGrams: amount.sourceServingWeightGrams,
    nutrients: {
      calories_kcal: scaleNutrient(input.nutrientsPer100g.calories_kcal, factor),
      protein_g: scaleNutrient(input.nutrientsPer100g.protein_g, factor),
      carbohydrate_g: scaleNutrient(input.nutrientsPer100g.carbohydrate_g, factor),
      fat_g: scaleNutrient(input.nutrientsPer100g.fat_g, factor),
      fiber_g: scaleNutrient(input.nutrientsPer100g.fiber_g, factor),
      sugar_g: scaleNutrient(input.nutrientsPer100g.sugar_g, factor),
      sodium_mg: scaleNutrient(input.nutrientsPer100g.sodium_mg, factor),
    },
  };
}
