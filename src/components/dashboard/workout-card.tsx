import { Dumbbell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

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
        <div className="rounded-[var(--ds-radius-md)] border border-white/10 bg-black/25 p-2">
          <Dumbbell className="h-4 w-4 text-[var(--ds-color-accent)]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-white">{workoutName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{exercises} exercises</Chip>
            <Chip>{totalSets} total sets</Chip>
          </div>
        </div>
      </div>
      {actionLabel ? (
        <Button type="button" variant="primary" className="mt-4 w-full">
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
