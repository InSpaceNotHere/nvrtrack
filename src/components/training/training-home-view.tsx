"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { removeCurrentProgramAction } from "@/app/(protected)/actions/planner-actions";
import { WorkoutCardPrimaryActionButton } from "@/components/dashboard/workout-card-primary-action";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import type { CurrentProgramSummary } from "@/lib/training/current-program";

export type TrainingWeekStatus = "none" | "rest" | "scheduled" | "completed" | "skipped" | "moved" | "active";

export interface TrainingWeekDay {
  date: string;
  weekdayLabel: string;
  status: TrainingWeekStatus;
  workoutLabel: string;
}

export interface TrainingActiveSession {
  workoutId: string;
  workoutName: string;
  elapsedLabel: string;
  exerciseCount: number;
  completedSetCount: number;
  totalSetCount: number;
}

export interface TrainingTodaySummary {
  status: TrainingWeekStatus;
  workoutName: string;
  exerciseCount: number;
  durationMinutes: number | null;
  muscleFocus: string | null;
  actionLabel: string;
  actionHref: string | null;
  startScheduled: boolean;
}

interface TrainingHomeViewProps {
  fixtureLabel: string | null;
  activeSession: TrainingActiveSession | null;
  hideTodayWhenActive: boolean;
  todaySummary: TrainingTodaySummary;
  program: CurrentProgramSummary | null;
  hasAssignedProgram: boolean;
  weekStrip: TrainingWeekDay[];
  todayDate: string;
  completedThisWeek: number;
  recentWorkout: { workoutName: string; workoutDateLabel: string; workoutHref: string } | null;
}

function toState(status: string): "planned" | "completed" | "skipped" | "moved" | "rest" | "missing" | "active" {
  if (status === "scheduled") return "planned";
  if (status === "completed") return "completed";
  if (status === "skipped") return "skipped";
  if (status === "moved") return "moved";
  if (status === "rest") return "rest";
  if (status === "active") return "active";
  return "missing";
}

function weekDotClass(status: TrainingWeekStatus): string {
  if (status === "completed") return "bg-emerald-400";
  if (status === "active") return "bg-[#87a3ff]";
  if (status === "scheduled") return "bg-sky-400";
  if (status === "rest") return "bg-zinc-600";
  if (status === "skipped" || status === "moved") return "bg-amber-400";
  return "bg-zinc-800";
}

