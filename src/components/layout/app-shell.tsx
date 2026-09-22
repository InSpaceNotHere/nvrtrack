"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isOnboardingRoute = pathname.startsWith("/onboarding");

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
