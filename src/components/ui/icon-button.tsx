import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  tone?: "default" | "accent" | "danger";
}

const toneClass = {
  default: "border-white/15 text-zinc-100 hover:bg-white/10",
  accent: "border-[#87a3ff]/35 text-[#c7d6ff] hover:bg-[#87a3ff]/15",
  danger: "border-rose-400/35 text-rose-200 hover:bg-rose-500/15",
} as const;

export function IconButton({ label, icon, tone = "default", className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[var(--ds-radius-md)] border transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}

