import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TODAY_EXERCISES, TRAINING_DAYS, HOME_DATA } from "@/lib/sample-data";

export default function TrainingPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Training" />

      <Card title="This Week">
        <div className="grid grid-cols-7 gap-2">
          {TRAINING_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`h-9 rounded-lg border text-[11px] font-semibold transition-colors ${
                day === "Tue"
                  ? "border-white/30 bg-white/12 text-white"
                  : "border-white/10 bg-black/20 text-zinc-500 hover:text-zinc-200"
              }`}
              aria-pressed={day === "Tue"}
            >
              {day}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Today&apos;s Workout">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-2xl font-semibold tracking-tight text-white">{HOME_DATA.workout.name}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Exercises</p>
              <p className="mt-1 text-lg font-semibold text-white">{HOME_DATA.workout.exercises}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Total Sets</p>
              <p className="mt-1 text-lg font-semibold text-white">{HOME_DATA.workout.totalSets}</p>
            </div>
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {TODAY_EXERCISES.map((exercise) => (
            <li
              key={exercise.name}
              className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{exercise.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {exercise.sets} sets • {exercise.reps} reps
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Continue Workout
        </button>
      </Card>
    </div>
  );
}
