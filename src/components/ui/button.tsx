import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ds-color-text-primary)] text-black hover:bg-white",
  secondary: "border border-white/15 bg-transparent text-zinc-100 hover:bg-white/10",
  ghost: "text-zinc-200 hover:bg-white/8",
  danger: "border border-rose-400/35 text-rose-200 hover:bg-rose-500/15",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-4 text-sm",
};

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--ds-radius-md)] font-semibold transition-colors ds-press disabled:cursor-not-allowed disabled:opacity-70",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}

