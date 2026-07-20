"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  assignTemplateToWeekdayAction,
  clearScheduleOverrideAction,
  createWorkoutTemplateAction,
  duplicateWorkoutTemplateAction,
  moveScheduledWorkoutAction,
  quickStartWorkoutFromTemplateAction,
  skipScheduledWorkoutAction,
} from "@/app/(protected)/actions/planner-actions";
import { MuscleMap } from "@/components/training/muscle-map";
import { Card } from "@/components/ui/card";
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
}: WorkoutPlannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState<PlannerTemplate["template_type"]>("custom");
  const [duration, setDuration] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
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
    const exercises = (templateExercises ?? [])
      .filter((exercise) => exercise.template_id === todayPlan.template_id)
      .map((exercise) => ({
        exercise_id: exercise.exercise_id ?? null,
        catalog_exercise_id: exercise.catalog_exercise_id ?? null,
        exercise_name: exercise.exercise_name,
      }));
    startTransition(async () => {
      const result = await quickStartWorkoutFromTemplateAction({
        templateId: todayPlan.template_id!,
        templateName: todayPlan.template_name ?? "Workout",
        workoutDate: todayPlan.date,
        exercises,
      });
      if (result.status === "success" && result.workoutId) {
        setFeedback(result.message, "success");
        router.push(`/training/workouts/${result.workoutId}`);
        return;
      }
      setFeedback(result.message, "error");
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
      <Card title="Workout Planner">
        {todayPlan ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-zinc-100">Today&apos;s Workout</p>
            <p className="text-base font-semibold text-white">{todayPlan.template_name ?? "Rest / Unscheduled"}</p>
            <p className="text-xs text-zinc-400">
              {formatStatus(todayPlan.status)} • {todayPlan.exercise_count} exercises •{" "}
              {todayPlan.estimated_duration_minutes ?? 0} min
            </p>
            {todayPlan.template_id ? (
              <>
                <MuscleMap aggregation={todayPlan.muscle_targeting} testId="today-workout-muscle-map" />
                <button
                  type="button"
                  onClick={handleQuickStart}
                  disabled={isPending}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:bg-zinc-300"
                >
                  Quick Start
                </button>
              </>
            ) : (
              <p className="text-xs text-zinc-500">No workout template assigned for today.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Planner preview unavailable.</p>
        )}

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {WEEKDAYS.map((weekday) => {
            const dayPlan = scheduledByWeekday.get(weekday.value) ?? null;
            return (
              <label key={weekday.value} className="space-y-1.5 text-xs text-zinc-400">
                <span>{weekday.label}</span>
                <select
                  value={dayPlan?.status === "rest" ? "__rest__" : dayPlan?.template_id ?? ""}
                  onChange={(event) => handleWeekdayAssignment(weekday.value, event.target.value)}
                  className="app-input h-9 text-sm"
                >
                  <option value="">Unassigned</option>
                  <option value="__rest__">Rest Day</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </Card>

      <Card title="Weekly Schedule">
        <ul className="space-y-2">
          {weekPlans.map((plan) => (
            <li key={plan.date} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {plan.weekday_label} • {plan.date}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {plan.template_name ?? "No template"} • {formatStatus(plan.status)} • {plan.exercise_count} exercises
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.status === "scheduled" ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSkip(plan.date)}
                        className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-100 transition-colors hover:bg-white/10"
                      >
                        Skip
                      </button>
                      <input
                        type="date"
                        value={moveTargets[plan.date] ?? ""}
                        onChange={(event) => setMoveTargets((state) => ({ ...state, [plan.date]: event.target.value }))}
                        className="h-7 rounded-md border border-white/12 bg-black/25 px-2 text-[11px] text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleMove(plan.date, plan.template_id, moveTargets[plan.date] ?? "")}
                        className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-100 transition-colors hover:bg-white/10"
                      >
                        Move
                      </button>
                    </div>
                  ) : null}
                  {(plan.status === "skipped" || plan.status === "moved") ? (
                    <button
                      type="button"
                      onClick={() => handleClearOverride(plan.date)}
                      className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-100 transition-colors hover:bg-white/10"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Template Library">
        <ul className="space-y-2">
          {templates.map((template) => {
            const count = (exercisesByTemplateId.get(template.id) ?? []).length;
            return (
              <li key={template.id} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatTemplateType(template.template_type)} • {count} exercises •{" "}
                      {template.estimated_duration_minutes ?? Math.max(15, count * 8)} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTemplateDuplicate(template.id)}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                  >
                    Duplicate
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Create Template">
        <form onSubmit={handleCreateTemplate} className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="app-input h-9 text-sm" required />
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Type</span>
              <select
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
              </select>
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              <span>Duration (min)</span>
              <input
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
            <span>Exercises</span>
            <select
              multiple
              value={selectedExerciseIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setSelectedExerciseIds(values);
              }}
              className="min-h-28 w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
            >
              {exerciseOptions.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500">Hold Ctrl/Cmd to select multiple exercises.</p>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:bg-zinc-300"
          >
            {isPending ? "Saving..." : "Save Template"}
          </button>
        </form>
      </Card>

      {message ? (
        <p
          role={isError ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            isError ? "border border-rose-400/35 bg-rose-500/10 text-rose-200" : "border border-accent/40 bg-accent/10 text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
