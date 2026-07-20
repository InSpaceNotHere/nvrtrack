import { Dumbbell } from "lucide-react";

import { Card } from "@/components/ui/card";

interface WorkoutCardProps {
  workoutName: string;
  exercises: number;
  totalSets: number;
  actionLabel?: string;
}

export function WorkoutCard({ workoutName, exercises, totalSets, actionLabel }: WorkoutCardProps) {
  return (
    <Card title="Today&apos;s Workout">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
          <Dumbbell className="h-5 w-5 text-[#7ea0ff]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{workoutName}</p>
          <p className="text-sm text-zinc-400">
            {exercises} exercises • {totalSets} total sets
          </p>
        </div>
      </div>
      {actionLabel ? (
        <button
          type="button"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
        >
          {actionLabel}
        </button>
      ) : null}
    </Card>
  );
}
