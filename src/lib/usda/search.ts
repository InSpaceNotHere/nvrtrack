import type { UsdaSearchRequest } from "./types";
import { UsdaClientError } from "./types";

export const USDA_SEARCH_MIN_QUERY_LENGTH = 2;
export const USDA_SEARCH_MAX_PAGE_SIZE = 25;
export const USDA_SEARCH_DEFAULT_PAGE_SIZE = 20;
export const USDA_SEARCH_DEFAULT_PAGE_NUMBER = 1;

export interface NormalizedUsdaSearchRequest {
  query: string;
  pageSize: number;
  pageNumber: number;
  dataTypes: string[];
}

function sanitizePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return USDA_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(value, USDA_SEARCH_MAX_PAGE_SIZE);
}

function sanitizePageNumber(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return USDA_SEARCH_DEFAULT_PAGE_NUMBER;
  }
  return value;
}

export function normalizeUsdaSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function normalizeUsdaSearchRequest(input: UsdaSearchRequest): NormalizedUsdaSearchRequest {
  const query = normalizeUsdaSearchQuery(input.query);
  if (query.length < USDA_SEARCH_MIN_QUERY_LENGTH) {
    throw new UsdaClientError(
      "invalid_query",
      `Search query must be at least ${USDA_SEARCH_MIN_QUERY_LENGTH} characters.`,
    );
  }

  const dataTypes = (input.dataTypes ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    query,
    pageSize: sanitizePageSize(input.pageSize),
    pageNumber: sanitizePageNumber(input.pageNumber),
    dataTypes,
  };
}

export function normalizeUsdaFdcId(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new UsdaClientError("invalid_fdc_id", "FDC ID must be a positive integer.");
  }
  return numeric;
}
