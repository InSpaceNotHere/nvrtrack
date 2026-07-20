import { ProgressBar } from "@/components/ui/progress-bar";
import type { StrengthGoal } from "@/types/fitness";

interface GoalProgressRowProps {
  goal: StrengthGoal;
}

export function GoalProgressRow({ goal }: GoalProgressRowProps) {
  return (
    <li className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-100">{goal.lift}</p>
        <p className="text-sm text-zinc-300">
          {goal.current} of {goal.target} {goal.unit}
        </p>
      </div>
      <ProgressBar value={goal.current} max={goal.target} compact />
    </li>
  );
}
