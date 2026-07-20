import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#101215] p-4 sm:p-5 ${className}`}>
      {(title || subtitle) && (
        <header className="mb-3">
          {title ? <h2 className="text-base font-semibold text-white">{title}</h2> : null}
          {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
