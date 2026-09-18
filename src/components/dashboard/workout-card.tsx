import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
import { StateChip } from "@/components/ui/state-chip";

interface WorkoutCardProps {
  workoutName: string;
  statusText: string;
  statusState?: "active" | "completed" | "planned" | "neutral";
  exercises: number | null;
  totalSets: number | null;
  actionLabel?: string;
  actionHref?: string;
}

export function WorkoutCard({
  workoutName,
  statusText,
  statusState = "neutral",
  exercises,
  totalSets,
  actionLabel,
  actionHref,
}: WorkoutCardProps) {
  return (
    <Card title="Today&apos;s Workout" variant="primary">
      <div className="flex items-start gap-2.5">
        <div className="rounded-lg border border-white/10 bg-black/35 p-2">
          <Dumbbell className="h-4 w-4 text-[#87a3ff]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-tight text-white">{workoutName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StateChip state={statusState} />
            <p className="text-sm text-zinc-400">{statusText}</p>
          </div>
          {exercises !== null && totalSets !== null ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <MetricValue value={String(exercises)} unit="exercises" tone="secondary" className="text-base" />
              <span>•</span>
              <MetricValue value={String(totalSets)} unit="sets" tone="secondary" className="text-base" />
            </div>
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
