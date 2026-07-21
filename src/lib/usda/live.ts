import "server-only";

import type { SourceServingDefinition, SupportedAmountUnit } from "@/lib/nutrition/serving";

import { getUsdaFoodDetail, searchUsdaFoods } from "./client";
import { isUsdaFixtureModeEnabled, getFixtureUsdaFoodDetail, searchFixtureUsdaFoods } from "./fixtures";
import { hasRequiredMacroNutrients } from "./nutrients";
import { normalizeUsdaFdcId, normalizeUsdaSearchQuery, USDA_SEARCH_MIN_QUERY_LENGTH } from "./search";
import type { NormalizedNutrientsPer100g, NormalizedUsdaFoodDetail, UsdaClientErrorCode } from "./types";
import { UsdaClientError } from "./types";

const LIVE_USDA_NORMALIZATION_VERSION = "phase2d-live-v1";
const LIVE_USDA_MAX_QUERY_LENGTH = 120;
const LIVE_USDA_DEFAULT_LIMIT = 12;
const LIVE_USDA_MAX_LIMIT = 20;
const LIVE_USDA_SEARCH_CACHE_TTL_MS = 60_000;
const LIVE_USDA_DETAIL_CACHE_TTL_MS = 10 * 60_000;
const MAX_QUERY_TERMS = 6;

const GENERIC_TYPE_PRIORITY = ["foundation", "survey", "legacy"] as const;

export const LIVE_USDA_SEARCH_GROUPS = ["generic", "branded"] as const;

export type LiveUsdaSearchGroup = (typeof LIVE_USDA_SEARCH_GROUPS)[number];

export type LiveUsdaErrorCode =
  | "invalid_query"
  | "invalid_group"
  | "invalid_fdc_id"
  | "rate_limited"
  | "timeout"
  | "service_unavailable"
  | "invalid_response"
  | "upstream_error"
  | "not_configured";

export interface LiveUsdaMacroSummary {
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrate_g: number | null;
  fat_g: number | null;
}

export interface LiveUsdaSearchSummary {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner: string | null;
  brandName: string | null;
  gtinUpc: string | null;
  foodCategory: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number | null;
  sourcePublishedDate: string | null;
  sourceModifiedDate: string | null;
  coreNutrients: LiveUsdaMacroSummary;
  hasRequiredCoreNutrients: boolean;
}

export interface LiveUsdaSearchResponse {
  group: LiveUsdaSearchGroup;
  query: string;
  items: LiveUsdaSearchSummary[];
  totalHits: number;
  truncated: boolean;
}

export interface LiveUsdaPortionOption {
  id: string;
  sourcePortionId: number | null;
  quantity: number;
  unit: string;
  gramWeight: number;
  description: string | null;
  modifier: string | null;
  label: string;
}

export interface LiveUsdaDetailPreview {
  fdcId: number;
  description: string;
  dataType: string;
  normalizedName: string;
  brandOwner: string | null;
  brandName: string | null;
  gtinUpc: string | null;
  foodCategory: string | null;
  ingredients: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number | null;
  sourcePublishedDate: string | null;
  sourceModifiedDate: string | null;
  nutrientsPer100g: NormalizedNutrientsPer100g;
  hasRequiredCoreNutrients: boolean;
  portionOptions: LiveUsdaPortionOption[];
  defaultPortionId: string | null;
  supportedAmountUnits: SupportedAmountUnit[];
  warnings: string[];
}

export interface SearchLiveUsdaFoodsInput {
  query: string;
  group: LiveUsdaSearchGroup | string;
  limit?: number;
  forceRefresh?: boolean;
}

export interface ResolveLiveUsdaFoodDetailInput {
  fdcId: number | string;
  forceRefresh?: boolean;
}

export class LiveUsdaError extends Error {
  readonly code: LiveUsdaErrorCode;
  readonly statusCode: number;

