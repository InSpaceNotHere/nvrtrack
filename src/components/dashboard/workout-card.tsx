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
  durationMinutes?: number | null;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function WorkoutCard({
  workoutName,
  statusText,
  statusState = "neutral",
  exercises,
  totalSets,
  durationMinutes = null,
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
}: WorkoutCardProps) {
  return (
    <Card title="Today&apos;s Workout" variant="primary">
      <div className="flex items-start gap-2">
        <div className="rounded-md border border-white/10 bg-black/35 p-1.5">
          <Dumbbell className="h-4 w-4 text-[#87a3ff]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold leading-tight text-white">{workoutName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <StateChip state={statusState} className="text-[10px]" />
            <p className="text-xs text-zinc-400">{statusText}</p>
          </div>
          {exercises !== null ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
              <MetricValue value={String(exercises)} unit="exercises" tone="secondary" className="text-sm" />
              {totalSets !== null ? (
                <>
                  <span>•</span>
                  <MetricValue value={String(totalSets)} unit="sets" tone="secondary" className="text-sm" />
                </>
              ) : null}
              {durationMinutes !== null ? <span>• ~{durationMinutes} min</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {actionLabel && actionHref ? (
        <div className="mt-2">
          <Link
            href={actionHref}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            {actionLabel}
          </Link>
          {secondaryActionLabel && secondaryActionHref ? (
            <div className="mt-1.5 text-right">
              <Link
                href={secondaryActionHref}
                className="text-[11px] font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-zinc-200"
              >
                {secondaryActionLabel}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
