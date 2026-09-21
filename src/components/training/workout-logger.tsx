"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import { MuscleMap } from "@/components/training/muscle-map";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { MetricValue } from "@/components/ui/metric-value";
import { Select } from "@/components/ui/select";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseRow } from "@/lib/data/auth-context";
import type { ExerciseCatalogRow } from "@/lib/data/exercise-catalog";
import { filterCatalogExercises, buildCatalogFacets } from "@/lib/training/catalog";
import { aggregateWorkoutMuscles, buildPrimaryFocusLabel } from "@/lib/training/muscle-aggregation";
import {
  evaluatePersonalRecordCandidate,
  estimateSetOneRepMax,
} from "@/lib/training/calculations";
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
import { CANONICAL_LIFTS, toCanonicalLift, type CanonicalLift } from "@/lib/training/canonical-lifts";
import { formatElapsedWorkoutDuration, getElapsedWorkoutMinutes } from "@/lib/training/time";
import { formatCalendarDate, formatTimestampInTimeZone } from "@/lib/timezone";
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
  primaryMuscles: string[];
  secondaryMuscles: string[];
  bodyRegion: string | null;
  movementPattern: string | null;
  canonicalLift: CanonicalLift | null;
  muscleMetadataVersion: number | null;
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
  profileTimeZone: string;
}

function formatDate(date: string): string {
  return formatCalendarDate(date);
}

