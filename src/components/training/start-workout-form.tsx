"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { startWorkoutAction } from "@/app/(protected)/actions/training-actions";

interface StartWorkoutFormProps {
  initialName: string;
  initialDate: string;
}

export function StartWorkoutForm({ initialName, initialDate }: StartWorkoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [workoutDate, setWorkoutDate] = useState(initialDate);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors({});

    startTransition(async () => {
      const result = await startWorkoutAction({
        name,
        workout_date: workoutDate,
        notes,
      });

      if (result.status === "success" && result.workout) {
        setTone("success");
        setMessage(result.message);
        router.push(`/training/workouts/${result.workout.id}`);
        return;
      }

      setTone("error");
      setMessage(result.message);
      setErrors(result.errors);
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="space-y-1.5 text-sm text-zinc-300">
        <span>Workout name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="app-input"
          maxLength={120}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="text-xs text-rose-300">{errors.name}</p> : null}
      </label>

      <label className="space-y-1.5 text-sm text-zinc-300">
        <span>Workout date</span>
        <input
          type="date"
          value={workoutDate}
          onChange={(event) => setWorkoutDate(event.target.value)}
          className="app-input"
          aria-invalid={Boolean(errors.workout_date)}
        />
        {errors.workout_date ? <p className="text-xs text-rose-300">{errors.workout_date}</p> : null}
      </label>

      <label className="space-y-1.5 text-sm text-zinc-300">
        <span>Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
          rows={4}
          maxLength={2000}
        />
        {errors.notes ? <p className="text-xs text-rose-300">{errors.notes}</p> : null}
      </label>

      {message ? (
        <p
          role={tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-lg px-3 py-2 text-sm ${
            tone === "error"
              ? "border border-rose-400/35 bg-rose-500/10 text-rose-200"
              : "border border-accent/40 bg-accent/10 text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isPending ? "Starting..." : "Start Workout"}
      </button>
    </form>
  );
}
