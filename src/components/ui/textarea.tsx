import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn("ds-textarea", className)} {...props} />;
}
