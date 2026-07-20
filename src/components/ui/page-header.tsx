interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-6 sm:mb-7">
      {eyebrow ? <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-500">{eyebrow}</p> : null}
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-zinc-400 sm:text-base">{subtitle}</p> : null}
    </header>
  );
}
