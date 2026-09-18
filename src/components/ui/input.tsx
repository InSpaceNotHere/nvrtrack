import type { InputHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn("ds-input", className)} {...props} />;
}

