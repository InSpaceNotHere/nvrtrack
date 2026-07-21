"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createExerciseAction,
  deleteExerciseAction,
  updateExerciseAction,
} from "@/app/(protected)/actions/training-actions";
import {
  BODY_REGIONS,
  MOVEMENT_PATTERNS,
  MUSCLE_TAXONOMY,
  getBodyRegionLabel,
  getMovementPatternLabel,
  getMuscleLabel,
  isMuscleId,
  mapLegacyMuscleGroupToPrimaryMuscles,
} from "@/lib/training/muscles";
import type { ExerciseRow } from "@/lib/training/types";

interface CustomExerciseManagerProps {
  exercises: ExerciseRow[];
}

interface ExerciseEditorState {
  name: string;
  equipment: string;
  notes: string;
  body_region: string;
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles: string[];
}

function toEditorState(exercise?: ExerciseRow | null): ExerciseEditorState {
  const legacyPrimary = mapLegacyMuscleGroupToPrimaryMuscles(exercise?.muscle_group);
  return {
    name: exercise?.name ?? "",
    equipment: exercise?.equipment ?? "",
    notes: exercise?.notes ?? "",
    body_region: exercise?.body_region ?? "",
    movement_pattern: exercise?.movement_pattern ?? "",
    primary_muscles: exercise?.primary_muscles?.length ? exercise.primary_muscles : legacyPrimary,
    secondary_muscles: exercise?.secondary_muscles ?? [],
  };
}

