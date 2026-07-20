import {
  hasRequiredMacroNutrients,
  normalizeUsdaNutrientsPer100g,
  normalizeUsdaNutrientsPer100gWithDiagnostics,
} from "./nutrients";
import { normalizeUsdaFoodDetailResponse } from "./normalization";
import type {
  NormalizedNutrientsPer100g,
  NormalizedUsdaFoodDetail,
  UsdaFoodDetailResponse,
} from "./types";

export const FOOD_CATALOG_PILOT_LOCK_SCHEMA_VERSION = "food-catalog-pilot-lock-v1";

export type PilotFoodCategory =
  | "protein"
  | "carbohydrate"
  | "produce_and_staples";

export type PilotPreparationExpectation = "raw" | "cooked" | "neutral";

export interface FoodCatalogManifestRecord {
  target: string;
  fdcId: number;
  displayName: string;
  exactUsdaDescription: string;
  expectedDataType: string;
  category: PilotFoodCategory;
  aliases: string[];
  preparationExpectation: PilotPreparationExpectation;
  notes?: string;
}

export interface FoodCatalogPilotManifest {
  version: "food-catalog-pilot-manifest-v1";
  records: FoodCatalogManifestRecord[];
}

export interface CatalogPilotSourcePortion {
  quantity: number | null;
  unit: string | null;
  description: string | null;
  modifier: string | null;
  gramWeight: number | null;
  isUsableForGramConversion: boolean;
}

export interface CatalogPilotNutrientDiagnostics {
  sourceNutrientId: number | null;
  sourceNutrientNumber: string | null;
  sourceUnit: string | null;
  sourceValue: number | null;
  normalizedValue: number | null;
}

export interface CatalogPilotLockRecord {
  fdcId: number;
  target: string;
  displayName: string;
  description: string;
  normalizedName: string;
  aliases: string[];
  dataType: string;
  category: PilotFoodCategory;
  preparationExpectation: PilotPreparationExpectation;
  brandOwner: string | null;
  brandName: string | null;
  gtinUpc: string | null;
  foodCategory: string | null;
  ingredients: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number | null;
  nutrientsPer100g: {
    calories_kcal: number;
    protein_g: number;
    carbohydrate_g: number;
    fat_g: number;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
  };
  nutrientDiagnostics: {
    calories_kcal: CatalogPilotNutrientDiagnostics;
    protein_g: CatalogPilotNutrientDiagnostics;
    carbohydrate_g: CatalogPilotNutrientDiagnostics;
    fat_g: CatalogPilotNutrientDiagnostics;
    fiber_g: CatalogPilotNutrientDiagnostics;
    sugar_g: CatalogPilotNutrientDiagnostics;
    sodium_mg: CatalogPilotNutrientDiagnostics;
  };
  sourcePublishedDate: string | null;
  sourceModifiedDate: string | null;
  retrievedAt: string;
  sourcePortions: CatalogPilotSourcePortion[];
  warnings: string[];
  notes: string | null;
}

export interface FoodCatalogPilotLockFile {
  schemaVersion: typeof FOOD_CATALOG_PILOT_LOCK_SCHEMA_VERSION;
  manifestVersion: FoodCatalogPilotManifest["version"];
  generatedAt: string;
  records: CatalogPilotLockRecord[];
}

