"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { startWorkoutAction } from "@/app/(protected)/actions/training-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";

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
        <Input
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
        <DatePicker value={workoutDate} onChange={(event) => setWorkoutDate(event.target.value)} className="app-input" aria-invalid={Boolean(errors.workout_date)} />
        {errors.workout_date ? <p className="text-xs text-rose-300">{errors.workout_date}</p> : null}
      </label>

      <label className="space-y-1.5 text-sm text-zinc-300">
        <span>Notes (optional)</span>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="text-sm"
          rows={4}
          maxLength={2000}
        />
        {errors.notes ? <p className="text-xs text-rose-300">{errors.notes}</p> : null}
      </label>

      {message ? <Toast tone={tone === "error" ? "error" : "success"} role={tone === "error" ? "alert" : "status"}>{message}</Toast> : null}

      <Button
        type="submit"
        disabled={isPending}
        variant="primary"
        className="h-10 w-full rounded-xl text-sm"
      >
        {isPending ? "Starting..." : "Start Workout"}
      </Button>
    </form>
  );
}
