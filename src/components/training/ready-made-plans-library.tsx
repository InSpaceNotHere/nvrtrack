"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  applyReadyMadePresetAction,
  saveReadyMadePresetAction,
} from "@/app/(protected)/actions/planner-actions";
import { Button } from "@/components/ui/button";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import {
  SHARED_TRAINING_GUIDANCE,
  formatRepRange,
  formatRestGuidance,
  type ReadyMadePresetId,
  type ReadyMadePresetMissingExercise,
  type ReadyMadePresetResolvedDefinition,
} from "@/lib/training/ready-made-presets";

interface ReadyMadePlansLibraryProps {
  presets: ReadyMadePresetResolvedDefinition[];
  missingExercises: ReadyMadePresetMissingExercise[];
}

function formatSessionDurationLabel(preset: ReadyMadePresetResolvedDefinition): string {
  const durations = preset.sessions.map((session) => session.estimatedDurationMinutes);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  return min === max ? `~${min} min/session` : `~${min}-${max} min/session`;
}

function hasMissingMappings(
  presetId: ReadyMadePresetId,
  missingExercises: ReadyMadePresetMissingExercise[],
): boolean {
  return missingExercises.some((entry) => entry.presetId === presetId);
}

export function ReadyMadePlansLibrary({
  presets,
  missingExercises,
}: ReadyMadePlansLibraryProps) {
  const router = useRouter();
  const [selectedPresetId, setSelectedPresetId] = useState<ReadyMadePresetId>(
    presets[0]?.id ?? "full-body-basics",
  );
  const [confirmApplyPresetId, setConfirmApplyPresetId] =
    useState<ReadyMadePresetId | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );
  const selectedMissing = useMemo(
    () => missingExercises.filter((entry) => entry.presetId === selectedPresetId),
    [missingExercises, selectedPresetId],
  );

  function setSuccess(message: string) {
    setFeedback({ tone: "success", message });
  }

  function setError(message: string) {
    setFeedback({ tone: "error", message });
  }

  function handleSavePreset(presetId: ReadyMadePresetId) {
    setFeedback(null);
    setConfirmApplyPresetId(null);
    startTransition(async () => {
      const result = await saveReadyMadePresetAction(presetId);
      if (result.status === "success") {
        setSuccess(result.message);
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  function handleApplyPreset(
    presetId: ReadyMadePresetId,
    confirmScheduleReplace: boolean,
  ) {
    setFeedback(null);
    startTransition(async () => {
      const result = await applyReadyMadePresetAction({
        presetId,
        confirmScheduleReplace,
      });
      if (result.status === "confirm") {
        setConfirmApplyPresetId(presetId);
        setError(result.message);
        return;
      }
      if (result.status === "success") {
        setConfirmApplyPresetId(null);
        setSuccess(result.message);
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  if (!selectedPreset) {
    return (
      <p className="text-sm text-zinc-500">
        Ready-made preset library is unavailable.
      </p>
    );
  }

  return (
    <div id="ready-made-plans" className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {presets.map((preset) => {
          const selected = preset.id === selectedPresetId;
          const missing = hasMissingMappings(preset.id, missingExercises);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedPresetId(preset.id);
                setConfirmApplyPresetId(null);
              }}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? "border-white/50 bg-white/10"
                  : "border-white/10 bg-black/20 hover:bg-white/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-zinc-100">{preset.title}</p>
                <StateChip
                  state={preset.kind === "weekly_program" ? "planned" : "warning"}
                  label={preset.kind === "weekly_program" ? "Program" : "Focused workout"}
                  className="text-[10px]"
                />
                {missing ? (
                  <StateChip state="warning" label="Needs mapping review" className="text-[10px]" />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-400">{preset.subtitle}</p>
              {preset.startHereHint ? (
                <p className="mt-1 text-xs text-emerald-300">{preset.startHereHint}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">{selectedPreset.title}</h3>
          <StateChip
            state={selectedPreset.kind === "weekly_program" ? "planned" : "warning"}
            label={selectedPreset.kind === "weekly_program" ? "Program" : "Focused workout"}
            className="text-[10px]"
          />
        </div>
        <p className="mt-1 text-xs text-zinc-400">{selectedPreset.summary}</p>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/25 p-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Weekly commitment</p>
            <p className="mt-1 text-xs text-zinc-300">{selectedPreset.weeklyCommitment}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Estimated duration</p>
            <p className="mt-1 text-xs text-zinc-300">{formatSessionDurationLabel(selectedPreset)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-2 sm:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Equipment required</p>
            <p className="mt-1 text-xs text-zinc-300">
              {selectedPreset.requiredEquipment.length
                ? selectedPreset.requiredEquipment.join(", ")
                : "Determined after catalog mapping"}
            </p>
          </div>
        </div>

        {selectedPreset.schedule.length ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Proposed weekly schedule</p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              {selectedPreset.schedule.map((entry) => {
                const sessionName = entry.sessionKey
                  ? selectedPreset.sessions.find((session) => session.key === entry.sessionKey)?.name ?? "Session"
                  : "Rest";
                return (
                  <li key={`${selectedPreset.id}-${entry.weekday}`} className="text-xs text-zinc-300">
                    {entry.weekdayLabel}: {sessionName}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-2 space-y-2">
          {selectedPreset.sessions.map((session) => (
            <div key={`${selectedPreset.id}-${session.key}`} className="rounded-lg border border-white/10 bg-black/25 p-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                  {session.name}
                </p>
                <p className="text-[11px] text-zinc-500">~{session.estimatedDurationMinutes} min</p>
              </div>
              <ul className="mt-1 space-y-1">
                {session.exercises.map((exercise) => {
                  const repRange = formatRepRange(exercise.repMin, exercise.repMax);
                  const restLabel = formatRestGuidance(exercise.restSecondsMin, exercise.restSecondsMax);
                  return (
                    <li key={`${session.key}-${exercise.key}`} className="text-xs text-zinc-300">
                      <span className="font-medium">
                        {exercise.resolvedName ?? exercise.requestedName}
                      </span>
                      {exercise.substitutionUsed &&
                      exercise.substitutionUsed.toLowerCase() !== exercise.requestedName.toLowerCase() ? (
                        <span className="text-zinc-500"> (catalog match for {exercise.requestedName})</span>
                      ) : null}
                      : {exercise.workingSets} x {repRange}
                      {exercise.isPerLeg ? " per leg" : ""} reps; rest {restLabel}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {selectedPreset.focusWarning ? (
          <p className="mt-2 text-xs text-amber-200">{selectedPreset.focusWarning}</p>
        ) : null}

        <div className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Shared training guidance</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-zinc-300">
            {SHARED_TRAINING_GUIDANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {selectedMissing.length ? (
          <div className="mt-2 rounded-lg border border-amber-300/35 bg-amber-500/10 p-2">
            <p className="text-xs font-semibold text-amber-100">Catalog mappings need review before import</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-200">
              {selectedMissing.map((entry) => (
                <li key={`${entry.sessionName}-${entry.requestedName}`}>
                  {entry.requestedName} ({entry.sessionName}) not found. Candidates checked:{" "}
                  {entry.catalogCandidates.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPreset.kind === "weekly_program" ? (
            <>
              <Button
                type="button"
                onClick={() => handleSavePreset(selectedPreset.id)}
                disabled={isPending || selectedMissing.length > 0}
                variant="secondary"
                size="sm"
                className="h-9 rounded-lg px-3 text-xs"
              >
                {isPending ? "Saving..." : "Save Templates Only"}
              </Button>
              {confirmApplyPresetId === selectedPreset.id ? (
                <>
                  <Button
                    type="button"
                    onClick={() => handleApplyPreset(selectedPreset.id, true)}
                    disabled={isPending || selectedMissing.length > 0}
                    variant="primary"
                    size="sm"
                    className="h-9 rounded-lg px-3 text-xs"
                  >
                    {isPending ? "Applying..." : "Confirm Replace and Use Plan"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setConfirmApplyPresetId(null)}
                    disabled={isPending}
                    variant="secondary"
                    size="sm"
                    className="h-9 rounded-lg px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleApplyPreset(selectedPreset.id, false)}
                  disabled={isPending || selectedMissing.length > 0}
                  variant="primary"
                  size="sm"
                  className="h-9 rounded-lg px-3 text-xs"
                >
                  {isPending ? "Applying..." : "Use Plan"}
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              onClick={() => handleSavePreset(selectedPreset.id)}
              disabled={isPending || selectedMissing.length > 0}
              variant="primary"
              size="sm"
              className="h-9 rounded-lg px-3 text-xs"
            >
              {isPending ? "Saving..." : "Save Workout"}
            </Button>
          )}
        </div>
      </div>

      {feedback ? (
        <Toast tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.message}
        </Toast>
      ) : null}
    </div>
  );
}
