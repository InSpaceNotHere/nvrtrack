import { ProgressBar } from "@/components/ui/progress-bar";
import type { MacroStat } from "@/types/fitness";

interface MacroSummaryProps {
  macros: MacroStat[];
}

export function MacroSummary({ macros }: MacroSummaryProps) {
  return (
    <ul className="space-y-4">
      {macros.map((macro) => (
        <li key={macro.name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">{macro.name}</span>
            <span className="font-medium text-white">
              {macro.consumed}
              {macro.unit} / {macro.goal}
              {macro.unit}
            </span>
          </div>
          <ProgressBar value={macro.consumed} max={macro.goal} compact />
        </li>
      ))}
    </ul>
  );
}
