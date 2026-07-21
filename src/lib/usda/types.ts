export type UsdaSourceStatus = "manual" | "usda_catalog" | "usda_live" | "usda_modified";

export interface UsdaSearchRequest {
  query: string;
  pageSize?: number;
  pageNumber?: number;
  dataTypes?: string[];
}

export interface UsdaSearchResponse {
  foods?: UsdaSearchFood[];
  totalHits?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface UsdaSearchFood {
  fdcId?: number;
  description?: string;
  dataType?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  foodCategory?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  publishedDate?: string;
  modifiedDate?: string;
  foodNutrients?: UsdaFoodNutrient[];
}

export interface UsdaFoodDetailResponse {
  fdcId?: number;
  description?: string;
  dataType?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  foodCategory?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  publicationDate?: string;
  modifiedDate?: string;
  foodNutrients?: UsdaFoodNutrient[];
  foodPortions?: UsdaFoodPortion[];
}

export interface UsdaFoodNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
    number?: string;
    name?: string;
    unitName?: string;
  };
}

export interface UsdaFoodPortion {
  id?: number;
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: {
    name?: string;
    abbreviation?: string;
  };
}

export interface NormalizedNutrientAmount {
  value: number | null;
  isMissing: boolean;
}

export interface NormalizedNutrientSelection {
  sourceNutrientId: number | null;
  sourceNutrientNumber: string | null;
  sourceUnit: string | null;
  sourceValue: number | null;
  normalizedValue: number | null;
}

export interface NormalizedNutrientsPer100g {
  calories_kcal: NormalizedNutrientAmount;
  protein_g: NormalizedNutrientAmount;
  carbohydrate_g: NormalizedNutrientAmount;
  fat_g: NormalizedNutrientAmount;
  fiber_g: NormalizedNutrientAmount;
  sugar_g: NormalizedNutrientAmount;
  sodium_mg: NormalizedNutrientAmount;
}

export interface NormalizedUsdaPortion {
  id: number | null;
  quantity: number | null;
  unit: string | null;
  description: string | null;
  modifier: string | null;
  gramWeight: number | null;
  isUsableForGramConversion: boolean;
}

export interface NormalizedUsdaFoodSummary {
  fdcId: number;
  description: string;
  normalizedName: string;
  dataType: string;
  brandOwner: string | null;
  brandName: string | null;
  gtinUpc: string | null;
  foodCategory: string | null;
  ingredients: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  servingWeightGrams: number | null;
  nutrientsPer100g: NormalizedNutrientsPer100g;
  sourcePublishedDate: string | null;
  sourceModifiedDate: string | null;
}

export interface NormalizedUsdaFoodDetail extends NormalizedUsdaFoodSummary {
  sourcePortions: NormalizedUsdaPortion[];
}

export interface NormalizedUsdaSearchResult {
  foods: NormalizedUsdaFoodSummary[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

export interface NormalizedNutrientsPer100gWithDiagnostics {
  nutrients: NormalizedNutrientsPer100g;
  selections: Record<keyof NormalizedNutrientsPer100g, NormalizedNutrientSelection | null>;
}

export type UsdaClientErrorCode =
  | "not_configured"
  | "invalid_query"
  | "invalid_fdc_id"
  | "invalid_response"
  | "rate_limited"
  | "service_unavailable"
  | "upstream_error"
  | "timeout";

export class UsdaClientError extends Error {
  readonly code: UsdaClientErrorCode;
  readonly statusCode: number | null;

  constructor(code: UsdaClientErrorCode, message: string, statusCode: number | null = null) {
    super(message);
    this.name = "UsdaClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