  constructor(code: LiveUsdaErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "LiveUsdaError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface CacheRecord<T> {
  expiresAt: number;
  value: T;
}

const searchCache = new Map<string, CacheRecord<LiveUsdaSearchResponse>>();
const detailCache = new Map<number, CacheRecord<LiveUsdaDetailPreview>>();

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGtin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function tokenizeQuery(query: string): string[] {
  return normalizeText(query).split(" ").filter(Boolean).slice(0, MAX_QUERY_TERMS);
}

function parseDateToEpoch(value: string | null): number {
  if (!value) {
    return 0;
  }
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : 0;
}

function safeMacroSummary(nutrients: NormalizedNutrientsPer100g): LiveUsdaMacroSummary {
  return {
    calories_kcal: nutrients.calories_kcal.value,
    protein_g: nutrients.protein_g.value,
    carbohydrate_g: nutrients.carbohydrate_g.value,
    fat_g: nutrients.fat_g.value,
  };
}

function isBrandedDataType(dataType: string): boolean {
  return normalizeText(dataType).includes("branded");
}

function isFoundationDataType(dataType: string): boolean {
  return normalizeText(dataType).includes("foundation");
}

function isSurveyDataType(dataType: string): boolean {
  const normalized = normalizeText(dataType);
  return normalized.includes("survey") || normalized.includes("fndds");
}

function isLegacyDataType(dataType: string): boolean {
  const normalized = normalizeText(dataType);
  return normalized.includes("sr legacy") || normalized.includes("legacy");
}

function toGenericTypeRank(dataType: string): number {
  if (isFoundationDataType(dataType)) return 0;
  if (isSurveyDataType(dataType)) return 1;
  if (isLegacyDataType(dataType)) return 2;
  return GENERIC_TYPE_PRIORITY.length + 1;
}

function detectPreparationHints(value: string): Set<string> {
  const normalized = normalizeText(value);
  const hints = new Set<string>();
  if (/\braw\b/.test(normalized)) hints.add("raw");
  if (/\bcooked\b/.test(normalized)) hints.add("cooked");
  if (/\broasted\b/.test(normalized)) hints.add("roasted");
  if (/\bboiled\b/.test(normalized)) hints.add("boiled");
  if (/\bgrilled\b/.test(normalized)) hints.add("grilled");
  if (/\bbaked\b/.test(normalized)) hints.add("baked");
  if (/\bfried\b/.test(normalized)) hints.add("fried");
  if (/\bsmoked\b/.test(normalized)) hints.add("smoked");
  return hints;
}

function sanitizeLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit) || !limit || limit <= 0) {
    return LIVE_USDA_DEFAULT_LIMIT;
  }
  return Math.min(limit, LIVE_USDA_MAX_LIMIT);
}

function normalizeAndValidateQuery(input: string): string {
  const query = normalizeUsdaSearchQuery(input ?? "");
  if (!query || query.length < USDA_SEARCH_MIN_QUERY_LENGTH) {
    throw new LiveUsdaError(
      "invalid_query",
      `Search query must be at least ${USDA_SEARCH_MIN_QUERY_LENGTH} characters.`,
      400,
    );
  }
  if (query.length > LIVE_USDA_MAX_QUERY_LENGTH) {
    throw new LiveUsdaError(
      "invalid_query",
      `Search query must be ${LIVE_USDA_MAX_QUERY_LENGTH} characters or fewer.`,
      400,
    );
  }
  return query;
}

export function isLiveUsdaSearchGroup(value: string): value is LiveUsdaSearchGroup {
  return LIVE_USDA_SEARCH_GROUPS.includes(value as LiveUsdaSearchGroup);
}

export function normalizeLiveUsdaSearchGroup(value: string): LiveUsdaSearchGroup {
  const normalized = value.trim().toLowerCase();
  if (isLiveUsdaSearchGroup(normalized)) {
    return normalized;
  }
  throw new LiveUsdaError("invalid_group", "Search group must be generic or branded.", 400);
}

