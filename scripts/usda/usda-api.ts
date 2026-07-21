import { normalizeUsdaFoodDetailResponse, normalizeUsdaSearchResponse } from "../../src/lib/usda/normalization";
import { normalizeUsdaFdcId, normalizeUsdaSearchRequest } from "../../src/lib/usda/search";
import type {
  NormalizedUsdaFoodDetail,
  NormalizedUsdaSearchResult,
  UsdaFoodDetailResponse,
  UsdaSearchRequest,
  UsdaSearchResponse,
} from "../../src/lib/usda/types";
import { UsdaClientError } from "../../src/lib/usda/types";

const USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const USDA_REQUEST_TIMEOUT_MS = 8000;

function getUsdaApiKey(): string {
  const key = process.env.USDA_FDC_API_KEY?.trim();
  if (!key) {
    throw new UsdaClientError(
      "not_configured",
      "USDA API is not configured. Add USDA_FDC_API_KEY to the server environment.",
    );
  }
  return key;
}

function buildUrl(path: string, apiKey: string): URL {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${USDA_API_BASE_URL}/`);
  url.searchParams.set("api_key", apiKey);
  return url;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new UsdaClientError("invalid_response", "USDA service returned a non-JSON response.", response.status);
  }
  try {
    return await response.json();
  } catch {
    throw new UsdaClientError("invalid_response", "USDA service returned malformed JSON.", response.status);
  }
}

async function requestUsda(path: string, init: RequestInit): Promise<unknown> {
  const apiKey = getUsdaApiKey();
  const url = buildUrl(path, apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), USDA_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      throw new UsdaClientError("rate_limited", "USDA rate limit reached. Please try again soon.", 429);
    }
    if (response.status >= 500) {
      throw new UsdaClientError(
        "service_unavailable",
        "USDA service is temporarily unavailable. Please try again later.",
        response.status,
      );
    }
    if (!response.ok) {
      throw new UsdaClientError(
        "upstream_error",
        "USDA request failed. Please refine your request and retry.",
        response.status,
      );
    }
    return await parseJsonResponse(response);
  } catch (error) {
    if (error instanceof UsdaClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new UsdaClientError("timeout", "USDA request timed out. Please try again.");
    }
    throw new UsdaClientError("service_unavailable", "USDA request could not be completed at this time.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchUsdaFoodsForScript(request: UsdaSearchRequest): Promise<NormalizedUsdaSearchResult> {
  const normalized = normalizeUsdaSearchRequest(request);
  const payload: Record<string, unknown> = {
    query: normalized.query,
    pageSize: normalized.pageSize,
    pageNumber: normalized.pageNumber,
  };
  if (normalized.dataTypes.length) {
    payload.dataType = normalized.dataTypes;
  }
  const raw = (await requestUsda("/foods/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })) as UsdaSearchResponse;
  const safeFoods = (raw.foods ?? []).flatMap((food) => {
    try {
      return normalizeUsdaSearchResponse({
        foods: [food],
      }).foods;
    } catch {
      return [];
    }
  });

  return {
    foods: safeFoods,
    totalHits: typeof raw.totalHits === "number" && raw.totalHits >= 0 ? raw.totalHits : safeFoods.length,
    currentPage: typeof raw.currentPage === "number" && raw.currentPage > 0 ? raw.currentPage : 1,
    totalPages: typeof raw.totalPages === "number" && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function getUsdaFoodDetailForScript(fdcId: number | string): Promise<NormalizedUsdaFoodDetail> {
  const raw = await getUsdaFoodDetailRawForScript(fdcId);
  return normalizeUsdaFoodDetailResponse(raw);
}

export async function getUsdaFoodDetailRawForScript(
  fdcId: number | string,
): Promise<UsdaFoodDetailResponse> {
  const normalizedId = normalizeUsdaFdcId(fdcId);
  return (await requestUsda(`/food/${normalizedId}`, {
    method: "GET",
  })) as UsdaFoodDetailResponse;
}
