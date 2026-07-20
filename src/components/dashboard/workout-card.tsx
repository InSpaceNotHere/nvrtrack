import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { Card } from "@/components/ui/card";

interface WorkoutCardProps {
  workoutName: string;
  statusText: string;
  exercises: number | null;
  totalSets: number | null;
  actionLabel?: string;
  actionHref?: string;
}

export function WorkoutCard({
  workoutName,
  statusText,
  exercises,
  totalSets,
  actionLabel,
  actionHref,
}: WorkoutCardProps) {
  return (
    <Card title="Today&apos;s Workout">
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg border border-white/10 bg-black/35 p-2">
          <Dumbbell className="h-4 w-4 text-[#87a3ff]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-tight text-white">{workoutName}</p>
          <p className="mt-1 text-sm text-zinc-400">{statusText}</p>
          {exercises !== null && totalSets !== null ? (
            <p className="mt-1 text-xs text-zinc-500">
              {exercises} exercises • {totalSets} total sets
            </p>
          ) : null}
        </div>
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          {actionLabel}
        </Link>
      ) : null}
    </Card>
  );
}
