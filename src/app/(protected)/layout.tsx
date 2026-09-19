import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedContext } from "@/lib/data/auth-context";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