function toSearchSummary(food: Omit<NormalizedUsdaFoodDetail, "sourcePortions"> | NormalizedUsdaFoodDetail): LiveUsdaSearchSummary {
  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    brandOwner: food.brandOwner,
    brandName: food.brandName,
    gtinUpc: food.gtinUpc,
    foodCategory: food.foodCategory,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    servingWeightGrams: food.servingWeightGrams,
    sourcePublishedDate: food.sourcePublishedDate,
    sourceModifiedDate: food.sourceModifiedDate,
    coreNutrients: safeMacroSummary(food.nutrientsPer100g),
    hasRequiredCoreNutrients: hasRequiredMacroNutrients(food.nutrientsPer100g),
  };
}

function filterByGroup(item: LiveUsdaSearchSummary, group: LiveUsdaSearchGroup): boolean {
  if (group === "branded") {
    return isBrandedDataType(item.dataType);
  }
  return !isBrandedDataType(item.dataType);
}

function sortGenericResults(items: LiveUsdaSearchSummary[], query: string): LiveUsdaSearchSummary[] {
  const normalizedQuery = normalizeText(query);
  const queryTerms = tokenizeQuery(query);
  const queryHints = detectPreparationHints(query);

  return [...items].sort((left, right) => {
    const leftDescription = normalizeText(left.description);
    const rightDescription = normalizeText(right.description);
    const leftHaystack = normalizeText([left.description, left.foodCategory ?? ""].join(" "));
    const rightHaystack = normalizeText([right.description, right.foodCategory ?? ""].join(" "));

    const leftExact = Number(leftDescription === normalizedQuery);
    const rightExact = Number(rightDescription === normalizedQuery);
    if (leftExact !== rightExact) return rightExact - leftExact;

    const leftAllTerms = Number(queryTerms.every((term) => leftHaystack.includes(term)));
    const rightAllTerms = Number(queryTerms.every((term) => rightHaystack.includes(term)));
    if (leftAllTerms !== rightAllTerms) return rightAllTerms - leftAllTerms;

    const leftHintMatch = Number([...queryHints].every((hint) => leftDescription.includes(hint)));
    const rightHintMatch = Number([...queryHints].every((hint) => rightDescription.includes(hint)));
    if (leftHintMatch !== rightHintMatch) return rightHintMatch - leftHintMatch;

    const leftTermHits = queryTerms.filter((term) => leftHaystack.includes(term)).length;
    const rightTermHits = queryTerms.filter((term) => rightHaystack.includes(term)).length;
    if (leftTermHits !== rightTermHits) return rightTermHits - leftTermHits;

    const leftType = toGenericTypeRank(left.dataType);
    const rightType = toGenericTypeRank(right.dataType);
    if (leftType !== rightType) return leftType - rightType;

    const byDescription = left.description.localeCompare(right.description);
    if (byDescription !== 0) return byDescription;

    return left.fdcId - right.fdcId;
  });
}

function dedupeBrandedByGtin(items: LiveUsdaSearchSummary[]): LiveUsdaSearchSummary[] {
  const byGtin = new Map<string, LiveUsdaSearchSummary>();
  const withoutGtin: LiveUsdaSearchSummary[] = [];

  for (const item of items) {
    const gtin = normalizeGtin(item.gtinUpc);
    if (!gtin) {
      withoutGtin.push(item);
      continue;
    }
    const existing = byGtin.get(gtin);
    if (!existing) {
      byGtin.set(gtin, item);
      continue;
    }

    const compareExisting = compareBrandedDedupPriority(item, existing);
    if (compareExisting < 0) {
      byGtin.set(gtin, item);
    }
  }

  return [...byGtin.values(), ...withoutGtin];
}

