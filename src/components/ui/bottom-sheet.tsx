import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface BottomSheetProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
      <button type="button" aria-label="Close sheet" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full rounded-t-[var(--ds-radius-xl)] border border-white/10 bg-[var(--ds-color-bg-surface)] p-4 pb-5 shadow-[var(--ds-shadow-lg)]",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20" />
        {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-100">{title}</h2> : null}
        <div className={title ? "mt-3" : ""}>{children}</div>
      </section>
    </div>
  );
}