function formatDateTime(timestamp: string | null, timeZone: string): string {
  if (!timestamp) {
    return "Not started";
  }

  return formatTimestampInTimeZone(timestamp, timeZone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toSetState(setType: string, isCompleted: boolean): "completed" | "planned" | "warning" {
  if (isCompleted) {
    return "completed";
  }
  if (setType === "warmup") {
    return "warning";
  }
  return "planned";
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
  profileTimeZone,
}: WorkoutLoggerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  const [workoutName, setWorkoutName] = useState(workout.name);
  const [workoutDate, setWorkoutDate] = useState(workout.workoutDate);
  const [workoutNotes, setWorkoutNotes] = useState(workout.notes ?? "");
  const [optimisticExercises, setOptimisticExercises] = useState<WorkoutLoggerExercise[]>([]);
  const [optimisticRemovedExerciseIds, setOptimisticRemovedExerciseIds] = useState<string[]>([]);

  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>(() =>
    Object.fromEntries(
      exercises.flatMap((exercise) => exercise.sets.map((set) => [set.id, toSetDraft(set)])),
    ),
  );
  const [deleteSetConfirmId, setDeleteSetConfirmId] = useState<string | null>(null);
  const [deleteExerciseConfirmId, setDeleteExerciseConfirmId] = useState<string | null>(null);
  const [deleteWorkoutConfirm, setDeleteWorkoutConfirm] = useState(false);
  const [needsCompleteConfirm, setNeedsCompleteConfirm] = useState(false);
  const [elapsedReferenceMs, setElapsedReferenceMs] = useState<number | null>(() => {
    if (!workout.startedAt) {
      return null;
    }
    const parsedStart = Date.parse(workout.startedAt);
    if (Number.isNaN(parsedStart)) {
      return null;
    }
    // Deterministic initial render baseline; real-time ticking begins after hydration.
    return parsedStart + 60_000;
  });

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("catalog");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [bodyRegionFilter, setBodyRegionFilter] = useState("");
  const [movementPatternFilter, setMovementPatternFilter] = useState("");
  const [selectedCatalogExerciseId, setSelectedCatalogExerciseId] = useState<string | null>(null);
  const [exerciseNotesDraft, setExerciseNotesDraft] = useState("");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [selectedCustomExerciseId, setSelectedCustomExerciseId] = useState<string | null>(customExercises[0]?.id ?? null);
  const [saveCustomToLibrary, setSaveCustomToLibrary] = useState(true);
  const [customPrimaryMuscles, setCustomPrimaryMuscles] = useState<string[]>([]);
  const [customSecondaryMuscles, setCustomSecondaryMuscles] = useState<string[]>([]);
  const [customBodyRegion, setCustomBodyRegion] = useState("");
  const [customMovementPattern, setCustomMovementPattern] = useState("");
  const [customCanonicalLift, setCustomCanonicalLift] = useState<CanonicalLift | "">("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exercises[0]?.id ?? null);

  const isCompletedWorkout = Boolean(workout.completedAt);
  useEffect(() => {
    if (isCompletedWorkout || !workout.startedAt) {
      return;
    }

    const parsedStart = Date.parse(workout.startedAt);
    if (Number.isNaN(parsedStart)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedReferenceMs(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCompletedWorkout, workout.startedAt]);

  const liveDurationLabel =
    elapsedReferenceMs === null ? "--" : formatElapsedWorkoutDuration(workout.startedAt, elapsedReferenceMs);
  const liveDurationMinutes =
    elapsedReferenceMs === null ? null : getElapsedWorkoutMinutes(workout.startedAt, elapsedReferenceMs);

  const facets = useMemo(() => buildCatalogFacets(catalogExercises), [catalogExercises]);
  const filteredCatalogExercises = useMemo(
    () =>
      filterCatalogExercises(catalogExercises, {
        query: catalogSearch,
        muscle: muscleFilter,
        body_region: bodyRegionFilter,
        movement_pattern: movementPatternFilter,
      }),
    [catalogExercises, catalogSearch, muscleFilter, bodyRegionFilter, movementPatternFilter],
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
    return Array.from(byId.values())
      .filter((exercise) => !optimisticRemovedExerciseIds.includes(exercise.id))
      .sort((a, b) => a.position - b.position);
  }, [exercises, optimisticExercises, optimisticRemovedExerciseIds]);
  const currentExerciseId = useMemo(() => {
    if (!displayExercises.length) {
      return null;
    }
    if (selectedExerciseId && displayExercises.some((exercise) => exercise.id === selectedExerciseId)) {
      return selectedExerciseId;
    }
    return displayExercises[0]?.id ?? null;
  }, [displayExercises, selectedExerciseId]);
  const currentExerciseIndex = useMemo(
    () => Math.max(0, displayExercises.findIndex((exercise) => exercise.id === currentExerciseId)),
    [displayExercises, currentExerciseId],
  );
  const currentExercise = displayExercises[currentExerciseIndex] ?? null;
  const workoutTargeting = useMemo(
    () =>
      aggregateWorkoutMuscles(
        displayExercises.map((exercise) => ({
          exercise_id: exercise.id,
          exercise_name: exercise.exerciseName,
          primary_muscles: exercise.primaryMuscles,
          secondary_muscles: exercise.secondaryMuscles,
        })),
      ),
    [displayExercises],
  );
  const workoutTargetingFocusLabel = useMemo(() => buildPrimaryFocusLabel(workoutTargeting), [workoutTargeting]);

  function toggleMuscleSelection(selected: string[], muscle: string): string[] {
    return selected.includes(muscle) ? selected.filter((item) => item !== muscle) : [...selected, muscle];
  }

  function formatMuscleList(muscles: string[]): string {
    if (!muscles.length) {
      return "Unavailable";
    }
    return muscles
      .map((muscle) => (isMuscleId(muscle) ? getMuscleLabel(muscle) : titleCase(muscle)))
      .join(", ");
  }

  function resolveCatalogPrimaryMuscles(exercise: ExerciseCatalogRow): string[] {
    if (exercise.primary_muscles?.length) {
      return exercise.primary_muscles;
    }
    return exercise.primary_muscle_group ? [exercise.primary_muscle_group] : [];
  }

  function setSuccessMessage(text: string) {
    setTone("success");
    setMessage(text);
  }

  function setErrorMessage(text: string) {
    setTone("error");
    setMessage(text);
  }

  function appendOptimisticExercise(
    workoutExercise: {
      id: string;
      exercise_id: string | null;
      catalog_exercise_id: string | null;
      exercise_name: string;
      notes: string | null;
      position: number;
      source_primary_muscles?: string[] | null;
      source_secondary_muscles?: string[] | null;
      source_body_region?: string | null;
      source_movement_pattern?: string | null;
      source_canonical_lift?: string | null;
      source_muscle_metadata_version?: number | null;
    },
    fallbackMetadata: {
      primaryMuscles?: string[];
      secondaryMuscles?: string[];
      bodyRegion?: string | null;
      movementPattern?: string | null;
      canonicalLift?: CanonicalLift | null;
      muscleMetadataVersion?: number | null;
    },
  ) {
    setOptimisticExercises((current) => {
      if (current.some((exercise) => exercise.id === workoutExercise.id)) {
        return current;
      }

      return [
        ...current,
        {
          id: workoutExercise.id,
          exerciseId: workoutExercise.exercise_id,
          catalogExerciseId: workoutExercise.catalog_exercise_id,
          exerciseName: workoutExercise.exercise_name,
          notes: workoutExercise.notes,
          primaryMuscles: workoutExercise.source_primary_muscles ?? fallbackMetadata.primaryMuscles ?? [],
          secondaryMuscles: workoutExercise.source_secondary_muscles ?? fallbackMetadata.secondaryMuscles ?? [],
          bodyRegion: workoutExercise.source_body_region ?? fallbackMetadata.bodyRegion ?? null,
          movementPattern: workoutExercise.source_movement_pattern ?? fallbackMetadata.movementPattern ?? null,
          canonicalLift: toCanonicalLift(workoutExercise.source_canonical_lift) ?? fallbackMetadata.canonicalLift ?? null,
          muscleMetadataVersion:
            workoutExercise.source_muscle_metadata_version ?? fallbackMetadata.muscleMetadataVersion ?? null,
          position: workoutExercise.position,
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

  function resetComposerState() {
    setCatalogSearch("");
    setMuscleFilter("");
    setBodyRegionFilter("");
    setMovementPatternFilter("");
    setSelectedCatalogExerciseId(null);
    setExerciseNotesDraft("");
    setCustomExerciseName("");
    setSelectedCustomExerciseId(customExercises[0]?.id ?? null);
    setSaveCustomToLibrary(true);
    setCustomPrimaryMuscles([]);
    setCustomSecondaryMuscles([]);
    setCustomBodyRegion("");
    setCustomMovementPattern("");
    setCustomCanonicalLift("");
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
          appendOptimisticExercise(addedWorkoutExercise, {
            primaryMuscles: resolveCatalogPrimaryMuscles(selectedExercise),
            secondaryMuscles: selectedExercise.secondary_muscles ?? [],
            bodyRegion: selectedExercise.body_region ?? null,
            movementPattern: selectedExercise.movement_pattern ?? null,
            canonicalLift: selectedExercise.canonical_lift ?? null,
            muscleMetadataVersion: selectedExercise.muscle_metadata_version ?? 1,
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
    if (!selectedCustomExerciseId && saveCustomToLibrary) {
      if (!customPrimaryMuscles.length) {
        setErrorMessage("Select at least one primary muscle before saving a custom exercise.");
        return;
      }
      if (customSecondaryMuscles.some((muscle) => customPrimaryMuscles.includes(muscle))) {
        setErrorMessage("A muscle cannot be both primary and secondary.");
        return;
      }
    }

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
          if (resultFromSavedCustom.workoutExercise) {
            const selectedCustomPrimary =
              selectedCustom.primary_muscles?.length
                ? selectedCustom.primary_muscles
                : mapLegacyMuscleGroupToPrimaryMuscles(selectedCustom.muscle_group);
            appendOptimisticExercise(resultFromSavedCustom.workoutExercise, {
              primaryMuscles: selectedCustomPrimary,
              secondaryMuscles: selectedCustom.secondary_muscles ?? [],
              bodyRegion: selectedCustom.body_region ?? null,
              movementPattern: selectedCustom.movement_pattern ?? null,
              canonicalLift: (selectedCustom as ExerciseRow & { canonical_lift?: CanonicalLift | null }).canonical_lift ?? null,
              muscleMetadataVersion: selectedCustom.muscle_metadata_version ?? 1,
            });
          }
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
          primary_muscles: customPrimaryMuscles,
          secondary_muscles: customSecondaryMuscles,
          body_region: customBodyRegion || undefined,
          movement_pattern: customMovementPattern || undefined,
          canonical_lift: customCanonicalLift || null,
          workoutExerciseNotes: exerciseNotesDraft,
        });
        if (resultFromCreate.status === "success") {
          setSuccessMessage("Custom exercise created and added.");
          if (resultFromCreate.workoutExercise) {
            appendOptimisticExercise(resultFromCreate.workoutExercise, {
              primaryMuscles: customPrimaryMuscles,
              secondaryMuscles: customSecondaryMuscles,
              bodyRegion: customBodyRegion || null,
              movementPattern: customMovementPattern || null,
              canonicalLift: customCanonicalLift || null,
              muscleMetadataVersion: 1,
            });
          }
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
        if (result.workoutExercise) {
          appendOptimisticExercise(result.workoutExercise, {
            primaryMuscles: [],
            secondaryMuscles: [],
            bodyRegion: null,
            movementPattern: null,
            canonicalLift: null,
            muscleMetadataVersion: null,
          });
        }
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
      const effectiveWeightUnit = draft.weight_unit || preferredWeightUnit;
      const result = await updateWorkoutSetAction(workout.id, setId, {
        set_type: draft.set_type,
        weight: draft.weight,
        weight_unit: draft.weight.trim() ? effectiveWeightUnit : "",
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
      const effectiveWeightUnit = draft.weight_unit || preferredWeightUnit;
      const result = await updateWorkoutSetAction(workout.id, set.id, {
        set_type: draft.set_type,
        weight: draft.weight,
        weight_unit: draft.weight.trim() ? effectiveWeightUnit : "",
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
        setOptimisticExercises((current) => current.filter((exercise) => exercise.id !== workoutExerciseId));
        setOptimisticRemovedExerciseIds((current) =>
          current.includes(workoutExerciseId) ? current : [...current, workoutExerciseId],
        );
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
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StateChip state={isCompletedWorkout ? "completed" : "active"} />
              <p className="text-xs text-zinc-500">
                {summary.completedSetCount}/{summary.totalSetCount} sets complete
              </p>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatDate(workout.workoutDate)} • Started {formatDateTime(workout.startedAt, profileTimeZone)}
            </p>
            {!isCompletedWorkout ? <p className="mt-0.5 text-xs text-zinc-500">{liveDurationLabel}</p> : null}
          </div>
          {!isCompletedWorkout ? (
            !needsCompleteConfirm ? (
              <Button type="button" onClick={() => completeWorkout(false)} disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                {isPending ? "Completing..." : "Complete Workout"}
              </Button>
            ) : (
              <Button type="button" onClick={() => completeWorkout(true)} disabled={isPending} variant="secondary" size="sm" className="h-9 rounded-lg border-amber-300/40 px-3 text-xs text-amber-100 hover:bg-amber-500/15">
                Confirm Complete Without Sets
              </Button>
            )
          ) : null}
        </div>

        {currentExercise ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              {isCompletedWorkout ? "Exercise" : `Current Exercise • ${currentExerciseIndex + 1} of ${displayExercises.length}`}
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-100">{currentExercise.exerciseName}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {currentExercise.sets.length} sets • {currentExercise.sets.filter((set) => set.is_completed).length} complete
            </p>
            {currentExercise.notes ? <p className="mt-1 text-xs text-zinc-500">{currentExercise.notes}</p> : null}
            <p className="mt-1 text-xs text-zinc-500">
              {currentExercise.previousPerformance.latestCompletedSets.length
                ? `Previous: ${currentExercise.previousPerformance.latestCompletedSets
                    .slice(0, 1)
                    .map((set) => formatSetLine(set))
                    .join("")}`
                : "No previous performance"}
            </p>
            {!isCompletedWorkout ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setSelectedExerciseId(displayExercises[Math.max(0, currentExerciseIndex - 1)]?.id ?? currentExercise.id)}
                  disabled={currentExerciseIndex === 0}
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-md px-2.5 text-xs"
                >
                  Previous Exercise
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedExerciseId(displayExercises[Math.min(displayExercises.length - 1, currentExerciseIndex + 1)]?.id ?? currentExercise.id)}
                  disabled={currentExerciseIndex >= displayExercises.length - 1}
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-md px-2.5 text-xs"
                >
                  Next Exercise
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
            <p className="text-sm font-medium text-zinc-200">No exercises in this workout yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Open Add / Manage Exercises to search the catalog or add a custom fallback.</p>
          </div>
        )}

        {displayExercises.length ? (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Exercise switcher</p>
            <div data-testid="exercise-switcher" className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
              {displayExercises.map((exercise) => {
                const isActive = exercise.id === currentExercise?.id;
                const completed = exercise.sets.filter((set) => set.is_completed).length;
                return (
                  <button
                    key={`switch-${exercise.id}`}
                    data-testid={`exercise-switch-item-${exercise.id}`}
                    type="button"
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-left text-xs ${
                      isActive
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/30 text-zinc-200"
                    }`}
                    aria-pressed={isActive}
                  >
                    <span className="block font-medium">{exercise.exerciseName}</span>
                    <span className="block text-[10px] opacity-75">{completed}/{exercise.sets.length} sets</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {currentExercise ? (
          <div className="mt-3 rounded-xl border border-[#87a3ff]/45 bg-[#0f141d] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Set Logger</p>
                <h2 className="mt-0.5 text-sm font-semibold text-zinc-100">{currentExercise.exerciseName}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{currentExercise.notes ?? "No prescription guidance recorded."}</p>
              </div>
              {!isCompletedWorkout ? (
                <Button type="button" onClick={() => addSet(currentExercise.id)} disabled={isPending} variant="primary" size="sm" className="h-8 rounded-md px-2.5 text-xs">
                  {isPending ? "Adding..." : "+ Add Set"}
                </Button>
              ) : null}
            </div>

            <div className="mt-2 space-y-2">
              {currentExercise.sets.length ? (
                currentExercise.sets.map((set, setIndex) => {
                  const draft = getDraft(set);
                  const previousSet = currentExercise.previousPerformance.latestCompletedSets[setIndex] ?? null;
                  const effectiveWeightUnit = draft.weight_unit || preferredWeightUnit;
                  const estimated = estimateSetOneRepMax(
                    {
                      ...set,
                      weight: draft.weight === "" ? null : Number(draft.weight),
                      weight_unit: draft.weight_unit || null,
                      reps: draft.reps === "" ? null : Number(draft.reps),
                      set_type: draft.set_type,
                      is_completed: draft.is_completed,
                      notes: draft.notes || null,
                      catalog_exercise_id: currentExercise.catalogExerciseId,
                      exercise_id: currentExercise.exerciseId,
                      exercise_name: currentExercise.exerciseName,
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
                      catalog_exercise_id: currentExercise.catalogExerciseId,
                      exercise_id: currentExercise.exerciseId,
                      exercise_name: currentExercise.exerciseName,
                    },
                    currentExercise.previousPerformance.comparableHistoricalSets,
                    displayUnit,
                  );
                  const showPr =
                    draft.is_completed &&
                    prCandidate.isPr &&
                    prCandidate.previousBestEstimatedOneRepMax !== null;

                  return (
                    <div
                      key={set.id}
                      className={`rounded-lg border p-2.5 ${
                        draft.is_completed ? "border-[#87a3ff]/50 bg-[#87a3ff]/10" : "border-white/10 bg-black/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">Set {set.position + 1}</p>
                          <p className="text-[11px] text-zinc-500">
                            Previous: {previousSet ? formatSetLine(previousSet) : "—"}
                          </p>
                        </div>
                        <StateChip
                          state={toSetState(draft.set_type, draft.is_completed)}
                          label={draft.is_completed ? "Done" : "Open"}
                          className="text-[10px]"
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="space-y-1 text-[11px] text-zinc-300">
                          <span>Weight ({effectiveWeightUnit})</span>
                          <input
                            value={draft.weight}
                            onChange={(event) => updateSetDraft(set.id, { weight: event.target.value })}
                            inputMode="decimal"
                            className="app-input h-10 text-sm"
                            disabled={isCompletedWorkout}
                          />
                        </label>
                        <label className="space-y-1 text-[11px] text-zinc-300">
                          <span>Reps</span>
                          <input
                            value={draft.reps}
                            onChange={(event) => updateSetDraft(set.id, { reps: event.target.value })}
                            inputMode="numeric"
                            className="app-input h-10 text-sm"
                            disabled={isCompletedWorkout}
                          />
                        </label>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {!isCompletedWorkout ? (
                          <>
                            <Button
                              type="button"
                              onClick={() => toggleSetCompleted(set, !draft.is_completed)}
                              disabled={isPending}
                              variant={draft.is_completed ? "secondary" : "primary"}
                              size="sm"
                              className="h-8 rounded-md px-2.5 text-xs"
                            >
                              {draft.is_completed ? "Mark Incomplete" : "Mark Complete"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => saveSet(set.id)}
                              disabled={isPending}
                              variant="secondary"
                              size="sm"
                              className="h-8 rounded-md px-2.5 text-xs"
                            >
                              {isPending ? "Saving..." : "Save Set"}
                            </Button>
                          </>
                        ) : null}
                        {estimated ? (
                          <span className="text-[11px] text-zinc-500">
                            Est. 1RM {estimated.estimatedOneRepMax.toLocaleString()} {displayUnit}
                          </span>
                        ) : null}
                        {showPr ? <StateChip state="pr" label="Potential estimated PR" className="text-[10px]" /> : null}
                      </div>

                      {!isCompletedWorkout ? (
                        <details className="mt-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
                          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                            Set details
                          </summary>
                          <div className="mt-2 grid gap-2">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label className="space-y-1 text-[11px] text-zinc-300">
                                <span>Type</span>
                                <select
                                  value={draft.set_type}
                                  onChange={(event) => updateSetDraft(set.id, { set_type: event.target.value })}
                                  className="app-input h-9 text-sm"
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
                              <label className="space-y-1 text-[11px] text-zinc-300">
                                <span>Unit override</span>
                                <select
                                  value={draft.weight_unit}
                                  onChange={(event) => updateSetDraft(set.id, { weight_unit: event.target.value })}
                                  className="app-input h-9 text-sm"
                                  disabled={isCompletedWorkout}
                                >
                                  <option value={preferredWeightUnit}>Use profile ({preferredWeightUnit})</option>
                                  <option value="lb">lb</option>
                                  <option value="kg">kg</option>
                                </select>
                              </label>
                              <label className="space-y-1 text-[11px] text-zinc-300">
                                <span>RPE</span>
                                <input
                                  value={draft.rpe}
                                  onChange={(event) => updateSetDraft(set.id, { rpe: event.target.value })}
                                  inputMode="decimal"
                                  className="app-input h-9 text-sm"
                                  disabled={isCompletedWorkout}
                                />
                              </label>
                            </div>
                            <label className="space-y-1 text-[11px] text-zinc-300">
                              <span>Notes</span>
                              <input
                                value={draft.notes}
                                onChange={(event) => updateSetDraft(set.id, { notes: event.target.value })}
                                className="app-input h-9 text-sm"
                                disabled={isCompletedWorkout}
                              />
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <Button type="button" onClick={() => duplicateSet(currentExercise.id, set.id)} disabled={isPending} variant="secondary" size="sm" className="h-7 rounded-md px-2 text-xs">
                                Duplicate
                              </Button>
                              <Button type="button" onClick={() => moveSet(currentExercise.id, set.id, "up")} disabled={isPending || setIndex === 0} variant="secondary" size="sm" className="h-7 rounded-md px-2 text-xs">
                                Up
                              </Button>
                              <Button type="button" onClick={() => moveSet(currentExercise.id, set.id, "down")} disabled={isPending || setIndex === currentExercise.sets.length - 1} variant="secondary" size="sm" className="h-7 rounded-md px-2 text-xs">
                                Down
                              </Button>
                              {deleteSetConfirmId === set.id ? (
                                <>
                                  <Button type="button" onClick={() => deleteSet(currentExercise.id, set.id)} disabled={isPending} variant="danger" size="sm" className="h-7 rounded-md px-2 text-xs">
                                    Confirm Delete
                                  </Button>
                                  <Button type="button" onClick={() => setDeleteSetConfirmId(null)} variant="secondary" size="sm" className="h-7 rounded-md px-2 text-xs">
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button type="button" onClick={() => setDeleteSetConfirmId(set.id)} variant="danger" size="sm" className="h-7 rounded-md px-2 text-xs">
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-2.5 text-xs text-zinc-500">
                  No sets logged yet for this exercise.
                </p>
              )}
            </div>

            {!isCompletedWorkout ? (
              <details className="mt-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Exercise actions
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => moveExercise(currentExercise.id, "up")} disabled={isPending || currentExerciseIndex === 0} variant="secondary" size="sm" className="h-8 rounded-md px-2 text-xs">
                    Move Up
                  </Button>
                  <Button type="button" onClick={() => moveExercise(currentExercise.id, "down")} disabled={isPending || currentExerciseIndex === displayExercises.length - 1} variant="secondary" size="sm" className="h-8 rounded-md px-2 text-xs">
                    Move Down
                  </Button>
                  {deleteExerciseConfirmId === currentExercise.id ? (
                    <>
                      <Button type="button" onClick={() => removeExercise(currentExercise.id)} disabled={isPending} variant="danger" size="sm" className="h-8 rounded-md px-2 text-xs">
                        Confirm Remove Exercise
                      </Button>
                      <Button type="button" onClick={() => setDeleteExerciseConfirmId(null)} variant="secondary" size="sm" className="h-8 rounded-md px-2 text-xs">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setDeleteExerciseConfirmId(currentExercise.id)} variant="danger" size="sm" className="h-8 rounded-md px-2 text-xs">
                      Remove Exercise
                    </Button>
                  )}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        <details className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2.5">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            Session Insights
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <p className="uppercase tracking-[0.08em] text-zinc-500">Exercises</p>
              <MetricValue value={String(summary.exerciseCount)} tone="secondary" className="mt-1 text-base" />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <p className="uppercase tracking-[0.08em] text-zinc-500">Completed Sets</p>
              <MetricValue value={String(summary.completedSetCount)} tone="secondary" className="mt-1 text-base" />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <p className="uppercase tracking-[0.08em] text-zinc-500">Best Est. 1RM</p>
              <MetricValue
                value={summary.bestEstimatedOneRepMax === null ? "--" : summary.bestEstimatedOneRepMax.toLocaleString()}
                unit={displayUnit}
                tone="secondary"
                className="mt-1 text-base"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <p className="uppercase tracking-[0.08em] text-zinc-500">Potential PRs</p>
              <MetricValue value={String(summary.potentialPrCount)} tone="secondary" className="mt-1 text-base" />
              {liveDurationMinutes !== null ? <p className="mt-0.5 text-[10px] text-zinc-500">{liveDurationMinutes} min</p> : null}
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Volume</p>
            <MetricValue value={summary.totalVolume === null ? "--" : summary.totalVolume.toLocaleString()} unit={displayUnit} tone="secondary" className="mt-1 text-base" />
          </div>
        </details>

        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            Workout Muscle Coverage
          </summary>
          <p className="mt-1 text-xs text-zinc-500">
            Derived from exercise muscle metadata snapshots (primary weighted higher than secondary).
          </p>
          <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MuscleMap aggregation={workoutTargeting} testId="workout-muscle-map" />
            <div className="rounded-lg border border-white/10 bg-black/25 p-2.5">
              <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Targeting Summary</p>
              <p className="mt-1 text-xs text-zinc-300">{workoutTargetingFocusLabel ?? "Primary focus unavailable."}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Exercises with metadata: {workoutTargeting.exercises_with_metadata}/{workoutTargeting.exercise_count}
              </p>
              {workoutTargeting.metadata_coverage === "partial" ? (
                <div className="mt-1">
                  <StateChip state="warning" label="Partial metadata coverage" />
                </div>
              ) : null}
              {workoutTargeting.metadata_coverage === "none" ? (
                <div className="mt-1">
                  <StateChip state="missing" label="Muscle targeting unavailable" />
                </div>
              ) : null}
              {workoutTargeting.ranked_muscles.length ? (
                <ol data-testid="workout-muscle-ranked-list" className="mt-2 space-y-1 text-xs text-zinc-300">
                  {workoutTargeting.ranked_muscles.slice(0, 8).map((entry) => (
                    <li key={entry.muscle} className="flex items-center justify-between gap-2">
                      <span>{getMuscleLabel(entry.muscle)}</span>
                      <span className="text-zinc-500">
                        {entry.raw_score} pts • {(entry.normalized_intensity * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </div>
        </details>

        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            Workout Details & Settings
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-zinc-300">
              <span>Workout name</span>
              <Input
                value={workoutName}
                onChange={(event) => setWorkoutName(event.target.value)}
                className="app-input"
                disabled={isPending || isCompletedWorkout}
              />
            </label>
            <label className="space-y-1 text-xs text-zinc-300">
              <span>Workout date</span>
              <DatePicker value={workoutDate} onChange={(event) => setWorkoutDate(event.target.value)} className="app-input" disabled={isPending || isCompletedWorkout} />
            </label>
            <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
              <span>Notes</span>
              <Textarea
                value={workoutNotes}
                onChange={(event) => setWorkoutNotes(event.target.value)}
                rows={3}
                className="text-sm"
                disabled={isPending || isCompletedWorkout}
              />
            </label>
          </div>
          {!isCompletedWorkout ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" onClick={saveWorkoutMetadata} disabled={isPending} variant="secondary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                {isPending ? "Saving..." : "Save Details"}
              </Button>
              {deleteWorkoutConfirm ? (
                <>
                  <Button type="button" onClick={deleteWorkout} disabled={isPending} variant="danger" size="sm" className="h-9 rounded-lg px-3 text-xs">
                    {isPending ? "Deleting..." : "Confirm Delete Workout"}
                  </Button>
                  <Button type="button" onClick={() => setDeleteWorkoutConfirm(false)} variant="secondary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setDeleteWorkoutConfirm(true)} variant="danger" size="sm" className="h-9 rounded-lg px-3 text-xs">
                  Delete Workout
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              This workout is completed and shown as a read-only summary.
            </p>
          )}
        </details>
      </section>

      {!isCompletedWorkout ? (
        <section data-testid="add-exercise-panel" className="rounded-[1.1rem] border border-white/10 bg-[#101215] p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-[0.09em] text-zinc-300">Add / Manage Exercises</h2>
            <Button
              type="button"
              onClick={() => {
                if (composerOpen) {
                  closeComposer();
                  return;
                }
                setComposerOpen(true);
              }}
              variant="secondary"
              size="sm"
              className="h-8 rounded-md px-2.5 text-xs"
            >
              {composerOpen ? "Close" : "Open"}
            </Button>
          </div>

          {composerOpen ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setComposerMode("catalog")}
                  variant={composerMode === "catalog" ? "primary" : "secondary"}
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Exercise Catalog
                </Button>
                <Button
                  type="button"
                  onClick={() => setComposerMode("custom")}
                  variant={composerMode === "custom" ? "primary" : "secondary"}
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Custom Fallback
                </Button>
              </div>

              {composerMode === "catalog" ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Primary flow: search catalog, filter, and select a curated exercise.</p>
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Search catalog</span>
                    <Input
                      value={catalogSearch}
                      onChange={(event) => setCatalogSearch(event.target.value)}
                      className="app-input"
                      placeholder="bench, rdl, pulldown, side raise..."
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Muscle</span>
                      <Select value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value)} className="app-input">
                        <option value="">All muscles</option>
                        {facets.muscles.map((muscle) => (
                          <option key={muscle} value={muscle}>
                            {titleCase(muscle)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Body region</span>
                      <Select value={bodyRegionFilter} onChange={(event) => setBodyRegionFilter(event.target.value)} className="app-input">
                        <option value="">All body regions</option>
                        {facets.body_regions.map((bodyRegion) => (
                          <option key={bodyRegion} value={bodyRegion}>
                            {titleCase(bodyRegion)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Movement</span>
                      <Select
                        value={movementPatternFilter}
                        onChange={(event) => setMovementPatternFilter(event.target.value)}
                        className="app-input"
                      >
                        <option value="">All movement patterns</option>
                        {facets.movement_patterns.map((movementPattern) => (
                          <option key={movementPattern} value={movementPattern}>
                            {titleCase(movementPattern)}
                          </option>
                        ))}
                      </Select>
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
                              ({formatMuscleList(resolveCatalogPrimaryMuscles(exercise))} • {titleCase(exercise.equipment)})
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
                    <Input
                      value={exerciseNotesDraft}
                      onChange={(event) => setExerciseNotesDraft(event.target.value)}
                      className="app-input"
                    />
                  </label>
                  <Button type="button" onClick={handleAddCatalogExercise} disabled={isPending || !selectedCatalogExerciseId} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                    {isPending ? "Adding..." : "Add Catalog Exercise"}
                  </Button>
                </div>
              ) : null}

              {composerMode === "custom" ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Can&apos;t find it? Add a custom exercise snapshot for this workout.</p>
                  {customExercises.length ? (
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Use existing custom exercise (optional)</span>
                      <Select
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
                      </Select>
                    </label>
                  ) : null}
                  {selectedCustomExerciseId ? (
                    <p className="text-xs text-zinc-500">
                      Existing metadata:{" "}
                      {(() => {
                        const selected = customExercises.find((exercise) => exercise.id === selectedCustomExerciseId);
                        if (!selected) {
                          return "Unavailable";
                        }
                        const selectedPrimary =
                          selected.primary_muscles?.length
                            ? selected.primary_muscles
                            : mapLegacyMuscleGroupToPrimaryMuscles(selected.muscle_group);
                        return `Primary ${formatMuscleList(selectedPrimary)}; Secondary ${formatMuscleList(selected.secondary_muscles ?? [])}`;
                      })()}
                    </p>
                  ) : null}
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Custom exercise name</span>
                    <Input
                      value={customExerciseName}
                      onChange={(event) => {
                        setSelectedCustomExerciseId(null);
                        setCustomExerciseName(event.target.value);
                      }}
                      className="app-input"
                    />
                  </label>
                  {selectedCustomExerciseId === null ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={saveCustomToLibrary}
                          onChange={(event) => setSaveCustomToLibrary(event.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-black/40 accent-white"
                        />
                        <span>Save to my custom exercise library</span>
                      </label>

                      {saveCustomToLibrary ? (
                        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                          <p className="text-xs text-zinc-400">Metadata for saved custom exercise</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="space-y-1 text-xs text-zinc-300">
                              <span>Body region</span>
                              <Select value={customBodyRegion} onChange={(event) => setCustomBodyRegion(event.target.value)} className="app-input">
                                <option value="">Unspecified</option>
                                {BODY_REGIONS.map((bodyRegion) => (
                                  <option key={bodyRegion} value={bodyRegion}>
                                    {getBodyRegionLabel(bodyRegion)}
                                  </option>
                                ))}
                              </Select>
                            </label>
                            <label className="space-y-1 text-xs text-zinc-300">
                              <span>Movement pattern</span>
                              <Select
                                value={customMovementPattern}
                                onChange={(event) => setCustomMovementPattern(event.target.value)}
                                className="app-input"
                              >
                                <option value="">Unspecified</option>
                                {MOVEMENT_PATTERNS.map((movementPattern) => (
                                  <option key={movementPattern} value={movementPattern}>
                                    {getMovementPatternLabel(movementPattern)}
                                  </option>
                                ))}
                              </Select>
                            </label>
                            <label className="space-y-1 text-xs text-zinc-300">
                              <span>Canonical lift</span>
                              <Select
                                value={customCanonicalLift}
                                onChange={(event) => setCustomCanonicalLift(event.target.value as CanonicalLift | "")}
                                className="app-input"
                              >
                                <option value="">Not canonical</option>
                                {CANONICAL_LIFTS.map((lift) => (
                                  <option key={lift} value={lift}>
                                    {lift.replace("_", " ")}
                                  </option>
                                ))}
                              </Select>
                            </label>
                          </div>
                          <div className="mt-2 grid gap-1 sm:grid-cols-2">
                            {MUSCLE_TAXONOMY.map((muscle) => (
                              <label key={`primary-${muscle}`} className="inline-flex items-center gap-2 text-xs text-zinc-200">
                                <input
                                  type="checkbox"
                                  checked={customPrimaryMuscles.includes(muscle)}
                                  onChange={() => setCustomPrimaryMuscles((current) => toggleMuscleSelection(current, muscle))}
                                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Primary: {getMuscleLabel(muscle)}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 grid gap-1 sm:grid-cols-2">
                            {MUSCLE_TAXONOMY.map((muscle) => (
                              <label key={`secondary-${muscle}`} className="inline-flex items-center gap-2 text-xs text-zinc-200">
                                <input
                                  type="checkbox"
                                  checked={customSecondaryMuscles.includes(muscle)}
                                  onChange={() => setCustomSecondaryMuscles((current) => toggleMuscleSelection(current, muscle))}
                                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                                />
                                <span>Secondary: {getMuscleLabel(muscle)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <label className="space-y-1 text-xs text-zinc-300">
                    <span>Exercise notes (optional)</span>
                    <Input
                      value={exerciseNotesDraft}
                      onChange={(event) => setExerciseNotesDraft(event.target.value)}
                      className="app-input"
                    />
                  </label>
                  <Button type="button" onClick={handleAddCustomExercise} disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                    {isPending ? "Adding..." : "Add Custom Exercise"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {message ? <Toast tone={tone === "error" ? "error" : "success"} role={tone === "error" ? "alert" : "status"}>{message}</Toast> : null}
    </div>
  );
}
