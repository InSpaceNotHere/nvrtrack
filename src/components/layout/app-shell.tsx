import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[1100px] px-0 md:px-3 lg:px-4">
      <div className="flex min-h-screen w-full">
        <DesktopSidebar />
        <div className="relative flex min-h-screen flex-1 flex-col">
          <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-24 pt-4 sm:px-4 sm:pt-5 md:max-w-[760px] md:px-6 md:pb-8 md:pt-6">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
