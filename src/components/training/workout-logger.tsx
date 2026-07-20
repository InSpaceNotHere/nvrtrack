"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addCatalogExerciseToWorkoutAction,
  addCustomExerciseToWorkoutAction,
  addUserExerciseToWorkoutAction,
  addWorkoutSetAction,
  completeWorkoutAction,
  createExerciseAndAddToWorkoutAction,
  deleteWorkoutAction,
  deleteWorkoutSetAction,
  duplicateWorkoutSetAction,
  moveWorkoutExerciseAction,
  moveWorkoutSetAction,
  removeWorkoutExerciseAction,
  updateWorkoutMetadataAction,
  updateWorkoutSetAction,
} from "@/app/(protected)/actions/training-actions";
import type { ExerciseRow } from "@/lib/data/auth-context";
import type { ExerciseCatalogRow } from "@/lib/data/exercise-catalog";
import { filterCatalogExercises, buildCatalogFacets } from "@/lib/training/catalog";
import {
  calculateExerciseVolume,
  evaluatePersonalRecordCandidate,
  estimateSetOneRepMax,
} from "@/lib/training/calculations";
import type { TrainingWeightUnit, WorkoutSetLike, WorkoutSetRow } from "@/lib/training/types";

type ComposerMode = "catalog" | "custom";

interface SetDraft {
  set_type: string;
  weight: string;
  weight_unit: string;
  reps: string;
  rpe: string;
  notes: string;
  is_completed: boolean;
}

interface WorkoutLoggerExercise {
  id: string;
  exerciseId: string | null;
  catalogExerciseId: string | null;
  exerciseName: string;
  notes: string | null;
  position: number;
  sets: WorkoutSetRow[];
  previousPerformance: {
    latestWorkoutDate: string | null;
    latestCompletedSets: WorkoutSetRow[];
    previousBestEstimatedOneRepMax: number | null;
    comparableHistoricalSets: WorkoutSetLike[];
  };
}

interface WorkoutLoggerSummary {
  exerciseCount: number;
  totalSetCount: number;
  completedSetCount: number;
  totalVolume: number | null;
  bestEstimatedOneRepMax: number | null;
  potentialPrCount: number;
  durationMinutes: number | null;
}

