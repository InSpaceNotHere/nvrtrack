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
  initialPresetId?: ReadyMadePresetId | null;
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

function formatEquipmentLabel(preset: ReadyMadePresetResolvedDefinition): string {
  return preset.requiredEquipment.length
    ? preset.requiredEquipment.join(" / ")
    : "Determined after catalog mapping";
}

export function ReadyMadePlansLibrary({
  presets,
  missingExercises,
  initialPresetId = null,
}: ReadyMadePlansLibraryProps) {
  const router = useRouter();
  const [selectedPresetId, setSelectedPresetId] = useState<ReadyMadePresetId>(
    initialPresetId ?? presets[0]?.id ?? "full-body-basics",
  );
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(Boolean(initialPresetId));
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
  const [selectedSessionKeyByPreset, setSelectedSessionKeyByPreset] = useState<Record<string, string>>({});
  const selectedMissing = useMemo(
    () => missingExercises.filter((entry) => entry.presetId === selectedPresetId),
    [missingExercises, selectedPresetId],
  );
  const selectedSessionKey = selectedPreset
    ? selectedSessionKeyByPreset[selectedPreset.id] ??
      selectedPreset.schedule.find((entry) => entry.sessionKey)?.sessionKey ??
      selectedPreset.sessions[0]?.key ??
      ""
    : "";
  const selectedSession = selectedPreset
    ? selectedPreset.sessions.find((session) => session.key === selectedSessionKey) ?? selectedPreset.sessions[0] ?? null
    : null;
  const selectedDayCount = selectedPreset
    ? selectedPreset.schedule.filter((entry) => entry.sessionKey !== null).length
    : 0;
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

  function openPresetDetail(presetId: ReadyMadePresetId) {
    setSelectedPresetId(presetId);
    setConfirmApplyPresetId(null);
    setIsDetailOpen(true);
    router.push(`/training?view=plans&preset=${presetId}#ready-made-plans`, { scroll: false });
  }

  function closePresetDetail() {
    setConfirmApplyPresetId(null);
    setIsDetailOpen(false);
    router.replace("/training?view=plans#ready-made-plans", { scroll: false });
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
      {!isDetailOpen ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {presets.map((preset) => {
            const missing = hasMissingMappings(preset.id, missingExercises);
            const dayCount = preset.schedule.filter((entry) => entry.sessionKey !== null).length;
            return (
              <article
                key={preset.id}
                className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-zinc-100">{preset.title}</p>
                      <StateChip
                        state={preset.kind === "weekly_program" ? "planned" : "warning"}
                        label={preset.kind === "weekly_program" ? "Program" : "Focused"}
                        className="text-[10px]"
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {preset.kind === "weekly_program" ? `${dayCount} days/week` : "Single session"}
                      {" • "}
                      {formatSessionDurationLabel(preset)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{preset.subtitle}</p>
                    {preset.startHereHint ? (
                      <p className="mt-0.5 text-[11px] text-emerald-300">{preset.startHereHint}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    onClick={() => openPresetDetail(preset.id)}
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 rounded-md px-2.5 text-xs"
                  >
                    Preview
                  </Button>
                </div>
                {missing ? (
                  <div className="mt-2">
                    <StateChip state="warning" label="Needs mapping review" className="text-[10px]" />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {isDetailOpen ? (
        <div className="space-y-3 rounded-lg bg-black/20 px-1 py-1">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              onClick={closePresetDetail}
              variant="secondary"
              size="sm"
              className="h-8 rounded-md px-2.5 text-xs"
            >
              ← Plans
            </Button>
            {selectedPreset.startHereHint ? (
              <p className="text-[11px] text-emerald-300">{selectedPreset.startHereHint}</p>
            ) : null}
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-100">{selectedPreset.title}</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {selectedPreset.kind === "weekly_program"
                ? `Program • ${selectedDayCount} days/week`
                : "Focused workout • Single session"}
            </p>
            <p className="mt-2 text-xs text-zinc-300">{selectedPreset.summary}</p>
          </div>

          <div className="grid gap-2 border-t border-white/10 pt-3 text-xs sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Commitment</p>
              <p className="mt-0.5 text-zinc-200">{selectedPreset.weeklyCommitment}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Session duration</p>
              <p className="mt-0.5 text-zinc-200">{formatSessionDurationLabel(selectedPreset)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Equipment</p>
              <p className="mt-0.5 text-zinc-200">{formatEquipmentLabel(selectedPreset)}</p>
            </div>
          </div>

          {selectedPreset.schedule.length ? (
            <section className="border-t border-white/10 pt-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Week</p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              {selectedPreset.schedule.map((entry) => {
                const sessionName = entry.sessionKey
                  ? selectedPreset.sessions.find((session) => session.key === entry.sessionKey)?.name ?? "Session"
                  : "Rest";
                return (
                    <li key={`${selectedPreset.id}-${entry.weekday}`} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                      <span className="font-medium text-zinc-500">{entry.weekdayLabel.slice(0, 3).toUpperCase()}</span>
                      <span className={sessionName === "Rest" ? "text-zinc-500" : "text-zinc-200"}>{sessionName}</span>
                  </li>
                );
              })}
            </ul>
            </section>
          ) : null}

          {selectedPreset.kind === "weekly_program" && selectedPreset.sessions.length > 1 ? (
            <section className="border-t border-white/10 pt-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-500">Session</p>
              <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                {selectedPreset.sessions.map((session) => {
                  const active = session.key === selectedSession?.key;
                  return (
                    <button
                      key={`${selectedPreset.id}-${session.key}`}
                      type="button"
                      onClick={() =>
                        setSelectedSessionKeyByPreset((current) => ({
                          ...current,
                          [selectedPreset.id]: session.key,
                        }))
                      }
                      className={`shrink-0 rounded-md border px-2.5 py-1 text-xs ${
                        active
                          ? "border-white bg-white text-black"
                          : "border-white/15 bg-black/30 text-zinc-200"
                      }`}
                      aria-pressed={active}
                    >
                      {session.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selectedSession ? (
            <section className="border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-200">
                  {selectedSession.name}
                </p>
                <p className="text-[11px] text-zinc-500">~{selectedSession.estimatedDurationMinutes} min</p>
              </div>
              <ul className="mt-2 divide-y divide-white/5">
                {selectedSession.exercises.map((exercise) => {
                  const repRange = formatRepRange(exercise.repMin, exercise.repMax);
                  const restLabel = formatRestGuidance(exercise.restSecondsMin, exercise.restSecondsMax);
                  return (
                    <li key={`${selectedSession.key}-${exercise.key}`} className="flex items-start justify-between gap-3 py-1.5 text-xs text-zinc-300">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">
                          {exercise.resolvedName ?? exercise.requestedName}
                        </p>
                        {exercise.substitutionUsed &&
                        exercise.substitutionUsed.toLowerCase() !== exercise.requestedName.toLowerCase() ? (
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            Catalog match for {exercise.requestedName}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-zinc-200">
                          {exercise.workingSets} × {repRange}
                          {exercise.isPerLeg ? " per leg" : ""}
                        </p>
                        <p className="text-[10px] text-zinc-500">{restLabel} rest</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <details className="border-t border-white/10 pt-3">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
              Training guidance
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-300">
              {SHARED_TRAINING_GUIDANCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>

          {selectedPreset.focusWarning ? (
            <p className="text-xs text-amber-200">{selectedPreset.focusWarning}</p>
          ) : null}

          {selectedMissing.length ? (
            <div className="rounded-md border border-amber-300/35 bg-amber-500/10 p-2">
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

          <div className="border-t border-white/10 pt-3">
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {selectedPreset.kind === "weekly_program" ? (
                <>
                  {confirmApplyPresetId === selectedPreset.id ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleApplyPreset(selectedPreset.id, true)}
                        disabled={isPending || selectedMissing.length > 0}
                        variant="primary"
                        size="sm"
                        className="h-9 w-full rounded-lg px-3 text-xs sm:w-auto"
                      >
                        {isPending ? "Applying..." : "Confirm Replace and Use Plan"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setConfirmApplyPresetId(null)}
                        disabled={isPending}
                        variant="secondary"
                        size="sm"
                        className="h-9 w-full rounded-lg px-3 text-xs sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleApplyPreset(selectedPreset.id, false)}
                        disabled={isPending || selectedMissing.length > 0}
                        variant="primary"
                        size="sm"
                        className="h-9 w-full rounded-lg px-3 text-xs sm:w-auto"
                      >
                        {isPending ? "Applying..." : "Use Plan"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSavePreset(selectedPreset.id)}
                        disabled={isPending || selectedMissing.length > 0}
                        variant="secondary"
                        size="sm"
                        className="h-9 w-full rounded-lg px-3 text-xs sm:w-auto"
                      >
                        {isPending ? "Saving..." : "Save Templates Only"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleSavePreset(selectedPreset.id)}
                  disabled={isPending || selectedMissing.length > 0}
                  variant="primary"
                  size="sm"
                  className="h-9 w-full rounded-lg px-3 text-xs sm:w-auto"
                >
                  {isPending ? "Saving..." : "Save Workout"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <Toast tone={feedback.tone} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.message}
        </Toast>
      ) : null}
    </div>
  );
}
