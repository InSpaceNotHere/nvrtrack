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
    <ul className="space-y-3">
      {macros.map((macro) => (
        <li key={macro.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{macro.name}</span>
            {macro.goal === null ? (
              <span className="font-medium text-zinc-500">
                {formatValue(macro.consumed)}
                {macro.unit} / -- {macro.unit}
              </span>
            ) : (
              <span className="font-medium text-zinc-100">
                {formatValue(macro.consumed)}
                {macro.unit} / {macro.goal}
                {macro.unit}
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
