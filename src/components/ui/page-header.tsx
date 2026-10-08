interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-4 sm:mb-5">
      {eyebrow ? <p className="mb-1.5 text-base text-[var(--ds-color-text-secondary)]">{eyebrow}</p> : null}
      <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[var(--ds-color-text-primary)]">{title}</h1>
      {subtitle ? <p className="mt-2 text-[17px] leading-7 text-[var(--ds-color-text-secondary)]">{subtitle}</p> : null}
    </header>
  );
}
