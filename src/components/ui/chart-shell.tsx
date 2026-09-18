import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface ChartShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ChartShell({ title, subtitle, children, className }: ChartShellProps) {
  return (
    <section className={cn("rounded-[var(--ds-radius-lg)] border border-white/10 bg-black/20 p-3", className)}>
      {(title || subtitle) ? (
        <header className="mb-2">
          {title ? <h3 className="text-xs font-semibold uppercase tracking-[0.09em] text-zinc-300">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

