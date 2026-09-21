import type { PlannerDayPlan } from "./planner";

interface WorkoutLike {
  id: string;
  name: string;
  workout_date: string;
}

export type HomeTodayWorkoutState =
  | "no_program"
  | "none"
  | "scheduled"
  | "active"
  | "completed"
  | "rest"
  | "skipped"
  | "moved";

export interface ResolveHomeTodayWorkoutInput {
  todayDate: string;
  weekdayLabel: string;
  todayPlan: PlannerDayPlan | null;
  activeWorkout: WorkoutLike | null;
  todaysCompletedWorkout: WorkoutLike | null;
  plannerUninitialized: boolean;
}

export interface HomeTodayWorkoutResolution {
  state: HomeTodayWorkoutState;
  weekdayLabel: string;
  workoutName: string;
  templateId: string | null;
  workoutId: string | null;
  isActiveWorkoutSameAsPlanned: boolean;
}

export function isActiveWorkoutSameAsTodayPlan(input: {
  todayDate: string;
  todayPlan: PlannerDayPlan | null;
  activeWorkout: WorkoutLike | null;
  todaysCompletedWorkout: WorkoutLike | null;
}): boolean {
  const { todayDate, todayPlan, activeWorkout, todaysCompletedWorkout } = input;
  if (!activeWorkout) {
    return false;
  }

  const todayPlannedName =
    todayPlan?.template_name ?? todaysCompletedWorkout?.name ?? (todayPlan?.status === "rest" ? "Rest Day" : "No plan scheduled");

  if ((todayPlan?.workout_id && todayPlan.workout_id === activeWorkout.id) || (todaysCompletedWorkout?.id && todaysCompletedWorkout.id === activeWorkout.id)) {
    return true;
  }

  return (
    activeWorkout.workout_date === todayDate &&
    !!todayPlan &&
    todayPlan.status !== "rest" &&
    !!todayPlannedName &&
    !!activeWorkout.name &&
    todayPlannedName.trim().toLowerCase() === activeWorkout.name.trim().toLowerCase()
  );
}

export function resolveHomeTodayWorkout(input: ResolveHomeTodayWorkoutInput): HomeTodayWorkoutResolution {
  const {
    todayDate,
    weekdayLabel,
    todayPlan,
    activeWorkout,
    todaysCompletedWorkout,
    plannerUninitialized,
  } = input;

  const planStatus = todaysCompletedWorkout ? "completed" : todayPlan?.status ?? "none";
  const baseWorkoutName = todayPlan?.template_name ?? todaysCompletedWorkout?.name ?? "No workout scheduled";
  const activeMatchesPlan = isActiveWorkoutSameAsTodayPlan({
    todayDate,
    todayPlan,
    activeWorkout,
    todaysCompletedWorkout,
  });

  if (plannerUninitialized) {
    return {
      state: "no_program",
      weekdayLabel,
      workoutName: "No workout planned today",
      templateId: null,
      workoutId: null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  if (activeMatchesPlan && activeWorkout) {
    return {
      state: "active",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: todayPlan?.template_name ?? activeWorkout.name,
      templateId: todayPlan?.template_id ?? null,
      workoutId: activeWorkout.id,
      isActiveWorkoutSameAsPlanned: true,
    };
  }

  if (planStatus === "completed") {
    return {
      state: "completed",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: baseWorkoutName,
      templateId: todayPlan?.template_id ?? null,
      workoutId: todaysCompletedWorkout?.id ?? todayPlan?.workout_id ?? null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  if (planStatus === "rest") {
    return {
      state: "rest",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: "Rest Day",
      templateId: null,
      workoutId: null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  if (planStatus === "skipped") {
    return {
      state: "skipped",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: baseWorkoutName,
      templateId: todayPlan?.template_id ?? null,
      workoutId: null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  if (planStatus === "moved") {
    return {
      state: "moved",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: baseWorkoutName,
      templateId: todayPlan?.template_id ?? null,
      workoutId: null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  if (planStatus === "scheduled") {
    return {
      state: "scheduled",
      weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
      workoutName: baseWorkoutName,
      templateId: todayPlan?.template_id ?? null,
      workoutId: null,
      isActiveWorkoutSameAsPlanned: false,
    };
  }

  return {
    state: "none",
    weekdayLabel: todayPlan?.weekday_label ?? weekdayLabel,
    workoutName: "No workout scheduled",
    templateId: null,
    workoutId: null,
    isActiveWorkoutSameAsPlanned: false,
  };
}

export function formatTodayWorkoutHeadline(resolved: HomeTodayWorkoutResolution): string {
  if (resolved.state === "no_program") {
    return resolved.workoutName;
  }
  return `${resolved.weekdayLabel} — ${resolved.workoutName}`;
}
