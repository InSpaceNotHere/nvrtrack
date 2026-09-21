"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startOrResumeTodayScheduledWorkoutAction } from "@/app/(protected)/actions/planner-actions";
import { Toast } from "@/components/ui/toast";

export type WorkoutCardPrimaryAction =
  | {
      kind: "link";
      label: string;
      href: string;
    }
  | {
      kind: "start-scheduled";
      label: string;
    };

interface WorkoutCardPrimaryActionProps {
  action: WorkoutCardPrimaryAction;
}

export function WorkoutCardPrimaryActionButton({ action }: WorkoutCardPrimaryActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (action.kind === "link") {
    return (
      <Link
        href={action.href}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
      >
        {action.label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setErrorMessage(null);
            const result = await startOrResumeTodayScheduledWorkoutAction();
            if (result.status === "success" && result.workoutId) {
              router.push(`/training/workouts/${result.workoutId}`);
              return;
            }
            setErrorMessage(result.message);
          });
        }}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Starting..." : action.label}
      </button>
      {errorMessage ? (
        <Toast tone="error" role="alert" className="mt-1.5 text-xs">
          {errorMessage}
        </Toast>
      ) : null}
    </>
  );
}
