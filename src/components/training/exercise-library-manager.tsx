"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createExerciseAction,
  deleteExerciseAction,
  updateExerciseAction,
} from "@/app/(protected)/actions/training-actions";
import type { ExerciseRow } from "@/lib/data/auth-context";

interface ExerciseLibraryManagerProps {
  exercises: ExerciseRow[];
  lastUsedByExerciseId: Record<string, string | null>;
  loadErrorMessage?: string | null;
}

interface ExerciseDraft {
  name: string;
  muscle_group: string;
  equipment: string;
  notes: string;
}

function formatLastUsed(date: string | null): string {
  if (!date) {
    return "Never used";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function toDraft(exercise?: ExerciseRow | null): ExerciseDraft {
  return {
    name: exercise?.name ?? "",
    muscle_group: exercise?.muscle_group ?? "",
    equipment: exercise?.equipment ?? "",
    notes: exercise?.notes ?? "",
  };
}

export function ExerciseLibraryManager({
  exercises,
  lastUsedByExerciseId,
  loadErrorMessage,
}: ExerciseLibraryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [search, setSearch] = useState("");
  const [createDraft, setCreateDraft] = useState<ExerciseDraft>(toDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ExerciseDraft>(toDraft());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return exercises;
    }

    return exercises.filter((exercise) => {
      const haystack = `${exercise.name} ${exercise.muscle_group ?? ""} ${exercise.equipment ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [exercises, search]);

  function setSuccessMessage(text: string) {
    setTone("success");
    setMessage(text);
  }

  function setErrorMessage(text: string) {
    setTone("error");
    setMessage(text);
  }

  function handleCreate() {
    setMessage(null);
    startTransition(async () => {
      const result = await createExerciseAction({
        name: createDraft.name,
        muscle_group: createDraft.muscle_group,
        equipment: createDraft.equipment,
        notes: createDraft.notes,
      });

      if (result.status === "success") {
        setCreateDraft(toDraft());
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function beginEdit(exercise: ExerciseRow) {
    setEditingId(exercise.id);
    setEditDraft(toDraft(exercise));
  }

  function handleSaveEdit(exerciseId: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await updateExerciseAction(exerciseId, {
        name: editDraft.name,
        muscle_group: editDraft.muscle_group,
        equipment: editDraft.equipment,
        notes: editDraft.notes,
      });
      if (result.status === "success") {
        setEditingId(null);
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function handleDelete(exerciseId: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteExerciseAction(exerciseId);
      if (result.status === "success") {
        setDeleteConfirmId(null);
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {loadErrorMessage ? (
        <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {loadErrorMessage}
        </p>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-white">Create Exercise</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Reusable exercise for future workouts.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Name</span>
            <input
              value={createDraft.name}
              onChange={(event) => setCreateDraft((state) => ({ ...state, name: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Muscle group (optional)</span>
            <input
              value={createDraft.muscle_group}
              onChange={(event) => setCreateDraft((state) => ({ ...state, muscle_group: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Equipment (optional)</span>
            <input
              value={createDraft.equipment}
              onChange={(event) => setCreateDraft((state) => ({ ...state, equipment: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Notes (optional)</span>
            <textarea
              value={createDraft.notes}
              onChange={(event) => setCreateDraft((state) => ({ ...state, notes: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Saving..." : "Create Exercise"}
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Exercise Library</h3>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exercises"
            className="h-9 min-w-52 rounded-lg border border-white/12 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
            aria-label="Search exercise library"
          />
        </div>

        {!filteredExercises.length ? (
          <p className="mt-3 text-sm text-zinc-500">No exercises found.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filteredExercises.map((exercise) => {
              const isEditing = editingId === exercise.id;

              return (
                <li key={exercise.id} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                  {isEditing ? (
                    <div className="space-y-2">
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Name</span>
                        <input
                          value={editDraft.name}
                          onChange={(event) => setEditDraft((state) => ({ ...state, name: event.target.value }))}
                          className="app-input"
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1 text-xs text-zinc-300">
                          <span>Muscle group</span>
                          <input
                            value={editDraft.muscle_group}
                            onChange={(event) =>
                              setEditDraft((state) => ({ ...state, muscle_group: event.target.value }))
                            }
                            className="app-input"
                          />
                        </label>
                        <label className="space-y-1 text-xs text-zinc-300">
                          <span>Equipment</span>
                          <input
                            value={editDraft.equipment}
                            onChange={(event) => setEditDraft((state) => ({ ...state, equipment: event.target.value }))}
                            className="app-input"
                          />
                        </label>
                      </div>
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Notes</span>
                        <textarea
                          value={editDraft.notes}
                          onChange={(event) => setEditDraft((state) => ({ ...state, notes: event.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(exercise.id)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center justify-center rounded-md bg-white px-2.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                        >
                          {isPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{exercise.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {exercise.muscle_group || "No muscle group"} • {exercise.equipment || "No equipment"}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">Last used: {formatLastUsed(lastUsedByExerciseId[exercise.id] ?? null)}</p>
                        {exercise.notes ? <p className="mt-1 text-xs text-zinc-500">{exercise.notes}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(exercise)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                        >
                          Edit
                        </button>
                        {deleteConfirmId === exercise.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDelete(exercise.id)}
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
                            onClick={() => setDeleteConfirmId(exercise.id)}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2.5 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        Deleting an exercise detaches future selection from this library item. Historical workout snapshots stay intact.
      </p>

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