function compareBrandedDedupPriority(left: LiveUsdaSearchSummary, right: LiveUsdaSearchSummary): number {
  if (left.hasRequiredCoreNutrients !== right.hasRequiredCoreNutrients) {
    return left.hasRequiredCoreNutrients ? -1 : 1;
  }

  const leftHasServing = Number((left.servingWeightGrams ?? 0) > 0 || (left.servingSize ?? 0) > 0);
  const rightHasServing = Number((right.servingWeightGrams ?? 0) > 0 || (right.servingSize ?? 0) > 0);
  if (leftHasServing !== rightHasServing) {
    return rightHasServing - leftHasServing;
  }

  const leftModified = parseDateToEpoch(left.sourceModifiedDate);
  const rightModified = parseDateToEpoch(right.sourceModifiedDate);
  if (leftModified !== rightModified) {
    return rightModified - leftModified;
  }

  return left.fdcId - right.fdcId;
}

function sortBrandedResults(items: LiveUsdaSearchSummary[], query: string): LiveUsdaSearchSummary[] {
  const normalizedQuery = normalizeText(query);
  const queryTerms = tokenizeQuery(query);
  const queryDigits = normalizeGtin(query);

  return [...items].sort((left, right) => {
    const leftBrandProduct = normalizeText([left.brandName ?? "", left.brandOwner ?? "", left.description].join(" "));
    const rightBrandProduct = normalizeText([right.brandName ?? "", right.brandOwner ?? "", right.description].join(" "));

    const leftExactBrand = Number(leftBrandProduct === normalizedQuery);
    const rightExactBrand = Number(rightBrandProduct === normalizedQuery);
    if (leftExactBrand !== rightExactBrand) return rightExactBrand - leftExactBrand;

    const leftGtinMatch = Number(!!queryDigits && normalizeGtin(left.gtinUpc) === queryDigits);
    const rightGtinMatch = Number(!!queryDigits && normalizeGtin(right.gtinUpc) === queryDigits);
    if (leftGtinMatch !== rightGtinMatch) return rightGtinMatch - leftGtinMatch;

    const leftAllTerms = Number(queryTerms.every((term) => leftBrandProduct.includes(term)));
    const rightAllTerms = Number(queryTerms.every((term) => rightBrandProduct.includes(term)));
    if (leftAllTerms !== rightAllTerms) return rightAllTerms - leftAllTerms;

    const leftTermHits = queryTerms.filter((term) => leftBrandProduct.includes(term)).length;
    const rightTermHits = queryTerms.filter((term) => rightBrandProduct.includes(term)).length;
    if (leftTermHits !== rightTermHits) return rightTermHits - leftTermHits;

    if (left.hasRequiredCoreNutrients !== right.hasRequiredCoreNutrients) {
      return left.hasRequiredCoreNutrients ? -1 : 1;
    }

    const leftHasServing = Number((left.servingWeightGrams ?? 0) > 0 || (left.servingSize ?? 0) > 0);
    const rightHasServing = Number((right.servingWeightGrams ?? 0) > 0 || (right.servingSize ?? 0) > 0);
    if (leftHasServing !== rightHasServing) return rightHasServing - leftHasServing;

    const leftModified = parseDateToEpoch(left.sourceModifiedDate);
    const rightModified = parseDateToEpoch(right.sourceModifiedDate);
    if (leftModified !== rightModified) return rightModified - leftModified;

    const byDescription = left.description.localeCompare(right.description);
    if (byDescription !== 0) return byDescription;

    return left.fdcId - right.fdcId;
  });
}

function mapUsdaClientError(error: unknown): LiveUsdaError {
  if (error instanceof LiveUsdaError) {
    return error;
  }

  if (error instanceof UsdaClientError) {
    const codeMap: Record<UsdaClientErrorCode, LiveUsdaErrorCode> = {
      invalid_query: "invalid_query",
      invalid_fdc_id: "invalid_fdc_id",
      invalid_response: "invalid_response",
      rate_limited: "rate_limited",
      service_unavailable: "service_unavailable",
      upstream_error: "upstream_error",
      timeout: "timeout",
      not_configured: "not_configured",
    };
    const mapped = codeMap[error.code] ?? "service_unavailable";
    const status =
      error.statusCode ??
      (mapped === "invalid_query" || mapped === "invalid_fdc_id"
        ? 400
        : mapped === "rate_limited"
          ? 429
          : mapped === "not_configured"
            ? 503
            : 502);
    return new LiveUsdaError(mapped, error.message, status);
  }

  return new LiveUsdaError("service_unavailable", "USDA request could not be completed at this time.", 503);
}

