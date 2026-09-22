import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { resolveOnboardingGate } from "@/lib/onboarding/gating";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import { isAuthRoute, isProtectedRoute } from "@/lib/routing/access";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find the") && normalized.includes("column")) ||
    normalized.includes("schema cache")
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const env = getSupabasePublicEnv();

  if (!env) {
    if (isProtectedRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (user && isProtectedRoute(pathname)) {
    const profileResult = await supabase
      .from("profiles")
      .select("onboarding_version_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileResult.error) {
      const completedVersion =
        (profileResult.data as { onboarding_version_completed?: number | null } | null)?.onboarding_version_completed ?? 0;
      let activeWorkoutId: string | null = null;
      if (completedVersion < ONBOARDING_REQUIRED_VERSION && pathname.startsWith("/training/workouts/")) {
        const activeWorkoutResult = await supabase
          .from("workouts")
          .select("id")
          .eq("user_id", user.id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        activeWorkoutId = (activeWorkoutResult.data as { id?: string } | null)?.id ?? null;
      }

      const decision = resolveOnboardingGate({
        pathname,
        onboardingQuery: request.nextUrl.searchParams.get("q"),
        completedVersion,
        requiredVersion: ONBOARDING_REQUIRED_VERSION,
        activeWorkoutId,
      });

      if (!decision.allow && decision.redirectTo) {
        return NextResponse.redirect(new URL(decision.redirectTo, request.url));
      }
    } else if (!isMissingColumnError(profileResult.error.message)) {
      return response;
    }
  }

  return response;
}
