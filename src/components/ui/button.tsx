import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ds-button-primary-bg)] text-[var(--ds-button-primary-fg)] hover:brightness-105",
  secondary:
    "border border-[var(--ds-button-secondary-border)] bg-[var(--ds-button-secondary-bg)] text-[var(--ds-button-secondary-fg)] hover:bg-[var(--ds-color-bg-muted)]",
  ghost: "text-[var(--ds-button-ghost-fg)] hover:bg-[var(--ds-color-bg-muted)]",
  danger: "border border-[var(--ds-color-danger)] text-[var(--ds-button-danger-fg)] hover:bg-[var(--ds-color-attention-soft,#fff5de)]",
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

