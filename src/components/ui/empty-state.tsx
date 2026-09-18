import { CircleSlash2 } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-[var(--ds-radius-xl)] border border-dashed border-white/15 bg-[var(--ds-color-bg-muted)] p-6 text-center">
      <CircleSlash2 className="mx-auto mb-2.5 h-6 w-6 text-zinc-500" aria-hidden="true" />
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-200">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
