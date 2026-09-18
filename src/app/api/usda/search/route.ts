import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "@/lib/data/auth-context";
import { LiveUsdaError, searchLiveUsdaFoods } from "@/lib/usda/live";

interface SearchRouteSuccessBody {
  status: "success" | "empty";
  query: string;
  group: "generic" | "branded";
  totalHits: number;
  truncated: boolean;
  items: Array<{
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
    coreNutrients: {
      calories_kcal: number | null;
      protein_g: number | null;
      carbohydrate_g: number | null;
      fat_g: number | null;
    };
    hasRequiredCoreNutrients: boolean;
  }>;
}

interface SearchRouteErrorBody {
  status: "error";
  code:
    | "unauthenticated"
    | "invalid_query"
    | "invalid_group"
    | "invalid_fdc_id"
    | "rate_limited"
    | "timeout"
    | "service_unavailable"
    | "invalid_response"
    | "upstream_error"
    | "not_configured"
    | "invalid_request";
  message: string;
}

function parseJsonNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export async function POST(request: Request): Promise<NextResponse<SearchRouteSuccessBody | SearchRouteErrorBody>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    const unauthenticated = auth.error.code === "UNAUTHENTICATED";
    return NextResponse.json(
      {
        status: "error",
        code: unauthenticated ? "unauthenticated" : "service_unavailable",
        message: unauthenticated ? "Sign in to search USDA foods." : "Unable to verify your account right now.",
      },
      { status: unauthenticated ? 401 : 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "invalid_request",
        message: "Search request payload is invalid.",
      },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query : "";
  const group = typeof body.group === "string" ? body.group : "generic";
  const limit = parseJsonNumber(body.limit);
  const forceRefresh =
    process.env.NODE_ENV !== "production" && request.headers.get("x-usda-refresh")?.trim() === "1";

  try {
    const result = await searchLiveUsdaFoods({
      query,
      group,
      limit,
      forceRefresh,
    });

    return NextResponse.json(
      {
        status: result.items.length ? "success" : "empty",
        query: result.query,
        group: result.group,
        totalHits: result.totalHits,
        truncated: result.truncated,
        items: result.items,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof LiveUsdaError) {
      return NextResponse.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        status: "error",
        code: "service_unavailable",
        message: "USDA search is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
