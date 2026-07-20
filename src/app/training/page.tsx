import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TODAY_EXERCISES, TRAINING_DAYS, HOME_DATA } from "@/lib/sample-data";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Training" subtitle="Structured sessions with simple exercise tracking." />

      <Card title="This Week" subtitle="Training-day selector">
        <div className="grid grid-cols-7 gap-2">
          {TRAINING_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                day === "Tue"
                  ? "border-white/25 bg-white/12 text-white"
                  : "border-white/10 bg-black/20 text-zinc-400 hover:text-zinc-200"
              }`}
              aria-pressed={day === "Tue"}
            >
              {day}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Today&apos;s Workout">
        <div className="mb-4">
          <p className="text-lg font-semibold text-white">{HOME_DATA.workout.name}</p>
          <p className="text-sm text-zinc-400">
            {HOME_DATA.workout.exercises} exercises • {HOME_DATA.workout.totalSets} total sets
          </p>
        </div>

        <ul className="space-y-3">
          {TODAY_EXERCISES.map((exercise) => (
            <li key={exercise.name} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                <p className="text-xs text-zinc-400">
                  {exercise.sets} sets • {exercise.reps} reps
                </p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#7ea0ff] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#93afff]"
        >
          Continue Workout
        </button>
      </Card>
    </div>
  );
}