export function TrainingHomeView({
  fixtureLabel,
  activeSession,
  hideTodayWhenActive,
  todaySummary,
  program,
  hasAssignedProgram,
  weekStrip,
  todayDate,
  completedThisWeek,
  recentWorkout,
}: TrainingHomeViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();
  const removingRef = useRef(false);

  const programVisible = hasAssignedProgram && !removed;
  const today = removed && !activeSession
    ? { ...todaySummary, status: "none" as const, workoutName: "No program selected", startScheduled: false, actionHref: null }
    : todaySummary;
  const showToday = !activeSession || !hideTodayWhenActive;

  function handleRemove() {
    if (removingRef.current) {
      return;
    }
    removingRef.current = true;
    setMessage(null);
    startTransition(async () => {
      const result = await removeCurrentProgramAction();
      if (result.status === "error") {
        removingRef.current = false;
        setMessageTone("error");
        setMessage(result.message);
        return;
      }
      setRemoved(true);
      setConfirmOpen(false);
      setMessageTone("success");
      setMessage(result.message);
      removingRef.current = false;
    });
  }

  return (
    <div className="space-y-5">
      {fixtureLabel ? (
        <p className="text-[11px] text-zinc-500">
          Fixture preview: {fixtureLabel}
        </p>
      ) : null}

      {activeSession ? (
        <section data-testid="training-active-hero" className="rounded-3xl bg-gradient-to-b from-[#121a2c] to-[#0b0f18] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Now</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-white">{activeSession.workoutName}</h2>
            <StateChip state="active" className="text-[10px]" />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {activeSession.elapsedLabel}
            <span className="text-zinc-700"> · </span>
            {activeSession.exerciseCount} exercises
            <span className="text-zinc-700"> · </span>
            {activeSession.completedSetCount}/{activeSession.totalSetCount} sets
          </p>
          <Link
            href={`/training/workouts/${activeSession.workoutId}`}
            className="ds-press mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Resume Workout
          </Link>
          {showToday && !removed && today.status === "scheduled" ? (
            <p className="mt-2 text-[11px] text-zinc-500">Scheduled today: {today.workoutName}</p>
          ) : null}
        </section>
      ) : today.status === "rest" ? (
        <section data-testid="training-today-hero" className="px-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Today</p>
          <h2 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-white">Rest Day</h2>
          <p className="mt-1 text-sm text-zinc-400">Recovery day. Keep the schedule, or change your program below.</p>
        </section>
      ) : programVisible || today.status !== "none" ? (
        <section data-testid="training-today-hero" className="rounded-3xl bg-gradient-to-b from-[#121a2c] to-[#0b0f18] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Today</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-white">{today.workoutName}</h2>
            <StateChip state={toState(today.status)} className="text-[10px]" />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {today.exerciseCount} exercises
            {today.durationMinutes !== null ? ` · ~${today.durationMinutes} min` : ""}
          </p>
          {today.muscleFocus ? <p className="mt-1 text-[11px] text-zinc-500">{today.muscleFocus}</p> : null}
          {today.startScheduled ? (
            <div className="mt-3">
              <WorkoutCardPrimaryActionButton action={{ kind: "start-scheduled", label: "Start Workout" }} />
            </div>
          ) : today.actionHref ? (
            <Link
              href={today.actionHref}
              className="ds-press mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              {today.actionLabel}
            </Link>
          ) : null}
        </section>
      ) : null}

      {programVisible && program ? (
        <section data-testid="training-current-program" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Current Program</p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{program.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {program.frequencyLabel}
                {program.splitLabel ? ` · ${program.splitLabel}` : ""}
              </p>
              {program.nextLabel ? <p className="mt-0.5 text-[11px] text-zinc-500">Next: {program.nextLabel}</p> : null}
            </div>
            <Link href="/training?view=program" className="shrink-0 text-[11px] font-medium text-[#9db4ff]">
              View / Manage
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <Link href="/training?view=plans" className="text-[12px] font-medium text-zinc-200">
              Change Program
            </Link>
            <button
              type="button"
              data-testid="training-remove-program"
              onClick={() => setConfirmOpen(true)}
              className="text-[12px] font-medium text-rose-300"
            >
              Remove Program
            </button>
          </div>
        </section>
      ) : (
        <section data-testid="training-no-program" className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Current Program</p>
          <p className="text-base font-semibold text-white">No program selected</p>
          <Link
            href="/training?view=plans"
            data-testid="training-choose-plan"
            className="ds-press inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Choose a Plan
          </Link>
          <Link href="/training?view=program" className="block text-center text-[12px] font-medium text-zinc-400">
            Create / Manage Custom Program
          </Link>
        </section>
      )}

      <section data-testid="training-week-strip" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">This Week</p>
          <p className="text-[11px] text-zinc-600">{completedThisWeek} done</p>
        </div>
        <ul className="grid grid-cols-7 gap-1">
          {(removed ? weekStrip.map((day) => ({ ...day, status: day.status === "completed" ? day.status : ("none" as const), workoutLabel: day.status === "completed" ? day.workoutLabel : "—" })) : weekStrip).map(
            (day) => {
              const isToday = day.date === todayDate;
              return (
                <li
                  key={day.date}
                  className={`px-0.5 py-1 text-center ${isToday ? "rounded-lg bg-white/6" : ""}`}
                >
                  <p className={`text-[10px] uppercase tracking-[0.08em] ${isToday ? "text-zinc-200" : "text-zinc-600"}`}>
                    {day.weekdayLabel}
                  </p>
                  <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${weekDotClass(day.status)}`} aria-hidden="true" />
                  <p className="mt-1 truncate text-[9px] text-zinc-500">{day.workoutLabel}</p>
                </li>
              );
            },
          )}
        </ul>
        <Link href="/training?view=program" className="text-[11px] font-medium text-zinc-500">
          Full planner
        </Link>
      </section>

      <section className="space-y-1 border-t border-white/8 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">More</p>
        <Link href="/training/history" className="flex h-10 items-center justify-between text-sm text-zinc-200">
          Workout History
          <span className="text-zinc-600">›</span>
        </Link>
        <Link href="/training/exercises" className="flex h-10 items-center justify-between text-sm text-zinc-200">
          Exercise Library
          <span className="text-zinc-600">›</span>
        </Link>
      </section>

      {recentWorkout ? (
        <section className="space-y-1 border-t border-white/8 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Recent</p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{recentWorkout.workoutName}</p>
              <p className="text-[11px] text-zinc-500">{recentWorkout.workoutDateLabel}</p>
            </div>
            <Link href="/training/history" className="shrink-0 text-[11px] font-medium text-[#9db4ff]">
              View History
            </Link>
          </div>
        </section>
      ) : null}

      {message ? (
        <Toast tone={messageTone === "error" ? "error" : "success"} role={messageTone === "error" ? "alert" : "status"}>
          {message}
        </Toast>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-program-title"
            data-testid="training-remove-confirm"
            className="w-full max-w-md rounded-t-3xl bg-[#10151f] px-4 pb-4 pt-3"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
            <h2 id="remove-program-title" className="text-lg font-semibold text-white">
              Remove this program?
            </h2>
            <p className="mt-2 text-sm leading-5 text-zinc-400">
              {program?.name ?? "This program"} will leave your weekly schedule. Completed workouts, PRs, logged sets, and
              saved templates stay. You can choose a new plan anytime.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={handleRemove}
              className="ds-press mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-rose-400 text-sm font-semibold text-black disabled:opacity-70"
            >
              {isPending ? "Removing..." : "Remove Program"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmOpen(false)}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-zinc-300"
            >
              Keep Program
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
