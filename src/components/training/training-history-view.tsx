"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteWorkoutAction } from "@/app/(protected)/actions/training-actions";

export interface WorkoutHistoryItem {
  id: string;
  name: string;
  workoutDate: string;
  isCompleted: boolean;
  exerciseCount: number;
  completedSetCount: number;
  totalSetCount: number;
  totalVolume: number | null;
  durationMinutes: number | null;
}

interface TrainingHistoryViewProps {
  items: WorkoutHistoryItem[];
  displayUnit: "lb" | "kg";
  loadErrorMessage?: string | null;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatVolume(value: number | null, displayUnit: "lb" | "kg"): string {
  if (value === null) {
    return "--";
  }
  return `${value.toLocaleString()} ${displayUnit}`;
}

export function TrainingHistoryView({ items, displayUnit, loadErrorMessage }: TrainingHistoryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function handleDelete(workoutId: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteWorkoutAction(workoutId);
      if (result.status === "success") {
        setTone("success");
        setMessage(result.message);
        setDeleteConfirmId(null);
        router.refresh();
        return;
      }

      setTone("error");
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {loadErrorMessage ? (
        <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {loadErrorMessage}
        </p>
      ) : null}

      {!items.length ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
          <p className="text-sm font-medium text-zinc-200">No workouts logged yet.</p>
          <p className="mt-1 text-sm text-zinc-500">Start your first workout to build training history.</p>
          <Link
            href="/training/start"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Start Workout
          </Link>
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{formatDate(item.workoutDate)}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {item.isCompleted ? "Completed" : "In progress"} • {item.exerciseCount} exercises •{" "}
                  {item.completedSetCount}/{item.totalSetCount} sets completed
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Volume {formatVolume(item.totalVolume, displayUnit)}
                  {item.durationMinutes !== null ? ` • ${item.durationMinutes} min` : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/training/workouts/${item.id}`}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                >
                  Open
                </Link>
                {deleteConfirmId === item.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2.5 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                    >
                      {isPending ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/15"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

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
    </div>
  );
}
