interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-2.5 sm:mb-3">
      {eyebrow ? <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{eyebrow}</p> : null}
      <h1 className="text-[1.1rem] font-semibold tracking-tight text-white sm:text-[1.2rem]">{title}</h1>
      {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
    </header>
  );
}