interface WorkoutLoggerProps {
  workout: {
    id: string;
    name: string;
    workoutDate: string;
    startedAt: string | null;
    completedAt: string | null;
    notes: string | null;
  };
  displayUnit: TrainingWeightUnit;
  preferredWeightUnit: TrainingWeightUnit;
  exercises: WorkoutLoggerExercise[];
  catalogExercises: ExerciseCatalogRow[];
  recentCatalogExerciseIds: string[];
  customExercises: ExerciseRow[];
  summary: WorkoutLoggerSummary;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatDateTime(timestamp: string | null): string {
  if (!timestamp) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDurationMinutes(startedAt: string | null): string {
  if (!startedAt) {
    return "--";
  }

  const startedMs = Date.parse(startedAt);
  if (Number.isNaN(startedMs)) {
    return "--";
  }
  const minutes = Math.max(1, Math.floor((Date.now() - startedMs) / 60000));
  return `${minutes} min elapsed`;
}

function toSetDraft(set: WorkoutSetRow): SetDraft {
  return {
    set_type: set.set_type,
    weight: set.weight === null ? "" : String(set.weight),
    weight_unit: set.weight_unit ?? "",
    reps: set.reps === null ? "" : String(set.reps),
    rpe: set.rpe === null ? "" : String(set.rpe),
    notes: set.notes ?? "",
    is_completed: set.is_completed,
  };
}

function formatSetLine(set: WorkoutSetRow): string {
  const weight = set.weight === null ? "--" : set.weight;
  const unit = set.weight_unit ?? "";
  const reps = set.reps === null ? "--" : set.reps;
  return `${weight}${unit ? ` ${unit}` : ""} × ${reps}`;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function WorkoutLogger({
  workout,
  displayUnit,
  preferredWeightUnit,
  exercises,
  catalogExercises,
  recentCatalogExerciseIds,
  customExercises,
  summary,
}: WorkoutLoggerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  const [workoutName, setWorkoutName] = useState(workout.name);
  const [workoutDate, setWorkoutDate] = useState(workout.workoutDate);
  const [workoutNotes, setWorkoutNotes] = useState(workout.notes ?? "");
  const [optimisticExercises, setOptimisticExercises] = useState<WorkoutLoggerExercise[]>([]);

  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>(() =>
    Object.fromEntries(
      exercises.flatMap((exercise) => exercise.sets.map((set) => [set.id, toSetDraft(set)])),
    ),
  );
  const [deleteSetConfirmId, setDeleteSetConfirmId] = useState<string | null>(null);
  const [deleteExerciseConfirmId, setDeleteExerciseConfirmId] = useState<string | null>(null);
  const [deleteWorkoutConfirm, setDeleteWorkoutConfirm] = useState(false);
  const [needsCompleteConfirm, setNeedsCompleteConfirm] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [selectedCatalogExerciseId, setSelectedCatalogExerciseId] = useState<string | null>(null);
  const [exerciseNotesDraft, setExerciseNotesDraft] = useState("");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [selectedCustomExerciseId, setSelectedCustomExerciseId] = useState<string | null>(customExercises[0]?.id ?? null);
  const [saveCustomToLibrary, setSaveCustomToLibrary] = useState(true);

  const isCompletedWorkout = Boolean(workout.completedAt);
  const facets = useMemo(() => buildCatalogFacets(catalogExercises), [catalogExercises]);
  const filteredCatalogExercises = useMemo(
    () =>
      filterCatalogExercises(catalogExercises, {
        query: catalogSearch,
        muscle: muscleFilter,
        equipment: equipmentFilter,
      }),
    [catalogExercises, catalogSearch, muscleFilter, equipmentFilter],
  );
  const recentCatalogExercises = useMemo(() => {
    const byId = new Map(catalogExercises.map((exercise) => [exercise.id, exercise]));
    return recentCatalogExerciseIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseCatalogRow[];
  }, [catalogExercises, recentCatalogExerciseIds]);
  const selectedCatalogExercise = useMemo(
    () =>
      selectedCatalogExerciseId
        ? catalogExercises.find((exercise) => exercise.id === selectedCatalogExerciseId) ?? null
        : null,
    [catalogExercises, selectedCatalogExerciseId],
  );
  const displayExercises = useMemo(() => {
    const byId = new Map<string, WorkoutLoggerExercise>();
    for (const exercise of exercises) {
      byId.set(exercise.id, exercise);
    }
    for (const exercise of optimisticExercises) {
      if (!byId.has(exercise.id)) {
        byId.set(exercise.id, exercise);
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.position - b.position);
  }, [exercises, optimisticExercises]);

  function setSuccessMessage(text: string) {
    setTone("success");
    setMessage(text);
  }

  function setErrorMessage(text: string) {
    setTone("error");
    setMessage(text);
  }

  function resetComposerState() {
    setCatalogSearch("");
    setMuscleFilter("");
    setEquipmentFilter("");
    setSelectedCatalogExerciseId(null);
    setExerciseNotesDraft("");
    setCustomExerciseName("");
    setSelectedCustomExerciseId(customExercises[0]?.id ?? null);
    setSaveCustomToLibrary(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    resetComposerState();
  }

  function getDraft(set: WorkoutSetRow): SetDraft {
    return (
      setDrafts[set.id] ?? {
        ...toSetDraft(set),
        weight_unit: set.weight_unit ?? preferredWeightUnit,
      }
    );
  }

  function updateSetDraft(setId: string, patch: Partial<SetDraft>) {
    setSetDrafts((current) => ({
      ...current,
      [setId]: {
        ...(current[setId] ?? {
          set_type: "working",
          weight: "",
          weight_unit: preferredWeightUnit,
          reps: "",
          rpe: "",
          notes: "",
          is_completed: false,
        }),
        ...patch,
      },
    }));
  }

  function saveWorkoutMetadata() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateWorkoutMetadataAction(workout.id, {
        name: workoutName,
        workout_date: workoutDate,
        notes: workoutNotes,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function handleAddCatalogExercise() {
    if (!selectedCatalogExerciseId) {
      setErrorMessage("Select a catalog exercise first.");
      return;
    }
    const selectedExercise =
      catalogExercises.find((exercise) => exercise.id === selectedCatalogExerciseId) ?? null;
    if (!selectedExercise) {
      setErrorMessage("Selected catalog exercise is unavailable.");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await addCatalogExerciseToWorkoutAction(workout.id, {
        catalogExerciseId: selectedCatalogExerciseId,
        notes: exerciseNotesDraft,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        const addedWorkoutExercise = result.workoutExercise;
        if (addedWorkoutExercise) {
          setOptimisticExercises((current) => {
            if (current.some((exercise) => exercise.id === addedWorkoutExercise.id)) {
              return current;
            }

            return [
              ...current,
              {
                id: addedWorkoutExercise.id,
                exerciseId: addedWorkoutExercise.exercise_id,
                catalogExerciseId: addedWorkoutExercise.catalog_exercise_id,
                exerciseName: addedWorkoutExercise.exercise_name,
                notes: addedWorkoutExercise.notes,
                position: addedWorkoutExercise.position,
                sets: [],
                previousPerformance: {
                  latestWorkoutDate: null,
                  latestCompletedSets: [],
                  previousBestEstimatedOneRepMax: null,
                  comparableHistoricalSets: [],
                },
              },
            ].sort((a, b) => a.position - b.position);
          });
        }
        closeComposer();
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function handleAddCustomExercise() {
    setMessage(null);
    startTransition(async () => {
      if (selectedCustomExerciseId) {
        const selectedCustom = customExercises.find((exercise) => exercise.id === selectedCustomExerciseId);
        if (!selectedCustom) {
          setErrorMessage("Selected custom exercise is unavailable.");
          return;
        }
        const resultFromSavedCustom = await addUserExerciseToWorkoutAction(workout.id, {
          exerciseId: selectedCustom.id,
          notes: exerciseNotesDraft || selectedCustom.notes || undefined,
        });
        if (resultFromSavedCustom.status === "success") {
          setSuccessMessage(resultFromSavedCustom.message);
          closeComposer();
          router.refresh();
          return;
        }
        setErrorMessage(resultFromSavedCustom.message);
        return;
      }

      if (saveCustomToLibrary && customExerciseName.trim()) {
        const resultFromCreate = await createExerciseAndAddToWorkoutAction(workout.id, {
          name: customExerciseName,
          notes: exerciseNotesDraft,
          workoutExerciseNotes: exerciseNotesDraft,
        });
        if (resultFromCreate.status === "success") {
          setSuccessMessage("Custom exercise created and added.");
          closeComposer();
          router.refresh();
          return;
        }

        setErrorMessage(resultFromCreate.message);
        return;
      }

      const result = await addCustomExerciseToWorkoutAction(workout.id, {
        exerciseName: customExerciseName,
        notes: exerciseNotesDraft,
      });

      if (result.status === "success") {
        setSuccessMessage(result.message);
        closeComposer();
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function addSet(exerciseId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await addWorkoutSetAction(workout.id, exerciseId, {
        set_type: "working",
        is_completed: false,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function duplicateSet(exerciseId: string, setId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await duplicateWorkoutSetAction(workout.id, exerciseId, setId);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
    });
  }

  function saveSet(setId: string) {
    const draft = setDrafts[setId];
    if (!draft) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await updateWorkoutSetAction(workout.id, setId, {
        set_type: draft.set_type,
        weight: draft.weight,
        weight_unit: draft.weight.trim() ? draft.weight_unit : "",
        reps: draft.reps,
        rpe: draft.rpe,
        notes: draft.notes,
        is_completed: draft.is_completed,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function toggleSetCompleted(set: WorkoutSetRow, nextChecked: boolean) {
    updateSetDraft(set.id, { is_completed: nextChecked });

    const draft = {
      ...(setDrafts[set.id] ?? toSetDraft(set)),
      is_completed: nextChecked,
    };

    setMessage(null);
    startTransition(async () => {
      const result = await updateWorkoutSetAction(workout.id, set.id, {
        set_type: draft.set_type,
        weight: draft.weight,
        weight_unit: draft.weight.trim() ? draft.weight_unit : "",
        reps: draft.reps,
        rpe: draft.rpe,
        notes: draft.notes,
        is_completed: draft.is_completed,
      });
      if (result.status === "success") {
        setSuccessMessage(nextChecked ? "Set marked complete." : "Set marked incomplete.");
        router.refresh();
        return;
      }

      updateSetDraft(set.id, { is_completed: set.is_completed });
      setErrorMessage(result.message);
    });
  }

  function moveSet(exerciseId: string, setId: string, direction: "up" | "down") {
    setMessage(null);
    startTransition(async () => {
      const result = await moveWorkoutSetAction(workout.id, exerciseId, setId, direction);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function deleteSet(exerciseId: string, setId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteWorkoutSetAction(workout.id, exerciseId, setId);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setDeleteSetConfirmId(null);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function moveExercise(workoutExerciseId: string, direction: "up" | "down") {
    setMessage(null);
    startTransition(async () => {
      const result = await moveWorkoutExerciseAction(workout.id, workoutExerciseId, direction);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function removeExercise(workoutExerciseId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await removeWorkoutExerciseAction(workout.id, workoutExerciseId);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setDeleteExerciseConfirmId(null);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function completeWorkout(forceWithoutMeaningfulSet: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await completeWorkoutAction(workout.id, {
        notes: workoutNotes,
        forceWithoutMeaningfulSet,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setNeedsCompleteConfirm(false);
        router.push(`/training/workouts/${workout.id}?view=summary`);
        router.refresh();
        return;
      }

      if (result.requiresConfirmation) {
        setNeedsCompleteConfirm(true);
      }
      setErrorMessage(result.message);
    });
  }

  function deleteWorkout() {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteWorkoutAction(workout.id);
      if (result.status === "success") {
        router.push("/training");
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/training"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          Back to Training
        </Link>
        <Link
          href="/training/history"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          History
        </Link>
      </div>

      <section className="rounded-[1.1rem] border border-white/10 bg-[#101215] p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              {isCompletedWorkout ? "Workout Summary" : "Active Workout"}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-white">{workout.name}</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatDate(workout.workoutDate)} • Started {formatDateTime(workout.startedAt)}
            </p>
            {!isCompletedWorkout ? <p className="mt-0.5 text-xs text-zinc-500">{formatDurationMinutes(workout.startedAt)}</p> : null}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Volume</p>
            <p className="text-sm font-semibold text-zinc-100">
              {summary.totalVolume === null ? "--" : `${summary.totalVolume.toLocaleString()} ${displayUnit}`}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {summary.completedSetCount}/{summary.totalSetCount} sets complete
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <p className="uppercase tracking-[0.08em] text-zinc-500">Exercises</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{summary.exerciseCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <p className="uppercase tracking-[0.08em] text-zinc-500">Completed Sets</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{summary.completedSetCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <p className="uppercase tracking-[0.08em] text-zinc-500">Best Est. 1RM</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              {summary.bestEstimatedOneRepMax === null
                ? "--"
                : `${summary.bestEstimatedOneRepMax.toLocaleString()} ${displayUnit}`}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <p className="uppercase tracking-[0.08em] text-zinc-500">Potential PRs</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{summary.potentialPrCount}</p>
            {summary.durationMinutes !== null ? <p className="mt-0.5 text-[10px] text-zinc-500">{summary.durationMinutes} min</p> : null}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Workout name</span>
            <input
              value={workoutName}
              onChange={(event) => setWorkoutName(event.target.value)}
              className="app-input"
              disabled={isPending || isCompletedWorkout}
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Workout date</span>
            <input
              type="date"
              value={workoutDate}
              onChange={(event) => setWorkoutDate(event.target.value)}
              className="app-input"
              disabled={isPending || isCompletedWorkout}
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
            <span>Notes</span>
            <textarea
              value={workoutNotes}
              onChange={(event) => setWorkoutNotes(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
              disabled={isPending || isCompletedWorkout}
            />
          </label>
        </div>

        {!isCompletedWorkout ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveWorkoutMetadata}
              disabled={isPending}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-70"
            >
              {isPending ? "Saving..." : "Save Details"}
            </button>
            {!needsCompleteConfirm ? (
              <button
                type="button"
                onClick={() => completeWorkout(false)}
                disabled={isPending}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-70"
              >
                {isPending ? "Completing..." : "Complete Workout"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => completeWorkout(true)}
                disabled={isPending}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300/40 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-500/15"
              >
                Confirm Complete Without Sets
              </button>
            )}
            {deleteWorkoutConfirm ? (
              <>
                <button
                  type="button"
                  onClick={deleteWorkout}
                  disabled={isPending}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-400/40 px-3 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                >
                  {isPending ? "Deleting..." : "Confirm Delete Workout"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteWorkoutConfirm(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-100 hover:bg-white/10"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteWorkoutConfirm(true)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-400/40 px-3 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
              >
                Delete Workout
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            This workout is completed and shown as a read-only summary.
          </p>
        )}
      </section>

      {!isCompletedWorkout ? (
        <section data-testid="add-exercise-panel" className="rounded-[1.1rem] border border-white/10 bg-[#101215] p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-[0.09em] text-zinc-300">Add Exercise</h2>
            <button
              type="button"
              onClick={() => {
                if (composerOpen) {
                  closeComposer();
                  return;
                }
                setComposerOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
            >
              {composerOpen ? "Close" : "Open"}
            </button>
          </div>

          {composerOpen ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setComposerMode("catalog")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    composerMode === "catalog" ? "bg-white text-black" : "border border-white/15 text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  Exercise Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("custom")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    composerMode === "custom" ? "bg-white text-black" : "border border-white/15 text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  Custom Fallback
                </button>
              </div>

              {composerMode === "catalog" ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Primary flow: search catalog, filter, and select a curated exercise.</p>
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Search catalog</span>
                    <input
                      value={catalogSearch}
                      onChange={(event) => setCatalogSearch(event.target.value)}
                      className="app-input"
                      placeholder="bench, rdl, pulldown, side raise..."
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Muscle</span>
                      <select value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value)} className="app-input">
                        <option value="">All muscles</option>
                        {facets.muscles.map((muscle) => (
                          <option key={muscle} value={muscle}>
                            {titleCase(muscle)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Equipment</span>
                      <select value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)} className="app-input">
                        <option value="">All equipment</option>
                        {facets.equipment.map((equipment) => (
                          <option key={equipment} value={equipment}>
                            {titleCase(equipment)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {recentCatalogExercises.length ? (
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-zinc-500">Recently used</p>
                      <div className="flex flex-wrap gap-2">
                        {recentCatalogExercises.slice(0, 10).map((exercise) => (
                          <button
                            key={exercise.id}
                            type="button"
                            aria-pressed={selectedCatalogExerciseId === exercise.id}
                            onClick={() => setSelectedCatalogExerciseId(exercise.id)}
                            className={`rounded-md border px-2.5 py-1 text-xs ${
                              selectedCatalogExerciseId === exercise.id
                                ? "border-white bg-white text-black"
                                : "border-white/15 text-zinc-200 hover:bg-white/10"
                            }`}
                          >
                            {exercise.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/25 p-2">
                    {filteredCatalogExercises.length ? (
                      filteredCatalogExercises.slice(0, 80).map((exercise) => (
                        <button
                          key={exercise.id}
                          type="button"
                          aria-pressed={selectedCatalogExerciseId === exercise.id}
                          onClick={() => setSelectedCatalogExerciseId(exercise.id)}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                            selectedCatalogExerciseId === exercise.id
                              ? "bg-white text-black"
                              : "text-zinc-200 hover:bg-white/10"
                          }`}
                        >
                          <span>
                            {exercise.name}
                            <span className="ml-1 text-[10px] opacity-75">
                              ({titleCase(exercise.primary_muscle_group)} • {titleCase(exercise.equipment)})
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-zinc-500">No catalog exercises match your search.</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {selectedCatalogExercise
                      ? `Selected: ${selectedCatalogExercise.name}`
                      : "Select one catalog exercise to enable Add Catalog Exercise."}
                  </p>
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Exercise notes (optional)</span>
                    <input
                      value={exerciseNotesDraft}
                      onChange={(event) => setExerciseNotesDraft(event.target.value)}
                      className="app-input"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCatalogExercise}
                    disabled={isPending || !selectedCatalogExerciseId}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                  >
                    {isPending ? "Adding..." : "Add Catalog Exercise"}
                  </button>
                </div>
              ) : null}

              {composerMode === "custom" ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Can&apos;t find it? Add a custom exercise snapshot for this workout.</p>
                  {customExercises.length ? (
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Use existing custom exercise (optional)</span>
                      <select
                        value={selectedCustomExerciseId ?? ""}
                        onChange={(event) => setSelectedCustomExerciseId(event.target.value || null)}
                        className="app-input"
                      >
                        <option value="">Type a one-off custom name</option>
                        {customExercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Custom exercise name</span>
                    <input
                      value={customExerciseName}
                      onChange={(event) => {
                        setSelectedCustomExerciseId(null);
                        setCustomExerciseName(event.target.value);
                      }}
                      className="app-input"
                    />
                  </label>
                  {selectedCustomExerciseId === null ? (
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={saveCustomToLibrary}
                        onChange={(event) => setSaveCustomToLibrary(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/40 accent-white"
                      />
                      <span>Save to my custom exercise library</span>
                    </label>
                  ) : null}
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Exercise notes (optional)</span>
                    <input
                      value={exerciseNotesDraft}
                      onChange={(event) => setExerciseNotesDraft(event.target.value)}
                      className="app-input"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomExercise}
                    disabled={isPending}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                  >
                    {isPending ? "Adding..." : "Add Custom Exercise"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        {displayExercises.length ? (
          displayExercises.map((exercise, exerciseIndex) => {
            const exerciseVolume = calculateExerciseVolume(exercise.sets, displayUnit);
            const sourceLabel = exercise.catalogExerciseId
              ? "Catalog"
              : exercise.exerciseId
                ? "Custom library"
                : "Custom snapshot";

            return (
              <article key={exercise.id} className="rounded-[1.1rem] border border-white/10 bg-[#101215] p-3.5 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-white">{exercise.exerciseName}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">{sourceLabel}</p>
                    {exercise.notes ? <p className="mt-1 text-xs text-zinc-500">{exercise.notes}</p> : null}
                    <p className="mt-1 text-xs text-zinc-500">
                      Volume: {exerciseVolume === null ? "--" : `${exerciseVolume.toLocaleString()} ${displayUnit}`}
                    </p>
                  </div>
                  {!isCompletedWorkout ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveExercise(exercise.id, "up")}
                        disabled={isPending || exerciseIndex === 0}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(exercise.id, "down")}
                        disabled={isPending || exerciseIndex === displayExercises.length - 1}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-50"
                      >
                        Move Down
                      </button>
                      {deleteExerciseConfirmId === exercise.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => removeExercise(exercise.id)}
                            disabled={isPending}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                          >
                            {isPending ? "Removing..." : "Confirm Remove"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteExerciseConfirmId(null)}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteExerciseConfirmId(exercise.id)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                        >
                          Remove Exercise
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Previous Performance</p>
                  {exercise.previousPerformance.latestWorkoutDate ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-zinc-400">
                        Last workout: {formatDate(exercise.previousPerformance.latestWorkoutDate)}
                      </p>
                      {exercise.previousPerformance.latestCompletedSets.length ? (
                        <p className="text-xs text-zinc-500">
                          Last completed sets:{" "}
                          {exercise.previousPerformance.latestCompletedSets
                            .slice(0, 3)
                            .map((set) => formatSetLine(set))
                            .join(" • ")}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Previous best estimated 1RM:{" "}
                        {exercise.previousPerformance.previousBestEstimatedOneRepMax === null
                          ? "--"
                          : `${exercise.previousPerformance.previousBestEstimatedOneRepMax.toLocaleString()} ${displayUnit}`}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">No prior history found for this exercise yet.</p>
                  )}
                </div>

                {!isCompletedWorkout ? (
                  <button
                    type="button"
                    onClick={() => addSet(exercise.id)}
                    disabled={isPending}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                  >
                    {isPending ? "Adding..." : "Add Set"}
                  </button>
                ) : null}

                <ul className="mt-3 space-y-2">
                  {exercise.sets.length ? (
                    exercise.sets.map((set, setIndex) => {
                      const draft = getDraft(set);
                      const estimated = estimateSetOneRepMax(
                        {
                          ...set,
                          weight: draft.weight === "" ? null : Number(draft.weight),
                          weight_unit: draft.weight_unit || null,
                          reps: draft.reps === "" ? null : Number(draft.reps),
                          set_type: draft.set_type,
                          is_completed: draft.is_completed,
                          notes: draft.notes || null,
                          catalog_exercise_id: exercise.catalogExerciseId,
                          exercise_id: exercise.exerciseId,
                          exercise_name: exercise.exerciseName,
                        },
                        displayUnit,
                      );
                      const prCandidate = evaluatePersonalRecordCandidate(
                        {
                          ...set,
                          weight: draft.weight === "" ? null : Number(draft.weight),
                          weight_unit: draft.weight_unit || null,
                          reps: draft.reps === "" ? null : Number(draft.reps),
                          set_type: draft.set_type,
                          is_completed: draft.is_completed,
                          notes: draft.notes || null,
                          catalog_exercise_id: exercise.catalogExerciseId,
                          exercise_id: exercise.exerciseId,
                          exercise_name: exercise.exerciseName,
                        },
                        exercise.previousPerformance.comparableHistoricalSets,
                        displayUnit,
                      );
                      const showPr =
                        draft.is_completed &&
                        prCandidate.isPr &&
                        prCandidate.previousBestEstimatedOneRepMax !== null;

                      return (
                        <li
                          key={set.id}
                          className={`rounded-lg border px-2.5 py-2 ${
                            draft.is_completed
                              ? "border-accent/40 bg-accent/10"
                              : set.set_type === "warmup"
                                ? "border-white/10 bg-black/30"
                                : "border-white/10 bg-black/20"
                          }`}
                        >
                          <div className="grid gap-2 sm:grid-cols-12">
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-2">
                              <span>Type</span>
                              <select
                                value={draft.set_type}
                                onChange={(event) => updateSetDraft(set.id, { set_type: event.target.value })}
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              >
                                <option value="warmup">Warmup</option>
                                <option value="working">Working</option>
                                <option value="top">Top</option>
                                <option value="backoff">Backoff</option>
                                <option value="drop">Drop</option>
                                <option value="failure">Failure</option>
                              </select>
                            </label>
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-2">
                              <span>Weight</span>
                              <input
                                value={draft.weight}
                                onChange={(event) => updateSetDraft(set.id, { weight: event.target.value })}
                                inputMode="decimal"
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-2">
                              <span>Unit</span>
                              <select
                                value={draft.weight_unit}
                                onChange={(event) => updateSetDraft(set.id, { weight_unit: event.target.value })}
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              >
                                <option value="">--</option>
                                <option value="lb">lb</option>
                                <option value="kg">kg</option>
                              </select>
                            </label>
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-2">
                              <span>Reps</span>
                              <input
                                value={draft.reps}
                                onChange={(event) => updateSetDraft(set.id, { reps: event.target.value })}
                                inputMode="numeric"
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              />
                            </label>
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-2">
                              <span>RPE</span>
                              <input
                                value={draft.rpe}
                                onChange={(event) => updateSetDraft(set.id, { rpe: event.target.value })}
                                inputMode="decimal"
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              />
                            </label>
                            <label className="flex items-end gap-2 text-[11px] text-zinc-300 sm:col-span-2">
                              <input
                                type="checkbox"
                                checked={draft.is_completed}
                                onChange={(event) => toggleSetCompleted(set, event.target.checked)}
                                disabled={isPending || isCompletedWorkout}
                                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-white"
                              />
                              <span className="text-xs">Complete</span>
                            </label>
                            <label className="space-y-1 text-[11px] text-zinc-300 sm:col-span-12">
                              <span>Notes</span>
                              <input
                                value={draft.notes}
                                onChange={(event) => updateSetDraft(set.id, { notes: event.target.value })}
                                className="app-input h-10 text-sm"
                                disabled={isCompletedWorkout}
                              />
                            </label>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>Set #{set.position + 1}</span>
                            {estimated ? (
                              <span>
                                Est. 1RM {estimated.estimatedOneRepMax.toLocaleString()} {displayUnit}
                              </span>
                            ) : null}
                            {showPr ? <span className="text-accent">Potential estimated PR</span> : null}
                          </div>

                          {!isCompletedWorkout ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => saveSet(set.id)}
                                disabled={isPending}
                                className="inline-flex h-8 items-center justify-center rounded-md bg-white px-2.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                              >
                                {isPending ? "Saving..." : "Save Set"}
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateSet(exercise.id, set.id)}
                                disabled={isPending}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-70"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSet(exercise.id, set.id, "up")}
                                disabled={isPending || setIndex === 0}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-50"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSet(exercise.id, set.id, "down")}
                                disabled={isPending || setIndex === exercise.sets.length - 1}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-50"
                              >
                                Down
                              </button>
                              {deleteSetConfirmId === set.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => deleteSet(exercise.id, set.id)}
                                    disabled={isPending}
                                    className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2.5 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                                  >
                                    {isPending ? "Deleting..." : "Confirm Delete"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteSetConfirmId(null)}
                                    className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteSetConfirmId(set.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-md border border-rose-400/40 px-2.5 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })
                  ) : (
                    <li className="rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-xs text-zinc-500">
                      No sets logged yet for this exercise.
                    </li>
                  )}
                </ul>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
            <p className="text-sm font-medium text-zinc-200">No exercises in this workout yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Use Add Exercise to search the built-in catalog or add a custom fallback.</p>
          </div>
        )}
      </section>

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