export interface CatalogSeedSqlInput {
  lockFile: FoodCatalogPilotLockFile;
  manifest: FoodCatalogPilotManifest;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureFiniteNumber(value: number | null | undefined, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
  return value;
}

function ensureNullableNonnegative(value: number | null, fieldName: string): void {
  if (value !== null && value < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }
}

function normalizeRecordAliases(aliases: string[]): string[] {
  const normalized = aliases
    .map(normalizeAlias)
    .filter(Boolean);
  const deduped = Array.from(new Set(normalized));
  return deduped.sort((left, right) => left.localeCompare(right));
}

export function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

const COOKED_WORD_PATTERN = /\b(cooked|roasted|broiled|baked|grilled|fried|stewed|poached|boiled|steamed)\b/i;
const RAW_WORD_PATTERN = /\braw\b/i;

export function matchesPreparationExpectation(
  description: string,
  expectation: PilotPreparationExpectation,
): boolean {
  if (expectation === "neutral") {
    return true;
  }

  const hasRaw = RAW_WORD_PATTERN.test(description);
  const hasCooked = COOKED_WORD_PATTERN.test(description);

  if (expectation === "raw") {
    return hasRaw && !hasCooked;
  }

  return hasCooked;
}

export function validateFoodCatalogPilotManifest(manifest: FoodCatalogPilotManifest): void {
  if (manifest.version !== "food-catalog-pilot-manifest-v1") {
    throw new Error("Unsupported manifest version.");
  }
  if (manifest.records.length === 0) {
    throw new Error("Manifest must include at least one record.");
  }

  const fdcIds = new Set<number>();
  const normalizedNames = new Map<string, string>();

  for (const [index, record] of manifest.records.entries()) {
    const scope = `manifest.records[${index}]`;
    if (!Number.isInteger(record.fdcId) || record.fdcId <= 0) {
      throw new Error(`${scope}.fdcId must be a positive integer.`);
    }
    if (fdcIds.has(record.fdcId)) {
      throw new Error(`Duplicate manifest fdcId detected: ${record.fdcId}.`);
    }
    fdcIds.add(record.fdcId);

    if (!record.target.trim()) {
      throw new Error(`${scope}.target cannot be blank.`);
    }
    if (!record.displayName.trim()) {
      throw new Error(`${scope}.displayName cannot be blank.`);
    }
    if (!record.exactUsdaDescription.trim()) {
      throw new Error(`${scope}.exactUsdaDescription cannot be blank.`);
    }
    if (!record.expectedDataType.trim()) {
      throw new Error(`${scope}.expectedDataType cannot be blank.`);
    }
    if (!["protein", "carbohydrate", "produce_and_staples"].includes(record.category)) {
      throw new Error(`${scope}.category is invalid.`);
    }
    if (!["raw", "cooked", "neutral"].includes(record.preparationExpectation)) {
      throw new Error(`${scope}.preparationExpectation is invalid.`);
    }

    const aliases = normalizeRecordAliases(record.aliases);
    if (aliases.length !== record.aliases.length) {
      throw new Error(`${scope}.aliases must be unique, normalized, and non-empty.`);
    }
    if (aliases.some((alias) => alias.length < 2)) {
      throw new Error(`${scope}.aliases must be at least 2 characters after normalization.`);
    }

    const normalizedDisplayName = normalizeCatalogName(record.displayName);
    const existing = normalizedNames.get(normalizedDisplayName);
    if (existing && existing !== record.target) {
      throw new Error(
        `Duplicate normalized display name '${normalizedDisplayName}' across targets '${existing}' and '${record.target}'.`,
      );
    }
    normalizedNames.set(normalizedDisplayName, record.target);
  }
}

function asNullableNutrient(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  ensureFiniteNumber(value, "nutrient");
  return value;
}

function toCoreNutrientValue(
  nutrients: NormalizedNutrientsPer100g,
  key: "calories_kcal" | "protein_g" | "carbohydrate_g" | "fat_g",
): number {
  const nutrient = nutrients[key];
  if (nutrient.isMissing || nutrient.value === null) {
    throw new Error(`Missing required nutrient '${key}'.`);
  }
  ensureNullableNonnegative(nutrient.value, key);
  return nutrient.value;
}

function findPreferredServingWeight(detail: NormalizedUsdaFoodDetail): number | null {
  if (typeof detail.servingWeightGrams === "number" && detail.servingWeightGrams > 0) {
    return detail.servingWeightGrams;
  }
  const usablePortion = detail.sourcePortions.find(
    (portion) =>
      portion.isUsableForGramConversion &&
      typeof portion.quantity === "number" &&
      portion.quantity === 1 &&
      typeof portion.gramWeight === "number" &&
      portion.gramWeight > 0,
  );
  if (usablePortion?.gramWeight) {
    return usablePortion.gramWeight;
  }
  return null;
}

function toPortions(detail: NormalizedUsdaFoodDetail): CatalogPilotSourcePortion[] {
  return detail.sourcePortions
    .map((portion) => ({
      quantity: portion.quantity,
      unit: portion.unit,
      description: portion.description,
      modifier: portion.modifier,
      gramWeight: portion.gramWeight,
      isUsableForGramConversion: portion.isUsableForGramConversion,
    }))
    .sort((left, right) => {
      const leftUnit = left.unit ?? "";
      const rightUnit = right.unit ?? "";
      const byUnit = leftUnit.localeCompare(rightUnit);
      if (byUnit !== 0) {
        return byUnit;
      }
      return (left.quantity ?? 0) - (right.quantity ?? 0);
    });
}

function normalizeNotes(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ensureDataTypeMatches(
  expectedDataType: string,
  actualDataType: string,
  target: string,
): void {
  if (normalizeText(expectedDataType) !== normalizeText(actualDataType)) {
    throw new Error(
      `Data type mismatch for '${target}': expected '${expectedDataType}', received '${actualDataType}'.`,
    );
  }
}

function ensureDescriptionMatches(
  expectedDescription: string,
  actualDescription: string,
  target: string,
): void {
  if (normalizeText(expectedDescription) !== normalizeText(actualDescription)) {
    throw new Error(
      `Description mismatch for '${target}': expected '${expectedDescription}', received '${actualDescription}'.`,
    );
  }
}

function normalizeDiagnosticsEntry(entry: {
  sourceNutrientId: number | null;
  sourceNutrientNumber: string | null;
  sourceUnit: string | null;
  sourceValue: number | null;
  normalizedValue: number | null;
} | null): CatalogPilotNutrientDiagnostics {
  return entry ?? {
    sourceNutrientId: null,
    sourceNutrientNumber: null,
    sourceUnit: null,
    sourceValue: null,
    normalizedValue: null,
  };
}

export function buildPilotLockRecordFromDetailResponse(input: {
  manifestRecord: FoodCatalogManifestRecord;
  detailResponse: UsdaFoodDetailResponse;
  retrievedAtIso: string;
}): CatalogPilotLockRecord {
  const { manifestRecord, detailResponse, retrievedAtIso } = input;
  const detail = normalizeUsdaFoodDetailResponse(detailResponse);
  const nutrients = normalizeUsdaNutrientsPer100g(detailResponse.foodNutrients ?? []);
  const diagnostics = normalizeUsdaNutrientsPer100gWithDiagnostics(detailResponse.foodNutrients ?? []);

  ensureDataTypeMatches(manifestRecord.expectedDataType, detail.dataType, manifestRecord.target);
  ensureDescriptionMatches(manifestRecord.exactUsdaDescription, detail.description, manifestRecord.target);

  if (!matchesPreparationExpectation(detail.description, manifestRecord.preparationExpectation)) {
    throw new Error(
      `Preparation expectation mismatch for '${manifestRecord.target}': '${detail.description}'.`,
    );
  }

  if (!hasRequiredMacroNutrients(nutrients)) {
    throw new Error(`Record '${manifestRecord.target}' is missing required core nutrients.`);
  }

  const calories = toCoreNutrientValue(nutrients, "calories_kcal");
  const protein = toCoreNutrientValue(nutrients, "protein_g");
  const carbohydrate = toCoreNutrientValue(nutrients, "carbohydrate_g");
  const fat = toCoreNutrientValue(nutrients, "fat_g");
  ensureNullableNonnegative(calories, "calories_kcal");
  ensureNullableNonnegative(protein, "protein_g");
  ensureNullableNonnegative(carbohydrate, "carbohydrate_g");
  ensureNullableNonnegative(fat, "fat_g");

  const optionalFiber = asNullableNutrient(nutrients.fiber_g.value);
  const optionalSugar = asNullableNutrient(nutrients.sugar_g.value);
  const optionalSodium = asNullableNutrient(nutrients.sodium_mg.value);
  ensureNullableNonnegative(optionalFiber, "fiber_g");
  ensureNullableNonnegative(optionalSugar, "sugar_g");
  ensureNullableNonnegative(optionalSodium, "sodium_mg");

  const warnings: string[] = [];
  if (detail.servingWeightGrams === null && detail.sourcePortions.every((portion) => !portion.isUsableForGramConversion)) {
    warnings.push("No source serving includes a usable gram conversion.");
  }

  return {
    fdcId: detail.fdcId,
    target: manifestRecord.target,
    displayName: manifestRecord.displayName,
    description: detail.description,
    normalizedName: normalizeCatalogName(manifestRecord.displayName),
    aliases: normalizeRecordAliases(manifestRecord.aliases),
    dataType: detail.dataType,
    category: manifestRecord.category,
    preparationExpectation: manifestRecord.preparationExpectation,
    brandOwner: detail.brandOwner,
    brandName: detail.brandName,
    gtinUpc: detail.gtinUpc,
    foodCategory: detail.foodCategory,
    ingredients: detail.ingredients,
    servingSize: detail.servingSize,
    servingUnit: detail.servingUnit,
    servingWeightGrams: findPreferredServingWeight(detail),
    nutrientsPer100g: {
      calories_kcal: calories,
      protein_g: protein,
      carbohydrate_g: carbohydrate,
      fat_g: fat,
      fiber_g: optionalFiber,
      sugar_g: optionalSugar,
      sodium_mg: optionalSodium,
    },
    nutrientDiagnostics: {
      calories_kcal: normalizeDiagnosticsEntry(diagnostics.selections.calories_kcal),
      protein_g: normalizeDiagnosticsEntry(diagnostics.selections.protein_g),
      carbohydrate_g: normalizeDiagnosticsEntry(diagnostics.selections.carbohydrate_g),
      fat_g: normalizeDiagnosticsEntry(diagnostics.selections.fat_g),
      fiber_g: normalizeDiagnosticsEntry(diagnostics.selections.fiber_g),
      sugar_g: normalizeDiagnosticsEntry(diagnostics.selections.sugar_g),
      sodium_mg: normalizeDiagnosticsEntry(diagnostics.selections.sodium_mg),
    },
    sourcePublishedDate: detail.sourcePublishedDate,
    sourceModifiedDate: detail.sourceModifiedDate,
    retrievedAt: retrievedAtIso,
    sourcePortions: toPortions(detail),
    warnings,
    notes: normalizeNotes(manifestRecord.notes),
  };
}

export function buildFoodCatalogPilotLockFile(input: {
  manifest: FoodCatalogPilotManifest;
  records: CatalogPilotLockRecord[];
  generatedAt: string;
}): FoodCatalogPilotLockFile {
  validateFoodCatalogPilotManifest(input.manifest);
  const manifestMap = new Map(input.manifest.records.map((record) => [record.fdcId, record]));
  const lockFdcIds = new Set<number>();

  for (const record of input.records) {
    if (lockFdcIds.has(record.fdcId)) {
      throw new Error(`Duplicate lock record for fdcId '${record.fdcId}'.`);
    }
    lockFdcIds.add(record.fdcId);
    const manifestRecord = manifestMap.get(record.fdcId);
    if (!manifestRecord) {
      throw new Error(`Lock record fdcId '${record.fdcId}' is not present in manifest.`);
    }

    if (!matchesPreparationExpectation(record.description, manifestRecord.preparationExpectation)) {
      throw new Error(
        `Lock record preparation mismatch for '${manifestRecord.target}' (${record.fdcId}).`,
      );
    }
  }

  for (const record of input.manifest.records) {
    if (!lockFdcIds.has(record.fdcId)) {
      throw new Error(`Manifest fdcId '${record.fdcId}' is missing from lock file.`);
    }
  }

  const sortedRecords = [...input.records].sort((left, right) => left.fdcId - right.fdcId);

  return {
    schemaVersion: FOOD_CATALOG_PILOT_LOCK_SCHEMA_VERSION,
    manifestVersion: input.manifest.version,
    generatedAt: input.generatedAt,
    records: sortedRecords,
  };
}

export function validateFoodCatalogPilotLockFile(
  lockFile: FoodCatalogPilotLockFile,
  manifest: FoodCatalogPilotManifest,
): void {
  if (lockFile.schemaVersion !== FOOD_CATALOG_PILOT_LOCK_SCHEMA_VERSION) {
    throw new Error(`Unexpected lock schema version '${lockFile.schemaVersion}'.`);
  }
  if (lockFile.manifestVersion !== manifest.version) {
    throw new Error("Lock manifest version does not match manifest.");
  }
  validateFoodCatalogPilotManifest(manifest);

  const lockFdcIds = lockFile.records.map((record) => record.fdcId);
  const sortedFdcIds = [...lockFdcIds].sort((left, right) => left - right);
  if (JSON.stringify(lockFdcIds) !== JSON.stringify(sortedFdcIds)) {
    throw new Error("Lock file records must be sorted by fdcId ascending.");
  }
  if (new Set(lockFdcIds).size !== lockFdcIds.length) {
    throw new Error("Lock file contains duplicate fdcId values.");
  }

  const manifestById = new Map(manifest.records.map((record) => [record.fdcId, record]));
  for (const lockRecord of lockFile.records) {
    const manifestRecord = manifestById.get(lockRecord.fdcId);
    if (!manifestRecord) {
      throw new Error(`Lock file includes unknown fdcId '${lockRecord.fdcId}'.`);
    }
    ensureDataTypeMatches(manifestRecord.expectedDataType, lockRecord.dataType, manifestRecord.target);
    ensureDescriptionMatches(manifestRecord.exactUsdaDescription, lockRecord.description, manifestRecord.target);

    if (!matchesPreparationExpectation(lockRecord.description, manifestRecord.preparationExpectation)) {
      throw new Error(
        `Preparation expectation mismatch for '${manifestRecord.target}' in lock file.`,
      );
    }

    if (lockRecord.nutrientsPer100g.calories_kcal < 0) {
      throw new Error(`Negative calories for fdcId '${lockRecord.fdcId}'.`);
    }
    if (lockRecord.nutrientsPer100g.protein_g < 0) {
      throw new Error(`Negative protein for fdcId '${lockRecord.fdcId}'.`);
    }
    if (lockRecord.nutrientsPer100g.carbohydrate_g < 0) {
      throw new Error(`Negative carbohydrate for fdcId '${lockRecord.fdcId}'.`);
    }
    if (lockRecord.nutrientsPer100g.fat_g < 0) {
      throw new Error(`Negative fat for fdcId '${lockRecord.fdcId}'.`);
    }

    ensureNullableNonnegative(lockRecord.nutrientsPer100g.fiber_g, "fiber_g");
    ensureNullableNonnegative(lockRecord.nutrientsPer100g.sugar_g, "sugar_g");
    ensureNullableNonnegative(lockRecord.nutrientsPer100g.sodium_mg, "sodium_mg");
  }
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableString(value: string | null): string {
  return value === null ? "null" : sqlString(value);
}

function sqlNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot serialize non-finite numeric value to SQL.");
  }
  return `${value}`;
}

function sqlNullableNumber(value: number | null): string {
  return value === null ? "null" : sqlNumber(value);
}

function sqlStringArray(values: string[]): string {
  const escaped = values.map((value) => sqlString(value)).join(", ");
  return `array[${escaped}]::text[]`;
}

function sqlDate(value: string | null): string {
  if (value === null) {
    return "null";
  }
  return `${sqlString(value)}::date`;
}

function sqlTimestamp(value: string): string {
  return `${sqlString(value)}::timestamptz`;
}

export function generateFoodCatalogPilotSeedSql(input: CatalogSeedSqlInput): string {
  const { lockFile, manifest } = input;
  validateFoodCatalogPilotLockFile(lockFile, manifest);

  const records = [...lockFile.records].sort((left, right) => left.fdcId - right.fdcId);
  const valuesSql = records
    .map((record) => {
      return `(
  ${sqlNumber(record.fdcId)},
  ${sqlString(record.description)},
  ${sqlString(record.normalizedName)},
  ${sqlStringArray(record.aliases)},
  ${sqlString(record.dataType)},
  ${sqlNullableString(record.brandOwner)},
  ${sqlNullableString(record.brandName)},
  ${sqlNullableString(record.gtinUpc)},
  ${sqlNullableString(record.foodCategory)},
  ${sqlNullableString(record.ingredients)},
  ${sqlNullableNumber(record.servingSize)},
  ${sqlNullableString(record.servingUnit)},
  ${sqlNullableNumber(record.servingWeightGrams)},
  ${sqlNumber(record.nutrientsPer100g.calories_kcal)},
  ${sqlNumber(record.nutrientsPer100g.protein_g)},
  ${sqlNumber(record.nutrientsPer100g.carbohydrate_g)},
  ${sqlNumber(record.nutrientsPer100g.fat_g)},
  ${sqlNullableNumber(record.nutrientsPer100g.fiber_g)},
  ${sqlNullableNumber(record.nutrientsPer100g.sugar_g)},
  ${sqlNullableNumber(record.nutrientsPer100g.sodium_mg)},
  ${sqlDate(record.sourcePublishedDate)},
  ${sqlDate(record.sourceModifiedDate)},
  ${sqlTimestamp(record.retrievedAt)},
  true,
  ${sqlTimestamp(lockFile.generatedAt)},
  ${sqlTimestamp(lockFile.generatedAt)}
)`;
    })
    .join(",\n");

  return `-- Session 9.5B Phase 2A USDA pilot catalog seed
-- Generated deterministically from:
--   - scripts/usda/food-catalog-manifest.ts
--   - scripts/usda/generated/food-catalog-pilot.lock.json
-- Do not hand-edit food rows. Refresh through scripts/usda/fetch-reviewed-foods.ts and generate-food-catalog-seed.ts.

insert into public.food_catalog (
  fdc_id,
  description,
  normalized_name,
  aliases,
  data_type,
  brand_owner,
  brand_name,
  gtin_upc,
  food_category,
  ingredients,
  serving_size,
  serving_unit,
  serving_weight_grams,
  calories_per_100g,
  protein_g_per_100g,
  carbohydrate_g_per_100g,
  fat_g_per_100g,
  fiber_g_per_100g,
  sugar_g_per_100g,
  sodium_mg_per_100g,
  source_published_date,
  source_modified_date,
  retrieved_at,
  is_active,
  created_at,
  updated_at
)
values
${valuesSql}
on conflict (fdc_id) do update
set
  description = excluded.description,
  normalized_name = excluded.normalized_name,
  aliases = excluded.aliases,
  data_type = excluded.data_type,
  brand_owner = excluded.brand_owner,
  brand_name = excluded.brand_name,
  gtin_upc = excluded.gtin_upc,
  food_category = excluded.food_category,
  ingredients = excluded.ingredients,
  serving_size = excluded.serving_size,
  serving_unit = excluded.serving_unit,
  serving_weight_grams = excluded.serving_weight_grams,
  calories_per_100g = excluded.calories_per_100g,
  protein_g_per_100g = excluded.protein_g_per_100g,
  carbohydrate_g_per_100g = excluded.carbohydrate_g_per_100g,
  fat_g_per_100g = excluded.fat_g_per_100g,
  fiber_g_per_100g = excluded.fiber_g_per_100g,
  sugar_g_per_100g = excluded.sugar_g_per_100g,
  sodium_mg_per_100g = excluded.sodium_mg_per_100g,
  source_published_date = excluded.source_published_date,
  source_modified_date = excluded.source_modified_date,
  retrieved_at = excluded.retrieved_at,
  is_active = true,
  updated_at = excluded.updated_at;
`;
}

export function hasSecretLikeValue(payload: string): boolean {
  const secretPatterns = [
    /USDA_FDC_API_KEY/i,
    /api[_-]?key/i,
    /sbp_[a-z0-9]{20,}/i,
    /service[_-]?role/i,
  ];
  return secretPatterns.some((pattern) => pattern.test(payload));
}