function getCachedValue<K extends string | number, T>(cache: Map<K, CacheRecord<T>>, key: K): T | null {
  const record = cache.get(key);
  if (!record) {
    return null;
  }
  if (record.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return record.value;
}

function setCachedValue<K extends string | number, T>(
  cache: Map<K, CacheRecord<T>>,
  key: K,
  value: T,
  ttlMs: number,
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function createPortionId(portion: { id: number | null; quantity: number; unit: string; gramWeight: number }): string {
  const sourceId = portion.id === null ? "none" : String(portion.id);
  return `${sourceId}:${portion.quantity}:${normalizeText(portion.unit)}:${portion.gramWeight.toFixed(4)}`;
}

function createPortionLabel(input: {
  quantity: number;
  unit: string;
  gramWeight: number;
  description: string | null;
}): string {
  const unitPart = input.unit.trim();
  const quantityPart = `${input.quantity}`;
  const descriptionSuffix = input.description ? ` (${input.description})` : "";
  return `${quantityPart} ${unitPart} = ${input.gramWeight.toFixed(1)} g${descriptionSuffix}`;
}

function buildPortionOptions(detail: NormalizedUsdaFoodDetail): LiveUsdaPortionOption[] {
  const options: LiveUsdaPortionOption[] = [];
  const seenIds = new Set<string>();

  for (const portion of detail.sourcePortions) {
    if (!portion.isUsableForGramConversion) {
      continue;
    }
    if (portion.quantity === null || portion.quantity <= 0) {
      continue;
    }
    if (portion.gramWeight === null || portion.gramWeight <= 0) {
      continue;
    }
    const unit = (portion.unit ?? "").trim();
    if (!unit) {
      continue;
    }

    const id = createPortionId({
      id: portion.id,
      quantity: portion.quantity,
      unit,
      gramWeight: portion.gramWeight,
    });
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    options.push({
      id,
      sourcePortionId: portion.id,
      quantity: portion.quantity,
      unit,
      gramWeight: portion.gramWeight,
      description: portion.description,
      modifier: portion.modifier,
      label: createPortionLabel({
        quantity: portion.quantity,
        unit,
        gramWeight: portion.gramWeight,
        description: portion.description,
      }),
    });
  }

  return options.sort((left, right) => {
    if (left.gramWeight !== right.gramWeight) {
      return left.gramWeight - right.gramWeight;
    }
    const byUnit = left.unit.localeCompare(right.unit);
    if (byUnit !== 0) {
      return byUnit;
    }
    return left.id.localeCompare(right.id);
  });
}

function buildDetailPreview(detail: NormalizedUsdaFoodDetail): LiveUsdaDetailPreview {
  const portionOptions = buildPortionOptions(detail);
  const hasRequiredCore = hasRequiredMacroNutrients(detail.nutrientsPer100g);
  const warnings: string[] = [];
  if (!hasRequiredCore) {
    warnings.push("Required USDA nutrient fields are missing for this food.");
  }
  if (!portionOptions.length) {
    warnings.push("This USDA record has no reliable source serving conversion.");
  }

  const supportedAmountUnits: SupportedAmountUnit[] = ["g", "oz"];
  if (portionOptions.length) {
    supportedAmountUnits.push("source_serving");
  }

  return {
    fdcId: detail.fdcId,
    description: detail.description,
    dataType: detail.dataType,
    normalizedName: detail.normalizedName,
    brandOwner: detail.brandOwner,
    brandName: detail.brandName,
    gtinUpc: detail.gtinUpc,
    foodCategory: detail.foodCategory,
    ingredients: detail.ingredients,
    servingSize: detail.servingSize,
    servingUnit: detail.servingUnit,
    servingWeightGrams: detail.servingWeightGrams,
    sourcePublishedDate: detail.sourcePublishedDate,
    sourceModifiedDate: detail.sourceModifiedDate,
    nutrientsPer100g: detail.nutrientsPer100g,
    hasRequiredCoreNutrients: hasRequiredCore,
    portionOptions,
    defaultPortionId: portionOptions[0]?.id ?? null,
    supportedAmountUnits,
    warnings,
  };
}

export async function searchLiveUsdaFoods(input: SearchLiveUsdaFoodsInput): Promise<LiveUsdaSearchResponse> {
  try {
    const group = normalizeLiveUsdaSearchGroup(input.group);
    const query = normalizeAndValidateQuery(input.query);
    const limit = sanitizeLimit(input.limit);
    const cacheKey = `${LIVE_USDA_NORMALIZATION_VERSION}:search:${group}:${normalizeText(query)}:${limit}`;

    if (!input.forceRefresh) {
      const cached = getCachedValue(searchCache, cacheKey);
      if (cached) {
        return cached;
      }
    }

    const dataTypes =
      group === "generic"
        ? ["Foundation", "Survey (FNDDS)", "SR Legacy"]
        : ["Branded"];

    const pageSize = Math.min(Math.max(limit * 3, limit + 8), 25);
    const response = isUsdaFixtureModeEnabled()
      ? await searchFixtureUsdaFoods({
          query,
          pageSize,
          pageNumber: 1,
          dataTypes,
        })
      : await searchUsdaFoods({
          query,
          pageSize,
          pageNumber: 1,
          dataTypes,
        });

    const grouped = response.foods
      .map(toSearchSummary)
      .filter((item) => filterByGroup(item, group));
    const deduped = group === "branded" ? dedupeBrandedByGtin(grouped) : grouped;
    const ranked = group === "branded" ? sortBrandedResults(deduped, query) : sortGenericResults(deduped, query);

    const payload: LiveUsdaSearchResponse = {
      group,
      query,
      items: ranked.slice(0, limit),
      totalHits: deduped.length,
      truncated: deduped.length > limit,
    };

    setCachedValue(searchCache, cacheKey, payload, LIVE_USDA_SEARCH_CACHE_TTL_MS);
    return payload;
  } catch (error) {
    throw mapUsdaClientError(error);
  }
}

export async function resolveLiveUsdaFoodDetail(
  input: ResolveLiveUsdaFoodDetailInput,
): Promise<LiveUsdaDetailPreview> {
  try {
    const fdcId = normalizeUsdaFdcId(input.fdcId);
    if (!input.forceRefresh) {
      const cached = getCachedValue(detailCache, fdcId);
      if (cached) {
        return cached;
      }
    }

    const detail = isUsdaFixtureModeEnabled()
      ? await getFixtureUsdaFoodDetail(fdcId)
      : await getUsdaFoodDetail(fdcId);
    const preview = buildDetailPreview(detail);
    setCachedValue(detailCache, fdcId, preview, LIVE_USDA_DETAIL_CACHE_TTL_MS);
    return preview;
  } catch (error) {
    throw mapUsdaClientError(error);
  }
}

export function resolveSourceServingFromPortionSelection(input: {
  detail: LiveUsdaDetailPreview;
  amountUnit: SupportedAmountUnit;
  portionId: string | null;
}): SourceServingDefinition | null {
  if (input.amountUnit !== "source_serving") {
    return null;
  }

  const targetId = input.portionId ?? input.detail.defaultPortionId;
  if (!targetId) {
    throw new LiveUsdaError(
      "invalid_fdc_id",
      "The selected USDA portion is unavailable for this food.",
      400,
    );
  }
  const portion = input.detail.portionOptions.find((option) => option.id === targetId);
  if (!portion) {
    throw new LiveUsdaError(
      "invalid_fdc_id",
      "The selected USDA portion is unavailable for this food.",
      400,
    );
  }

  return {
    quantity: portion.quantity,
    unit: portion.unit,
    weightGrams: portion.gramWeight,
  };
}

export function clearLiveUsdaCachesForTests(): void {
  searchCache.clear();
  detailCache.clear();
}
