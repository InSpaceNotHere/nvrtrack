import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, subtitle, action, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || subtitle || action) && (
        <header className="flex items-end justify-between gap-3">
          <div>
            {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

