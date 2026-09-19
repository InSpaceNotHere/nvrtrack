import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-lg rounded-[var(--ds-radius-xl)] border border-white/12 bg-[var(--ds-color-bg-surface)] p-4 shadow-[var(--ds-shadow-lg)]",
          className,
        )}
      >
        {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-100">{title}</h2> : null}
        <div className={title ? "mt-3" : ""}>{children}</div>
      </section>
    </div>
  );
}

