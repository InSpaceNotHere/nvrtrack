"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  assignTemplateToWeekdayAction,
  clearScheduleOverrideAction,
  createWorkoutTemplateAction,
  duplicateWorkoutTemplateAction,
  initializePlannerDefaultsAction,
  moveScheduledWorkoutAction,
  quickStartWorkoutFromTemplateAction,
  skipScheduledWorkoutAction,
} from "@/app/(protected)/actions/planner-actions";
import { MuscleMap } from "@/components/training/muscle-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import type { PlannerDayPlan, PlannerTemplate, PlannerTemplateExercise } from "@/lib/training/planner";

interface ExerciseOption {
  id: string;
  name: string;
  catalog_exercise_id: string | null;
  exercise_id: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  body_region: string | null;
  movement_pattern: string | null;
}

interface WorkoutPlannerProps {
  templates: PlannerTemplate[];
  templateExercises: PlannerTemplateExercise[];
  weekPlans: PlannerDayPlan[];
  todayPlan: PlannerDayPlan | null;
  exerciseOptions: ExerciseOption[];
  activeWorkout: { id: string; name: string; workout_date: string } | null;
  completedThisWeek: number;
}

const WEEKDAYS: Array<{ value: PlannerDayPlan["weekday"]; label: string }> = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function formatStatus(status: PlannerDayPlan["status"]): string {
  return status.replaceAll("_", " ").replace(/^\w/, (value) => value.toUpperCase());
}

function toPlannerState(status: PlannerDayPlan["status"]): "planned" | "completed" | "skipped" | "moved" | "rest" | "missing" {
  if (status === "scheduled") {
    return "planned";
  }
  if (status === "completed") {
    return "completed";
  }
  if (status === "skipped") {
    return "skipped";
  }
  if (status === "moved") {
    return "moved";
  }
  if (status === "rest") {
    return "rest";
  }
  return "missing";
}

function formatTemplateType(type: string | null): string {
  if (!type) {
    return "Custom";
  }
  return type.replace(/^\w/, (value) => value.toUpperCase());
}

