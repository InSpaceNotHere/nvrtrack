import { normalizeUsdaNutrientsPer100g } from "./nutrients";
import type {
  NormalizedUsdaFoodDetail,
  NormalizedUsdaFoodSummary,
  NormalizedUsdaPortion,
  NormalizedUsdaSearchResult,
  UsdaFoodDetailResponse,
  UsdaFoodPortion,
  UsdaSearchFood,
  UsdaSearchResponse,
} from "./types";
import { UsdaClientError } from "./types";

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function ensureDescription(value: string | null | undefined): string {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    throw new UsdaClientError("invalid_response", "USDA response is missing food description.");
  }
  return trimmed;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumberOrNull(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function inferServingWeightGrams(servingSize: number | null, servingUnit: string | null): number | null {
  if (servingSize === null || servingUnit === null) {
    return null;
  }
  const unit = servingUnit.toLowerCase();
  if (unit === "g" || unit === "gram" || unit === "grams") {
    return servingSize > 0 ? servingSize : null;
  }
  return null;
}

function normalizeFoodSummary(raw: UsdaSearchFood | UsdaFoodDetailResponse): NormalizedUsdaFoodSummary {
  const fdcId = toNumberOrNull(raw.fdcId);
  if (!fdcId || !Number.isInteger(fdcId) || fdcId <= 0) {
    throw new UsdaClientError("invalid_response", "USDA response included an invalid FDC ID.");
  }

  const description = ensureDescription(raw.description);
  const servingSize = toNumberOrNull(raw.servingSize);
  const servingUnit = trimToNull(raw.servingSizeUnit);
  const servingWeightGrams = inferServingWeightGrams(servingSize, servingUnit);

  return {
    fdcId,
    description,
    normalizedName: normalizeName(description),
    dataType: trimToNull(raw.dataType) ?? "unknown",
    brandOwner: trimToNull(raw.brandOwner),
    brandName: trimToNull(raw.brandName),
    gtinUpc: trimToNull(raw.gtinUpc),
    foodCategory: trimToNull(raw.foodCategory),
    ingredients: trimToNull(raw.ingredients),
    servingSize,
    servingUnit,
    servingWeightGrams,
    nutrientsPer100g: normalizeUsdaNutrientsPer100g(raw.foodNutrients),
    sourcePublishedDate: trimToNull((raw as UsdaSearchFood).publishedDate ?? (raw as UsdaFoodDetailResponse).publicationDate),
    sourceModifiedDate: trimToNull(raw.modifiedDate),
  };
}

function normalizePortion(raw: UsdaFoodPortion): NormalizedUsdaPortion {
  const quantity = toNumberOrNull(raw.amount);
  const gramWeight = toNumberOrNull(raw.gramWeight);
  const unit = trimToNull(raw.measureUnit?.name ?? raw.measureUnit?.abbreviation ?? null);

  return {
    id: toNumberOrNull(raw.id),
    quantity,
    unit,
    description: trimToNull(raw.portionDescription),
    modifier: trimToNull(raw.modifier),
    gramWeight,
    isUsableForGramConversion: gramWeight !== null && gramWeight > 0,
  };
}

export function normalizeUsdaSearchResponse(raw: UsdaSearchResponse): NormalizedUsdaSearchResult {
  if (!raw || typeof raw !== "object") {
    throw new UsdaClientError("invalid_response", "USDA search response was malformed.");
  }

  const foods = (raw.foods ?? []).map(normalizeFoodSummary);

  return {
    foods,
    totalHits: typeof raw.totalHits === "number" && raw.totalHits >= 0 ? raw.totalHits : foods.length,
    currentPage: typeof raw.currentPage === "number" && raw.currentPage > 0 ? raw.currentPage : 1,
    totalPages: typeof raw.totalPages === "number" && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export function normalizeUsdaFoodDetailResponse(raw: UsdaFoodDetailResponse): NormalizedUsdaFoodDetail {
  if (!raw || typeof raw !== "object") {
    throw new UsdaClientError("invalid_response", "USDA food detail response was malformed.");
  }

  const summary = normalizeFoodSummary(raw);
  const sourcePortions = (raw.foodPortions ?? []).map(normalizePortion);

  return {
    ...summary,
    sourcePortions,
  };
}
