"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import { isPublicRoute } from "@/lib/routing/access";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isPublicPath = isPublicRoute(pathname);

  useEffect(() => {
    let cancelled = false;

    async function runGateCheck() {
      if (!supabase || isPublicPath) {
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("onboarding_version_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileResult.error || cancelled) {
        return;
      }

      const completedVersion =
        (profileResult.data as { onboarding_version_completed?: number | null } | null)?.onboarding_version_completed ?? 0;
      const hasCompletedRequiredVersion = completedVersion >= ONBOARDING_REQUIRED_VERSION;
      const onboardingQuery = isOnboardingRoute ? new URLSearchParams(window.location.search).get("q") : null;

      let redirectTo: string | null = null;
      if (hasCompletedRequiredVersion) {
        if (isOnboardingRoute && onboardingQuery !== "complete") {
          redirectTo = "/";
        }
      } else if (!isOnboardingRoute) {
        const routeWorkoutMatch = pathname.match(/^\/training\/workouts\/([^/]+)$/);
        if (routeWorkoutMatch?.[1]) {
          const activeWorkoutResult = await supabase
            .from("workouts")
            .select("id")
            .eq("user_id", user.id)
            .is("completed_at", null)
            .order("started_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const activeWorkoutId = (activeWorkoutResult.data as { id?: string } | null)?.id ?? null;
          if (!activeWorkoutId || activeWorkoutId !== routeWorkoutMatch[1]) {
            redirectTo = "/onboarding";
          }
        } else {
          redirectTo = "/onboarding";
        }
      }

      if (!cancelled && redirectTo && redirectTo !== pathname) {
        router.replace(redirectTo);
      }
    }

    runGateCheck();
    return () => {
      cancelled = true;
    };
  }, [isOnboardingRoute, isPublicPath, pathname, router, supabase]);

  if (isOnboardingRoute) {
    return (
      <div className="min-h-screen w-full bg-[var(--ds-color-bg-base)]">
        <main className="mx-auto w-full max-w-[760px] px-2 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--ds-color-bg-base)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px]">
        <DesktopSidebar />
        <div className="relative flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-[1100px] flex-1 px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4 sm:pt-5 md:px-6 md:pb-8 md:pt-6">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
