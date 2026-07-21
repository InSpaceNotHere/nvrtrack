"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { quickStartWorkoutFromTemplateAction } from "@/app/(protected)/actions/planner-actions";
import { MuscleMap } from "@/components/training/muscle-map";
import { Card } from "@/components/ui/card";
import type { PlannerDayPlan, PlannerTemplateExercise } from "@/lib/training/planner";

interface TodaysWorkoutPlannerCardProps {
  todayPlan: PlannerDayPlan | null;
  templateExercises: PlannerTemplateExercise[];
}

export function TodaysWorkoutPlannerCard({ todayPlan, templateExercises }: TodaysWorkoutPlannerCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function quickStart() {
    if (!todayPlan?.template_id) {
      return;
    }
    const exercises = templateExercises
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
        setMessage(result.message);
        setIsError(false);
        router.push(`/training/workouts/${result.workoutId}`);
        return;
      }
      setMessage(result.message);
      setIsError(true);
    });
  }

  if (!todayPlan || !todayPlan.template_id) {
    return (
      <Card title="Today&apos;s Workout Plan">
        <p className="text-sm text-zinc-300">No template assigned for today.</p>
        <p className="mt-1 text-xs text-zinc-500">Set your weekly schedule in Training → Workout Planner.</p>
      </Card>
    );
  }

  return (
    <Card title="Today&apos;s Workout Plan">
      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-base font-semibold text-white">{todayPlan.template_name}</p>
        <p className="text-xs text-zinc-500">
          {todayPlan.exercise_count} exercises • {todayPlan.estimated_duration_minutes ?? 0} min • {todayPlan.status}
        </p>
        <MuscleMap aggregation={todayPlan.muscle_targeting} testId="dashboard-today-muscle-map" />
        <button
          type="button"
          disabled={isPending}
          onClick={quickStart}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:bg-zinc-300"
        >
          {isPending ? "Starting..." : "Quick Start"}
        </button>
      </div>
      {message ? (
        <p
          role={isError ? "alert" : "status"}
          className={`mt-2 rounded-md px-2.5 py-1.5 text-xs ${
            isError ? "border border-rose-400/35 bg-rose-500/10 text-rose-200" : "border border-accent/35 bg-accent/10 text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