function formatMuscleList(muscles: string[]): string {
  if (!muscles.length) {
    return "Unavailable";
  }
  return muscles
    .map((muscle) => (isMuscleId(muscle) ? getMuscleLabel(muscle) : titleCase(muscle)))
    .join(", ");
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function MuscleCheckboxGrid({
  title,
  selected,
  onToggle,
}: {
  title: string;
  selected: string[];
  onToggle: (muscle: string) => void;
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs text-zinc-300">{title}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {MUSCLE_TAXONOMY.map((muscle) => (
          <label key={muscle} className="inline-flex items-center gap-2 text-xs text-zinc-200">
            <input
              type="checkbox"
              checked={selected.includes(muscle)}
              onChange={() => onToggle(muscle)}
              className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"
            />
            <span>{getMuscleLabel(muscle)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CustomExerciseManager({ exercises }: CustomExerciseManagerProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<ExerciseEditorState>(toEditorState());
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExerciseEditorState>(toEditorState());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  function toggleMuscle(selected: string[], muscle: string): string[] {
    return selected.includes(muscle) ? selected.filter((item) => item !== muscle) : [...selected, muscle];
  }

  function updateCreateForm(next: Partial<ExerciseEditorState>) {
    setCreateForm((current) => ({ ...current, ...next }));
  }

  function updateEditForm(next: Partial<ExerciseEditorState>) {
    setEditForm((current) => ({ ...current, ...next }));
  }

  function startEdit(exerciseId: string) {
    const exercise = exerciseById.get(exerciseId);
    setEditingExerciseId(exerciseId);
    setEditForm(toEditorState(exercise));
    setFeedback(null);
    setErrorMessage(null);
  }

  function submitCreateForm() {
    setFeedback(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createExerciseAction({
        name: createForm.name,
        equipment: createForm.equipment || undefined,
        notes: createForm.notes || undefined,
        body_region: createForm.body_region || undefined,
        movement_pattern: createForm.movement_pattern || undefined,
        primary_muscles: createForm.primary_muscles,
        secondary_muscles: createForm.secondary_muscles,
      });

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      setCreateForm(toEditorState());
      setFeedback("Custom exercise created.");
      router.refresh();
    });
  }

  function submitEditForm(exerciseId: string) {
    setFeedback(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateExerciseAction(exerciseId, {
        name: editForm.name,
        equipment: editForm.equipment || undefined,
        notes: editForm.notes || undefined,
        body_region: editForm.body_region || undefined,
        movement_pattern: editForm.movement_pattern || undefined,
        primary_muscles: editForm.primary_muscles,
        secondary_muscles: editForm.secondary_muscles,
      });

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      setEditingExerciseId(null);
      setFeedback("Custom exercise updated.");
      router.refresh();
    });
  }

  function removeExercise(exerciseId: string) {
    setFeedback(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteExerciseAction(exerciseId);
      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }
      if (editingExerciseId === exerciseId) {
        setEditingExerciseId(null);
      }
      setFeedback("Custom exercise deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {feedback ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{feedback}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{errorMessage}</p> : null}

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-white">Create Custom Exercise</h3>
        <p className="mt-1 text-xs text-zinc-500">New custom exercises require at least one primary muscle.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Name</span>
            <input
              className="app-input"
              value={createForm.name}
              onChange={(event) => updateCreateForm({ name: event.target.value })}
              placeholder="e.g. Deficit Push-Up"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Equipment</span>
            <input className="app-input" value={createForm.equipment} onChange={(event) => updateCreateForm({ equipment: event.target.value })} />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Body region</span>
            <select className="app-input" value={createForm.body_region} onChange={(event) => updateCreateForm({ body_region: event.target.value })}>
              <option value="">Unspecified</option>
              {BODY_REGIONS.map((bodyRegion) => (
                <option key={bodyRegion} value={bodyRegion}>
                  {getBodyRegionLabel(bodyRegion)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Movement pattern</span>
            <select
              className="app-input"
              value={createForm.movement_pattern}
              onChange={(event) => updateCreateForm({ movement_pattern: event.target.value })}
            >
              <option value="">Unspecified</option>
              {MOVEMENT_PATTERNS.map((movementPattern) => (
                <option key={movementPattern} value={movementPattern}>
                  {getMovementPatternLabel(movementPattern)}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <MuscleCheckboxGrid
              title="Primary muscles"
              selected={createForm.primary_muscles}
              onToggle={(muscle) => updateCreateForm({ primary_muscles: toggleMuscle(createForm.primary_muscles, muscle) })}
            />
          </div>
          <div className="sm:col-span-2">
            <MuscleCheckboxGrid
              title="Secondary muscles"
              selected={createForm.secondary_muscles}
              onToggle={(muscle) => updateCreateForm({ secondary_muscles: toggleMuscle(createForm.secondary_muscles, muscle) })}
            />
          </div>
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Notes</span>
            <textarea className="app-input min-h-[72px]" value={createForm.notes} onChange={(event) => updateCreateForm({ notes: event.target.value })} />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={submitCreateForm}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
        >
          Create custom exercise
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-white">My Custom Exercises</h3>
        <ul className="mt-2 space-y-2">
          {exercises.length ? (
            exercises.map((exercise) => {
              const isEditing = editingExerciseId === exercise.id;
              return (
                <li key={exercise.id} className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                  {!isEditing ? (
                    <>
                      <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Primary:{" "}
                        {formatMuscleList(
                          exercise.primary_muscles?.length
                            ? exercise.primary_muscles
                            : mapLegacyMuscleGroupToPrimaryMuscles(exercise.muscle_group),
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">Secondary: {formatMuscleList(exercise.secondary_muscles ?? [])}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {(exercise.body_region ? titleCase(exercise.body_region) : "Unspecified region")} •{" "}
                        {(exercise.movement_pattern ? titleCase(exercise.movement_pattern) : "Unspecified pattern")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => startEdit(exercise.id)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => removeExercise(exercise.id)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-400/30 px-3 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Name</span>
                        <input className="app-input" value={editForm.name} onChange={(event) => updateEditForm({ name: event.target.value })} />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Equipment</span>
                        <input className="app-input" value={editForm.equipment} onChange={(event) => updateEditForm({ equipment: event.target.value })} />
                      </label>
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Body region</span>
                        <select className="app-input" value={editForm.body_region} onChange={(event) => updateEditForm({ body_region: event.target.value })}>
                          <option value="">Unspecified</option>
                          {BODY_REGIONS.map((bodyRegion) => (
                            <option key={bodyRegion} value={bodyRegion}>
                              {getBodyRegionLabel(bodyRegion)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Movement pattern</span>
                        <select
                          className="app-input"
                          value={editForm.movement_pattern}
                          onChange={(event) => updateEditForm({ movement_pattern: event.target.value })}
                        >
                          <option value="">Unspecified</option>
                          {MOVEMENT_PATTERNS.map((movementPattern) => (
                            <option key={movementPattern} value={movementPattern}>
                              {getMovementPatternLabel(movementPattern)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <MuscleCheckboxGrid
                        title="Primary muscles"
                        selected={editForm.primary_muscles}
                        onToggle={(muscle) => updateEditForm({ primary_muscles: toggleMuscle(editForm.primary_muscles, muscle) })}
                      />
                      <MuscleCheckboxGrid
                        title="Secondary muscles"
                        selected={editForm.secondary_muscles}
                        onToggle={(muscle) => updateEditForm({ secondary_muscles: toggleMuscle(editForm.secondary_muscles, muscle) })}
                      />
                      <label className="space-y-1 text-xs text-zinc-300">
                        <span>Notes</span>
                        <textarea className="app-input min-h-[72px]" value={editForm.notes} onChange={(event) => updateEditForm({ notes: event.target.value })} />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => submitEditForm(exercise.id)}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setEditingExerciseId(null)}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })
          ) : (
            <li className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-500">
              No custom exercises yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
