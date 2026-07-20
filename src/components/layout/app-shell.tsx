import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl">
      <DesktopSidebar />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pb-10">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
