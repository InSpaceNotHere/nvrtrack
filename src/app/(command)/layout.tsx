import type { ReactNode } from "react";

import { WorkspaceProvider } from "@/components/command-center/workspace-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function CommandLayout({ children }: { children: ReactNode }) {
  return (
      <AppShell tone="owner">
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </AppShell>
  );
}
