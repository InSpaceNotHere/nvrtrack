import type { InputHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

export type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DatePicker({ className, ...props }: DatePickerProps) {
  return <input type="date" className={cn("ds-input", className)} {...props} />;
}

