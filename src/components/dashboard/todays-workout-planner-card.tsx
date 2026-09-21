"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { quickStartWorkoutFromTemplateAction } from "@/app/(protected)/actions/planner-actions";
import { MuscleMap } from "@/components/training/muscle-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricValue } from "@/components/ui/metric-value";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import type { PlannerDayPlan } from "@/lib/training/planner";

interface TodaysWorkoutPlannerCardProps {
  todayPlan: PlannerDayPlan | null;
}

export function TodaysWorkoutPlannerCard({ todayPlan }: TodaysWorkoutPlannerCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function quickStart() {
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
      <Card title="Today&apos;s Workout Plan" variant="secondary">
        <p className="text-sm text-zinc-300">No template assigned for today.</p>
        <p className="mt-1 text-xs text-zinc-500">Set your weekly schedule in Training → Workout Planner.</p>
      </Card>
    );
  }

  return (
    <Card title="Today&apos;s Workout Plan" variant="secondary">
      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-base font-semibold text-white">{todayPlan.template_name}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <StateChip state={todayPlan.status === "completed" ? "completed" : todayPlan.status === "scheduled" ? "planned" : "neutral"} label={todayPlan.status} />
          <MetricValue value={String(todayPlan.exercise_count)} unit="exercises" tone="secondary" className="text-base" />
          <span>•</span>
          <MetricValue value={String(todayPlan.estimated_duration_minutes ?? 0)} unit="min" tone="secondary" className="text-base" />
        </div>
        <MuscleMap aggregation={todayPlan.muscle_targeting} testId="dashboard-today-muscle-map" />
        <Button type="button" disabled={isPending} onClick={quickStart} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
          {isPending ? "Starting..." : "Quick Start"}
        </Button>
      </div>
      {message ? (
        <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"} className="mt-2 text-xs">
          {message}
        </Toast>
      ) : null}
    </Card>
  );
}
