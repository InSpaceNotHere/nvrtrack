import type { SelectHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn("ds-input pr-8", className)} {...props} />;
}

