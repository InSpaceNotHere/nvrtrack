interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-4 sm:mb-5">
      {eyebrow ? <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{eyebrow}</p> : null}
      <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p> : null}
    </header>
  );
}
