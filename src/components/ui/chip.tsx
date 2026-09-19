import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface ChipProps {
  children: ReactNode;
  tone?: "default" | "accent" | "danger" | "success" | "warning" | "info";
  className?: string;
}

const toneClass = {
  default: "border-white/12 bg-black/20 text-zinc-300",
  accent: "border-[#87a3ff]/35 bg-[#87a3ff]/14 text-[#d0dcff]",
  info: "border-sky-400/35 bg-sky-500/10 text-sky-200",
  warning: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  danger: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  success: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
} as const;

export function Chip({ children, tone = "default", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

