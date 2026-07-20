import { ProgressBar } from "@/components/ui/progress-bar";
import type { StrengthGoal } from "@/types/fitness";

interface GoalProgressRowProps {
  goal: StrengthGoal;
}

export function GoalProgressRow({ goal }: GoalProgressRowProps) {
  return (
    <li className="space-y-1.5 rounded-xl border border-white/10 bg-black/25 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-100">{goal.lift}</p>
        <p className="text-xs text-zinc-400">
          {goal.current} of {goal.target} {goal.unit}
        </p>
      </div>
      <ProgressBar value={goal.current} max={goal.target} compact />
    </li>
  );
}
