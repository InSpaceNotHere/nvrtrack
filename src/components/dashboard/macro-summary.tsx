import { ProgressBar } from "@/components/ui/progress-bar";
import type { MacroStat } from "@/types/fitness";

interface MacroSummaryProps {
  macros: MacroStat[];
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function MacroSummary({ macros }: MacroSummaryProps) {
  return (
    <ul className="space-y-2.5">
      {macros.map((macro) => (
        <li key={macro.name} className="space-y-1.5 rounded-[var(--ds-radius-md)] border border-white/10 bg-black/20 p-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{macro.name}</span>
            {macro.goal === null ? (
              <span className="font-medium text-zinc-500 tabular-nums">
                <span className="text-zinc-200">{formatValue(macro.consumed)}</span>
                <span className="ml-0.5 text-[11px] text-zinc-400">{macro.unit}</span>
                <span className="mx-1 text-zinc-500">/</span>--
                <span className="ml-0.5 text-[11px] text-zinc-500">{macro.unit}</span>
              </span>
            ) : (
              <span className="font-medium text-zinc-100 tabular-nums">
                <span>{formatValue(macro.consumed)}</span>
                <span className="ml-0.5 text-[11px] text-zinc-300">{macro.unit}</span>
                <span className="mx-1 text-zinc-500">/</span>
                <span>{macro.goal}</span>
                <span className="ml-0.5 text-[11px] text-zinc-400">{macro.unit}</span>
              </span>
            )}
          </div>
          {macro.goal === null ? (
            <div className="h-1.5 w-full rounded-full bg-white/8" aria-hidden="true" />
          ) : (
            <ProgressBar value={macro.consumed} max={macro.goal} compact />
          )}
        </li>
      ))}
    </ul>
  );
}
