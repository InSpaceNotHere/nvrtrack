import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, className = "" }: CardProps) {
  return (
    <section className={cn("ds-card p-3.5 sm:p-4", className)}>
      {(title || subtitle) && (
        <header className="mb-2.5">
          {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
