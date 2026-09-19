import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface FormProps {
  children: ReactNode;
  className?: string;
}

interface FormFieldProps {
  label: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function FormStack({ children, className }: FormProps) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

export function FormGrid({ children, className }: FormProps) {
  return <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <label className={cn("space-y-1 text-sm text-zinc-300", className)}>
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </label>
  );
}

