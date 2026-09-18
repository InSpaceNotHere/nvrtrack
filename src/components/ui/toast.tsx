import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface ToastProps {
  tone?: "success" | "error" | "neutral";
  children: ReactNode;
  role?: "status" | "alert";
  className?: string;
}

const toneClass = {
  success: "border-accent/35 bg-accent/10 text-zinc-100",
  error: "border-rose-400/35 bg-rose-500/10 text-rose-200",
  neutral: "border-white/15 bg-black/25 text-zinc-100",
} as const;

export function Toast({ tone = "neutral", children, role = "status", className }: ToastProps) {
  return (
    <p role={role} aria-live="polite" className={cn("rounded-[var(--ds-radius-md)] border px-3 py-2 text-sm", toneClass[tone], className)}>
      {children}
    </p>
  );
}

interface ToastViewportProps {
  children: ReactNode;
}

export function ToastViewport({ children }: ToastViewportProps) {
  return <div className="fixed inset-x-0 bottom-16 z-50 mx-auto w-full max-w-xl px-3 sm:px-4">{children}</div>;
}