export function WorkoutPlanner({
  templates,
  templateExercises,
  weekPlans,
  todayPlan,
  exerciseOptions,
  activeWorkout,
  completedThisWeek,
}: WorkoutPlannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState<PlannerTemplate["template_type"]>("custom");
  const [duration, setDuration] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});

  const exerciseOptionsById = useMemo(
    () => new Map(exerciseOptions.map((exercise) => [exercise.id, exercise])),
    [exerciseOptions],
  );
  const exercisesByTemplateId = useMemo(() => {
    const map = new Map<string, PlannerTemplateExercise[]>();
    for (const exercise of templateExercises) {
      const list = map.get(exercise.template_id);
      if (list) {
        list.push(exercise);
      } else {
        map.set(exercise.template_id, [exercise]);
      }
    }
    return map;
  }, [templateExercises]);
  const scheduledByWeekday = useMemo(() => new Map(weekPlans.map((plan) => [plan.weekday, plan])), [weekPlans]);
  const isPlannerUninitialized = templates.length === 0 && weekPlans.every((plan) => plan.status === "none");
  const filteredExerciseOptions = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    if (!query) {
      return exerciseOptions;
    }

    return exerciseOptions.filter((exercise) => exercise.name.toLowerCase().includes(query));
  }, [exerciseOptions, exerciseSearch]);
  const selectedExerciseOptions = useMemo(
    () => selectedExerciseIds.map((id) => exerciseOptionsById.get(id)).filter((value): value is ExerciseOption => Boolean(value)),
    [exerciseOptionsById, selectedExerciseIds],
  );

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function handleCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedOptions = selectedExerciseIds
      .map((id) => exerciseOptionsById.get(id))
      .filter((value): value is ExerciseOption => Boolean(value));
    startTransition(async () => {
      const result = await createWorkoutTemplateAction({
        name,
        templateType,
        estimatedDurationMinutes: duration,
        exercises: selectedOptions.map((exercise) => ({
          catalog_exercise_id: exercise.catalog_exercise_id,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.name,
          primary_muscles: exercise.primary_muscles,
          secondary_muscles: exercise.secondary_muscles,
          body_region: exercise.body_region,
          movement_pattern: exercise.movement_pattern,
        })),
      });
      if (result.status === "success") {
        setName("");
        setTemplateType("custom");
        setDuration("");
        setSelectedExerciseIds([]);
        setFeedback(result.message, "success");
        router.refresh();
        return;
      }
      setFeedback(result.message, "error");
    });
  }

  function toggleTemplateExercise(exerciseId: string) {
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    );
  }

  function handleTemplateDuplicate(templateId: string) {
    startTransition(async () => {
      const result = await duplicateWorkoutTemplateAction(templateId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleWeekdayAssignment(weekday: number, value: string) {
    startTransition(async () => {
      const result = await assignTemplateToWeekdayAction(weekday, {
        templateId: value ? value : null,
        isRestDay: value === "__rest__",
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleQuickStart() {
    if (!todayPlan?.template_id) {
      return;
    }
    startTransition(async () => {
      const result = await quickStartWorkoutFromTemplateAction({
        templateId: todayPlan.template_id!,
        templateName: todayPlan.template_name ?? "Workout",
        workoutDate: todayPlan.date,
      });
      if (result.status === "success" && result.workoutId) {
        setFeedback(result.message, "success");
        router.push(`/training/workouts/${result.workoutId}`);
        return;
      }
      setFeedback(result.message, "error");
    });
  }

  function handleInitializePlanner() {
    startTransition(async () => {
      const result = await initializePlannerDefaultsAction();
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleSkip(planDate: string) {
    startTransition(async () => {
      const result = await skipScheduledWorkoutAction(planDate);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleMove(planDate: string, templateId: string | null, nextDate: string) {
    if (!nextDate) {
      setFeedback("Choose a destination date before moving.", "error");
      return;
    }
    startTransition(async () => {
      const result = await moveScheduledWorkoutAction({
        fromDate: planDate,
        toDate: nextDate,
        templateId,
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleClearOverride(planDate: string) {
    startTransition(async () => {
      const result = await clearScheduleOverrideAction(planDate);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <Card title="Workout Planner" variant="primary">
        {activeWorkout ? (
          <div className="mb-3 rounded-xl border border-[#87a3ff]/35 bg-[#87a3ff]/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-100">Workout in progress</p>
                <p className="text-xs text-zinc-400">{activeWorkout.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <StateChip state="active" />
                <Link
                  href={`/training/workouts/${activeWorkout.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  Resume Workout
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {todayPlan ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-zinc-100">Today&apos;s Workout</p>
            <p className="text-base font-semibold text-white">{todayPlan.template_name ?? "Rest / Unscheduled"}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <StateChip state={toPlannerState(todayPlan.status)} label={formatStatus(todayPlan.status)} />
              <p className="text-xs text-zinc-400">
                {todayPlan.exercise_count} exercises • {todayPlan.estimated_duration_minutes ?? 0} min
              </p>
            </div>
            {todayPlan.template_id ? (
              <>
                <MuscleMap aggregation={todayPlan.muscle_targeting} testId="today-workout-muscle-map" />
                <Button type="button" onClick={handleQuickStart} disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
                  Quick Start
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">No workout template assigned for today.</p>
                {isPlannerUninitialized ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={handleInitializePlanner} disabled={isPending} variant="secondary" size="sm" className="h-8 rounded-md px-2.5 text-xs">
                      {isPending ? "Setting up..." : "Create Starter Schedule"}
                    </Button>
                    <Link
                      href="/training?view=plans"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                    >
                      Choose a Plan
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Planner preview unavailable.</p>
        )}
      </Card>

      <Card title="This Week" subtitle="Schedule and completion status" variant="secondary">
        <div className="mb-3 flex items-end justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Completed</p>
            <p className="text-xl font-semibold leading-none text-white">{completedThisWeek}</p>
          </div>
          <p className="text-xs text-zinc-500">Mon–Sun week view</p>
        </div>

        <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
          {WEEKDAYS.map((weekday) => {
            const dayPlan = scheduledByWeekday.get(weekday.value) ?? null;
            return (
              <label key={weekday.value} className="space-y-1 text-xs text-zinc-400">
                <span>{weekday.label}</span>
                <Select
                  value={dayPlan?.status === "rest" ? "__rest__" : dayPlan?.template_id ?? ""}
                  onChange={(event) => handleWeekdayAssignment(weekday.value, event.target.value)}
                  className="app-input h-8 text-xs"
                >
                  <option value="">Unassigned</option>
                  <option value="__rest__">Rest Day</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </label>
            );
          })}
        </div>

        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-zinc-300">Weekly Schedule</h3>
        <ul className="space-y-1.5">
          {weekPlans.map((plan) => (
            <li key={plan.date} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-100">
                    {plan.weekday_label} • {plan.date}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StateChip state={toPlannerState(plan.status)} label={formatStatus(plan.status)} />
                    <p className="text-[11px] text-zinc-500">
                      {plan.template_name ?? "No template"} • {plan.exercise_count} exercises
                    </p>
                  </div>
                </div>
                {plan.status === "scheduled" || plan.status === "skipped" || plan.status === "moved" ? (
                  <details className="rounded-md border border-white/10 bg-black/25 px-2 py-1">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                      Manage
                    </summary>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {plan.status === "scheduled" ? (
                        <>
                          <Button type="button" onClick={() => handleSkip(plan.date)} variant="secondary" size="sm" className="h-7 rounded-md px-2 py-1 text-[10px]">
                            Skip
                          </Button>
                          <DatePicker
                            value={moveTargets[plan.date] ?? ""}
                            onChange={(event) => setMoveTargets((state) => ({ ...state, [plan.date]: event.target.value }))}
                            className="h-7 px-2 text-[10px]"
                          />
                          <Button type="button" onClick={() => handleMove(plan.date, plan.template_id, moveTargets[plan.date] ?? "")} variant="secondary" size="sm" className="h-7 rounded-md px-2 py-1 text-[10px]">
                            Move
                          </Button>
                        </>
                      ) : null}
                      {(plan.status === "skipped" || plan.status === "moved") ? (
                        <Button type="button" onClick={() => handleClearOverride(plan.date)} variant="secondary" size="sm" className="h-7 rounded-md px-2 py-1 text-[10px]">
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Program Management" subtitle="Templates and split configuration" variant="tertiary">
        <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">Template Library</summary>
          <ul className="mt-2 space-y-2">
            {templates.map((template) => {
              const count = (exercisesByTemplateId.get(template.id) ?? []).length;
              return (
                <li key={template.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
                      <p className="text-xs text-zinc-500">
                        {formatTemplateType(template.template_type)} • {count} exercises •{" "}
                        {template.estimated_duration_minutes ?? Math.max(15, count * 8)} min
                      </p>
                    </div>
                    <Button type="button" onClick={() => handleTemplateDuplicate(template.id)} variant="secondary" size="sm" className="h-8 rounded-md px-2.5 text-xs">
                      Duplicate
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>

        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2" open={templates.length === 0}>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">Create Template</summary>
          <form onSubmit={handleCreateTemplate} className="mt-2 space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="app-input h-9 text-sm" required />
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Type</span>
              <Select
                value={templateType}
                onChange={(event) => setTemplateType(event.target.value as PlannerTemplate["template_type"])}
                className="app-input h-9 text-sm"
              >
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
                <option value="upper">Upper</option>
                <option value="lower">Lower</option>
                <option value="custom">Custom</option>
              </Select>
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Duration (min)</span>
              <Input
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                type="number"
                min={1}
                max={300}
                className="app-input h-9 text-sm"
              />
            </label>
          </div>

          <label className="space-y-1 text-xs text-zinc-400">
            <span>Exercises ({selectedExerciseIds.length} selected)</span>
            <Input
              value={exerciseSearch}
              onChange={(event) => setExerciseSearch(event.target.value)}
              className="app-input h-9 text-sm"
              placeholder="Search exercises..."
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/12 bg-black/25 p-2">
              {filteredExerciseOptions.length ? (
                <ul className="space-y-1">
                  {filteredExerciseOptions.map((exercise) => {
                    const selected = selectedExerciseIds.includes(exercise.id);
                    return (
                      <li key={exercise.id}>
                        <button
                          type="button"
                          data-testid={`planner-exercise-option-${exercise.id}`}
                          aria-pressed={selected}
                          onClick={() => toggleTemplateExercise(exercise.id)}
                          className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selected
                              ? "border-white bg-white text-black"
                              : "border-white/10 text-zinc-200 hover:bg-white/10"
                          }`}
                        >
                          {exercise.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-1 py-1 text-xs text-zinc-500">No exercises matched your search.</p>
              )}
            </div>
            {selectedExerciseOptions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedExerciseOptions.map((exercise) => (
                  <Button
                    key={`selected-${exercise.id}`}
                    type="button"
                    onClick={() => toggleTemplateExercise(exercise.id)}
                    variant="secondary"
                    size="sm"
                    className="h-6 rounded-md border-white/15 bg-white/10 px-2 py-1 text-[11px] normal-case tracking-normal hover:bg-white/15"
                  >
                    {exercise.name} <span className="ml-1 text-zinc-400">×</span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500">Tap exercises above to include them in this template.</p>
            )}
          </label>

            <Button type="submit" disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
              {isPending ? "Saving..." : "Save Template"}
            </Button>
          </form>
        </details>
      </Card>

      {message ? <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"}>{message}</Toast> : null}
    </div>
  );
}
