"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { isBusinessRoute } from "@/lib/command-center/routes";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import { isPublicRoute } from "@/lib/routing/access";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface AppShellProps {
  children: ReactNode;
  tone?: "owner" | "legacy";
}

export function AppShell({ children, tone = "legacy" }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isFocusedTaskRoute =
    pathname.startsWith("/nutrition/add") ||
    pathname.startsWith("/nutrition/foods/new") ||
    /\/nutrition\/foods\/[^/]+\/edit$/.test(pathname);
  const isPublicPath = isPublicRoute(pathname);

  useEffect(() => {
    let cancelled = false;

    async function runGateCheck() {
      if (!supabase || isPublicPath || isBusinessRoute(pathname)) {
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
          redirectTo = "/today";
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

  if (isOnboardingRoute || isFocusedTaskRoute) {
    return (
      <div className="min-h-screen w-full bg-[var(--ds-color-bg-base)]">
        <main className="mx-auto w-full max-w-[760px] px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4">
          {children}
        </main>
      </div>
    );
  }

  const frame = (
    <div className={tone === "owner" ? "mx-auto flex min-h-screen w-full max-w-[1240px]" : "mx-auto flex min-h-screen w-full max-w-[1360px]"}>
      <DesktopSidebar />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <main
          className={
            tone === "owner"
              ? "mx-auto w-full max-w-[820px] flex-1 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pb-12 md:pt-8"
              : "mx-auto w-full max-w-[1100px] flex-1 px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4 sm:pt-5 md:px-6 md:pb-8 md:pt-6"
          }
        >
          <div key={pathname} className={tone === "owner" ? "nvr-page" : undefined}>
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );

  if (tone === "owner") {
    return <div className="nvr-owner min-h-screen">{frame}</div>;
  }

  return <div className="min-h-screen w-full bg-[var(--ds-color-bg-base)]">{frame}</div>;
}
