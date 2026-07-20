import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-[1.1rem] border border-white/10 bg-[#101215] p-3.5 sm:p-4 ${className}`}>
      {(title || subtitle) && (
        <header className="mb-2.5">
          {title ? <h2 className="text-sm font-medium uppercase tracking-[0.09em] text-zinc-300">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-zinc-500">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
