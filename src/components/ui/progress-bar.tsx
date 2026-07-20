interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  compact?: boolean;
}

export function ProgressBar({ value, max, label, compact = false }: ProgressBarProps) {
  const ratio = max <= 0 ? 0 : Math.min((value / max) * 100, 100);
  const height = compact ? "h-1.5" : "h-2.5";

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p> : null}
      <div className={`w-full overflow-hidden rounded-full bg-white/10 ${height}`}>
        <div
          className={`rounded-full bg-[#7ea0ff] transition-[width] duration-300 ${height}`}
          style={{ width: `${ratio}%` }}
          aria-label={label ?? "progress"}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          role="progressbar"
        />
      </div>
    </div>
  );
}
