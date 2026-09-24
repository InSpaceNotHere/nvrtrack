import Link from "next/link";

import { TrainingHomeView } from "@/components/training/training-home-view";
import { ReadyMadePlansLibrary } from "@/components/training/ready-made-plans-library";
import { WorkoutPlanner } from "@/components/training/workout-planner";
import { Card } from "@/components/ui/card";
import { StateChip } from "@/components/ui/state-chip";
import { getExerciseCatalog } from "@/lib/data/exercise-catalog";
import { getMyExercises } from "@/lib/data/exercises";
import { getMyProfile } from "@/lib/data/profile";
import {
  getMyScheduleOverridesForRange,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
} from "@/lib/data/workout-planner";
import {
  getMyActiveWorkout,
  getMyCompletedWorkouts,
  getMyWorkoutExercisesForWorkoutIds,
  getMyRecentWorkouts,
  getWorkoutSetsForWorkoutExerciseIds,
} from "@/lib/data/workouts";
import { inferCurrentProgramSummary, hasAssignedWeeklyProgram } from "@/lib/training/current-program";
import { sortWorkoutsForHistory } from "@/lib/training/calculations";
import { buildPrimaryFocusLabel } from "@/lib/training/muscle-aggregation";
import { buildWeekDates, buildPlannerWeek, findPlannerDayForDate } from "@/lib/training/planner";
import { buildReadyMadePresetResolution } from "@/lib/training/ready-made-presets";
import { formatCalendarDate, getDateStringInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import {
  buildWorkoutSummaryStats,
  groupSetsByWorkoutExerciseId,
} from "@/lib/training/session";
import type { WorkoutExerciseRow } from "@/lib/training/types";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): "lb" | "kg" {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

function formatDate(date: string): string {
  return formatCalendarDate(date);
}

interface TrainingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

type TrainingFixture = "active-scheduled" | "active-different" | "scheduled" | "rest" | "completed" | "uninitialized";

type WeekStripStatus = "none" | "rest" | "scheduled" | "completed" | "skipped" | "moved" | "active";

interface WeekStripDay {
  date: string;
  weekdayLabel: string;
  status: WeekStripStatus;
  workoutLabel: string;
}

interface ActiveSessionSummary {
  workoutId: string;
  workoutName: string;
  elapsedLabel: string;
  exerciseCount: number;
  completedSetCount: number;
  totalSetCount: number;
}

interface TodayTrainingSummary {
  status: WeekStripStatus;
  workoutName: string;
  exerciseCount: number;
  durationMinutes: number | null;
  muscleFocus: string | null;
  actionLabel: string;
  actionHref: string | null;
  startScheduled: boolean;
}

function toWeekStripStatus(status: string): WeekStripStatus {
  if (status === "scheduled") return "scheduled";
  if (status === "completed") return "completed";
  if (status === "skipped") return "skipped";
  if (status === "moved") return "moved";
  if (status === "rest") return "rest";
  if (status === "active") return "active";
  return "none";
}

function formatElapsedDuration(startedAtIso: string | null | undefined): string {
  if (!startedAtIso) {
    return "Started recently";
  }
  const startedAtMs = Date.parse(startedAtIso);
  if (!Number.isFinite(startedAtMs)) {
    return "Started recently";
  }
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startedAtMs) / 60000));
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m elapsed`;
  }
  return `${minutes}m elapsed`;
}

function shortWorkoutLabel(label: string | null): string {
  if (!label) {
    return "—";
  }
  return label.length <= 8 ? label : `${label.slice(0, 8)}…`;
}

function asSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isFixture(value: string | undefined): value is TrainingFixture {
  return (
    value === "active-scheduled" ||
    value === "active-different" ||
    value === "scheduled" ||
    value === "rest" ||
    value === "completed" ||
    value === "uninitialized"
  );
}

function buildFixtureWeek(weekDates: string[], fixture: TrainingFixture): WeekStripDay[] {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const templates = ["Lower", "Pull", "Push", "Rest", "Upper", "Legs", "Run"];
  const statusPresets: Record<TrainingFixture, WeekStripStatus[]> = {
    "active-scheduled": ["completed", "scheduled", "active", "rest", "scheduled", "skipped", "moved"],
    "active-different": ["completed", "scheduled", "scheduled", "rest", "active", "completed", "rest"],
    scheduled: ["completed", "scheduled", "scheduled", "rest", "scheduled", "completed", "rest"],
    rest: ["completed", "scheduled", "rest", "rest", "scheduled", "completed", "rest"],
    completed: ["completed", "scheduled", "completed", "rest", "scheduled", "completed", "rest"],
    uninitialized: ["none", "none", "none", "none", "none", "none", "none"],
  };
  return weekDates.map((date, index) => {
    const status = statusPresets[fixture][index] ?? "none";
    return {
      date,
      weekdayLabel: weekdays[index] ?? "—",
      status,
      workoutLabel: status === "rest" ? "Rest" : status === "none" ? "None" : templates[index] ?? "Plan",
    };
  });
}

function applyFixturePresentation(
  fixture: TrainingFixture,
  weekDates: string[],
): {
  activeSession: ActiveSessionSummary | null;
  todaySummary: TodayTrainingSummary;
  weekStrip: WeekStripDay[];
  completedThisWeek: number;
  recentContext: { workoutName: string; workoutDate: string; workoutHref: string } | null;
  plannerUninitialized: boolean;
} {
  const weekStrip = buildFixtureWeek(weekDates, fixture);
  if (fixture === "active-scheduled") {
    return {
      activeSession: {
        workoutId: "fixture-active",
        workoutName: "Push Session",
        elapsedLabel: "38m elapsed",
        exerciseCount: 6,
        completedSetCount: 9,
        totalSetCount: 18,
      },
      todaySummary: {
        status: "active",
        workoutName: "Push Session",
        exerciseCount: 6,
        durationMinutes: 65,
        muscleFocus: "Primary focus: chest, front delts, triceps",
        actionLabel: "Resume Workout",
        actionHref: "/training/workouts/fixture-active",
        startScheduled: false,
      },
      weekStrip,
      completedThisWeek: 2,
      recentContext: {
        workoutName: "Lower Strength",
        workoutDate: weekDates[0] ?? "",
        workoutHref: "/training?view=history",
      },
      plannerUninitialized: false,
    };
  }
  if (fixture === "active-different") {
    return {
      activeSession: {
        workoutId: "fixture-active-different",
        workoutName: "Travel Hotel Session",
        elapsedLabel: "22m elapsed",
        exerciseCount: 4,
        completedSetCount: 5,
        totalSetCount: 12,
      },
      todaySummary: {
        status: "scheduled",
        workoutName: "Lower Strength",
        exerciseCount: 5,
        durationMinutes: 55,
        muscleFocus: "Primary focus: quads, glutes, hamstrings",
        actionLabel: "Start Workout",
        actionHref: "/training/start",
        startScheduled: true,
      },
      weekStrip,
      completedThisWeek: 2,
      recentContext: {
        workoutName: "Pull Strength",
        workoutDate: weekDates[0] ?? "",
        workoutHref: "/training?view=history",
      },
      plannerUninitialized: false,
    };
  }
  if (fixture === "scheduled") {
    return {
      activeSession: null,
      todaySummary: {
        status: "scheduled",
        workoutName: "Lower Strength",
        exerciseCount: 5,
        durationMinutes: 55,
        muscleFocus: "Primary focus: quads, glutes, hamstrings",
        actionLabel: "Start Workout",
        actionHref: "/training/start",
        startScheduled: true,
      },
      weekStrip,
      completedThisWeek: 3,
      recentContext: {
        workoutName: "Pull Strength",
        workoutDate: weekDates[1] ?? "",
        workoutHref: "/training?view=history",
      },
      plannerUninitialized: false,
    };
  }
  if (fixture === "rest") {
    return {
      activeSession: null,
      todaySummary: {
        status: "rest",
        workoutName: "Rest Day",
        exerciseCount: 0,
        durationMinutes: null,
        muscleFocus: null,
        actionLabel: "Open Program",
        actionHref: "/training?view=program",
        startScheduled: false,
      },
      weekStrip,
      completedThisWeek: 4,
      recentContext: {
        workoutName: "Upper Hypertrophy",
        workoutDate: weekDates[2] ?? "",
        workoutHref: "/training?view=history",
      },
      plannerUninitialized: false,
    };
  }
  if (fixture === "completed") {
    return {
      activeSession: null,
      todaySummary: {
        status: "completed",
        workoutName: "Lower Strength",
        exerciseCount: 5,
        durationMinutes: 54,
        muscleFocus: "Primary focus: quads, glutes, hamstrings",
        actionLabel: "View Summary",
        actionHref: "/training?view=history",
        startScheduled: false,
      },
      weekStrip,
      completedThisWeek: 5,
      recentContext: {
        workoutName: "Lower Strength",
        workoutDate: weekDates[2] ?? "",
        workoutHref: "/training?view=history",
      },
      plannerUninitialized: false,
    };
  }
  return {
    activeSession: null,
    todaySummary: {
      status: "none",
      workoutName: "No plan scheduled",
      exerciseCount: 0,
      durationMinutes: null,
      muscleFocus: null,
      actionLabel: "Open Program",
      actionHref: "/training?view=program",
      startScheduled: false,
    },
    weekStrip,
    completedThisWeek: 0,
    recentContext: null,
    plannerUninitialized: true,
  };
}

export default async function TrainingPage({ searchParams }: TrainingPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const view = asSingleParam(resolvedSearchParams.view);
  const presetParam = asSingleParam(resolvedSearchParams.preset);
  const fixtureParam = asSingleParam(resolvedSearchParams.fixture);
  const allowFixturePreview = process.env.NODE_ENV !== "production";
  const fixture = allowFixturePreview && isFixture(fixtureParam) ? fixtureParam : null;

  const [activeWorkoutResult, recentWorkoutsResult, profileResult] = await Promise.all([
    getMyActiveWorkout(),
    getMyRecentWorkouts(5),
    getMyProfile(),
  ]);
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getDateStringInTimeZone(profileTimeZone, new Date());
  const referenceDate = new Date(`${todayDate}T12:00:00.000Z`);
  const weekDates = buildWeekDates(referenceDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  const completedWeekWorkoutsResult = await getMyCompletedWorkouts({ startDate: weekStart, endDate: weekEnd });
  const recentWorkouts = sortWorkoutsForHistory(recentWorkoutsResult.data ?? []);
  const activeWorkout = activeWorkoutResult.data ?? null;
  const completedThisWeek = completedWeekWorkoutsResult.data?.length ?? 0;
  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const workoutIdsToLoad = Array.from(
    new Set([
      ...recentWorkouts.map((workout) => workout.id),
      ...(activeWorkout ? [activeWorkout.id] : []),
    ]),
  );
  const workoutExercisesResult = await getMyWorkoutExercisesForWorkoutIds(workoutIdsToLoad);
  const workoutSetsResult = await getWorkoutSetsForWorkoutExerciseIds(
    (workoutExercisesResult.data ?? []).map((exercise) => exercise.id),
  );

  const setsByExerciseId = groupSetsByWorkoutExerciseId(workoutSetsResult.data ?? []);
  const exercisesByWorkoutId = new Map<string, WorkoutExerciseRow[]>();
  for (const exercise of workoutExercisesResult.data ?? []) {
    const list = exercisesByWorkoutId.get(exercise.workout_id);
    if (list) {
      list.push(exercise);
    } else {
      exercisesByWorkoutId.set(exercise.workout_id, [exercise]);
    }
  }

  const [templatesResult, templateExercisesResult, weekdayScheduleResult, scheduleOverridesResult, catalogResult, customExercisesResult] =
    await Promise.all([
      getMyWorkoutTemplates(),
      getMyWorkoutTemplateExercises(),
      getMyWeekdaySchedule(),
      getMyScheduleOverridesForRange(weekStart, weekEnd),
      getExerciseCatalog({ limit: 400 }),
      getMyExercises(),
    ]);
  const plannerWeek = buildPlannerWeek({
    templates: templatesResult.data ?? [],
    templateExercises: templateExercisesResult.data ?? [],
    weekdayScheduleRows: weekdayScheduleResult.data ?? [],
    scheduleOverrideRows: scheduleOverridesResult.data ?? [],
    completedWorkouts: (completedWeekWorkoutsResult.data ?? []).map((workout) => ({
      id: workout.id,
      workout_date: workout.workout_date,
      name: workout.name,
    })),
  });
  const todayPlan = findPlannerDayForDate(plannerWeek, todayDate);
  const todaysCompletedWorkout = [...(completedWeekWorkoutsResult.data ?? [])]
    .filter((workout) => workout.workout_date === todayDate && workout.completed_at !== null)
    .sort((left, right) => Date.parse(right.completed_at ?? right.created_at) - Date.parse(left.completed_at ?? left.created_at))[0];
  const plannerExerciseOptions = [
    ...(catalogResult.data ?? []).map((exercise) => ({
      id: `catalog:${exercise.id}`,
      name: exercise.name,
      catalog_exercise_id: exercise.id,
      exercise_id: null,
      primary_muscles: exercise.primary_muscles ?? [],
      secondary_muscles: exercise.secondary_muscles ?? [],
      body_region: exercise.body_region ?? null,
      movement_pattern: exercise.movement_pattern ?? null,
    })),
    ...(customExercisesResult.data ?? []).map((exercise) => ({
      id: `custom:${exercise.id}`,
      name: exercise.name,
      catalog_exercise_id: null,
      exercise_id: exercise.id,
      primary_muscles: exercise.primary_muscles ?? [],
      secondary_muscles: exercise.secondary_muscles ?? [],
      body_region: exercise.body_region ?? null,
      movement_pattern: exercise.movement_pattern ?? null,
    })),
  ];
  const readyMadeResolution = buildReadyMadePresetResolution(catalogResult.data ?? []);
  const initialPlanPresetId = readyMadeResolution.presets.find((preset) => preset.id === presetParam)?.id ?? null;
  const isPlanDetailView = initialPlanPresetId !== null;

  const dataErrorMessage =
    activeWorkoutResult.error?.message ??
    recentWorkoutsResult.error?.message ??
    completedWeekWorkoutsResult.error?.message ??
    workoutExercisesResult.error?.message ??
    workoutSetsResult.error?.message ??
    templatesResult.error?.message ??
    templateExercisesResult.error?.message ??
    weekdayScheduleResult.error?.message ??
    scheduleOverridesResult.error?.message ??
    catalogResult.error?.message ??
    customExercisesResult.error?.message ??
    profileResult.error?.message ??
    null;

  const workoutSummaryById = new Map<
    string,
    ReturnType<typeof buildWorkoutSummaryStats>
  >();
  for (const workout of recentWorkouts) {
    const summary = buildWorkoutSummaryStats({
      workout,
      exercises: exercisesByWorkoutId.get(workout.id) ?? [],
      setsByExerciseId,
      displayUnit,
    });
    workoutSummaryById.set(workout.id, summary);
  }
  if (activeWorkout && !workoutSummaryById.has(activeWorkout.id)) {
    const summary = buildWorkoutSummaryStats({
      workout: activeWorkout,
      exercises: exercisesByWorkoutId.get(activeWorkout.id) ?? [],
      setsByExerciseId,
      displayUnit,
    });
    workoutSummaryById.set(activeWorkout.id, summary);
  }

  let activeSession: ActiveSessionSummary | null =
    activeWorkout && workoutSummaryById.has(activeWorkout.id)
      ? {
          workoutId: activeWorkout.id,
          workoutName: activeWorkout.name,
          elapsedLabel: formatElapsedDuration(activeWorkout.started_at ?? activeWorkout.created_at),
          exerciseCount: workoutSummaryById.get(activeWorkout.id)?.exerciseCount ?? 0,
          completedSetCount: workoutSummaryById.get(activeWorkout.id)?.completedSetCount ?? 0,
          totalSetCount: workoutSummaryById.get(activeWorkout.id)?.totalSetCount ?? 0,
        }
      : null;

  const todayPlannedStatus: WeekStripStatus = todaysCompletedWorkout
    ? "completed"
    : toWeekStripStatus(todayPlan?.status ?? "none");
  const todayPlannedName =
    todayPlan?.template_name ??
    todaysCompletedWorkout?.name ??
    (todayPlannedStatus === "rest" ? "Rest Day" : "No plan scheduled");
  const todayPlannedActionLabel = todaysCompletedWorkout
    ? "View Summary"
    : todayPlannedStatus === "scheduled"
      ? "Start Workout"
      : "Open Program";
  const todayPlannedActionHref = todaysCompletedWorkout
    ? `/training/workouts/${todaysCompletedWorkout.id}`
    : todayPlannedStatus === "scheduled"
      ? "/training/start"
      : "/training?view=program";

  // Deduplicate when the active workout and today's scheduled workout represent the same underlying session.
  const isActiveWorkoutSameAsToday =
    !!activeWorkout &&
    !!(
      (todayPlan?.workout_id && todayPlan.workout_id === activeWorkout.id) ||
      (todaysCompletedWorkout?.id && todaysCompletedWorkout.id === activeWorkout.id) ||
      (activeWorkout.workout_date === todayDate &&
        todayPlan &&
        todayPlan.status !== "rest" &&
        todayPlannedName &&
        activeWorkout.name &&
        todayPlannedName.trim().toLowerCase() === activeWorkout.name.trim().toLowerCase())
    );

  let todaySummary: TodayTrainingSummary = activeWorkout && !isActiveWorkoutSameAsToday
    ? {
        status: todayPlannedStatus,
        workoutName: todayPlannedName,
        exerciseCount: todayPlan?.exercise_count ?? 0,
        durationMinutes: todayPlan?.estimated_duration_minutes ?? null,
        muscleFocus: todayPlan ? buildPrimaryFocusLabel(todayPlan.muscle_targeting, 3) : null,
        actionLabel: todayPlannedActionLabel,
        actionHref: todayPlannedActionHref,
        startScheduled: todayPlannedStatus === "scheduled",
      }
    : {
        status: activeWorkout ? "active" : todayPlannedStatus,
        workoutName: activeWorkout?.name ?? todayPlannedName,
        exerciseCount: todayPlan?.exercise_count ?? 0,
        durationMinutes: todayPlan?.estimated_duration_minutes ?? null,
        muscleFocus: todayPlan ? buildPrimaryFocusLabel(todayPlan.muscle_targeting, 3) : null,
        actionLabel: activeWorkout ? "Resume Workout" : todayPlannedActionLabel,
        actionHref: activeWorkout ? `/training/workouts/${activeWorkout.id}` : todayPlannedActionHref,
        startScheduled: !activeWorkout && todayPlannedStatus === "scheduled",
      };

  let weekStrip: WeekStripDay[] = plannerWeek.map((day) => ({
    date: day.date,
    weekdayLabel: day.weekday_label.slice(0, 3),
    status: toWeekStripStatus(day.status),
    workoutLabel:
      day.status === "rest" ? "Rest" : day.template_name ? shortWorkoutLabel(day.template_name) : day.status === "completed" ? "Done" : "—",
  }));
  if (activeWorkout) {
    weekStrip = weekStrip.map((day) => {
      if (day.date === todayDate) {
        return { ...day, status: "active", workoutLabel: shortWorkoutLabel(activeWorkout.name) };
      }
      return day;
    });
  }

  const recentCompletedWorkout = recentWorkouts.find((workout) => workout.completed_at !== null) ?? null;
  let recentContext = recentCompletedWorkout
    ? {
        workoutName: recentCompletedWorkout.name,
        workoutDate: recentCompletedWorkout.workout_date,
        workoutHref: `/training/workouts/${recentCompletedWorkout.id}`,
      }
    : null;
  let completedWeekCount = completedThisWeek;
  let plannerUninitialized = !hasAssignedWeeklyProgram(weekdayScheduleResult.data ?? []);

  let dedupeActiveAndToday = isActiveWorkoutSameAsToday;

  if (fixture) {
    const fixturePresentation = applyFixturePresentation(fixture, weekDates);
    activeSession = fixturePresentation.activeSession;
    todaySummary = fixturePresentation.todaySummary;
    weekStrip = fixturePresentation.weekStrip;
    recentContext = fixturePresentation.recentContext;
    completedWeekCount = fixturePresentation.completedThisWeek;
    plannerUninitialized = fixturePresentation.plannerUninitialized;
    if (fixture === "active-scheduled") {
      dedupeActiveAndToday = true;
    } else if (fixture === "active-different") {
      dedupeActiveAndToday = false;
    }
  }

  const shouldRenderTodayCard = !activeSession || !dedupeActiveAndToday;
  const currentProgram = inferCurrentProgramSummary({
    templates: templatesResult.data ?? [],
    weekdayRows: weekdayScheduleResult.data ?? [],
    weekDays: weekStrip,
    todayDate,
  });
  const fixtureProgram = !plannerUninitialized
    ? {
        name: "Classic PPL",
        frequencyLabel: "4 days / week",
        splitLabel: "push / pull / legs",
        nextLabel: "Fri · Pull",
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-3">
      <h1 className="text-[15px] font-semibold tracking-tight text-white">Training</h1>

      {dataErrorMessage ? (
        <Card variant="tertiary">
          <p className="text-sm text-rose-200">Training data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{dataErrorMessage}</p>
        </Card>
      ) : null}

      {view === "program" ? (
        <>
          <Card variant="tertiary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-300">Program, templates, and weekly management tools.</p>
              <Link
                href="/training"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Back to Training
              </Link>
            </div>
          </Card>
          <section id="templates">
            <WorkoutPlanner
              templates={templatesResult.data ?? []}
              templateExercises={templateExercisesResult.data ?? []}
              weekPlans={plannerWeek}
              todayPlan={todayPlan}
              exerciseOptions={plannerExerciseOptions}
              activeWorkout={
                activeWorkout
                  ? { id: activeWorkout.id, name: activeWorkout.name, workout_date: activeWorkout.workout_date }
                  : null
              }
              completedThisWeek={completedThisWeek}
            />
          </section>
        </>
      ) : view === "plans" ? (
        <>
          {!isPlanDetailView ? (
            <Card variant="tertiary">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-300">Choose a ready-made plan.</p>
                <Link
                  href="/training"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                >
                  Back to Training
                </Link>
              </div>
            </Card>
          ) : null}
          <Card
            title={isPlanDetailView ? undefined : "Ready-Made Plan Library"}
            subtitle={isPlanDetailView ? undefined : "Five options optimized for quick mobile scanning"}
            variant="primary"
          >
            <ReadyMadePlansLibrary
              presets={readyMadeResolution.presets}
              missingExercises={readyMadeResolution.missingExercises}
              initialPresetId={initialPlanPresetId}
            />
          </Card>
        </>
      ) : view === "history" ? (
        <>
          <Card variant="tertiary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-300">Recent sessions and completed workouts.</p>
              <Link
                href="/training"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Back to Training
              </Link>
            </div>
          </Card>
          <Card title="History" subtitle="Recent sessions" variant="tertiary">
            <ul className="space-y-1.5">
              {recentWorkouts.map((workout) => {
                const summary = workoutSummaryById.get(workout.id);
                return (
                  <li key={workout.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{workout.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <StateChip state={workout.completed_at ? "completed" : "active"} label={workout.completed_at ? "Completed" : "In progress"} />
                          <p className="text-xs text-zinc-500">{formatDate(workout.workout_date)}</p>
                        </div>
                        {summary ? (
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {summary.exerciseCount} exercises • {summary.completedSetCount}/{summary.totalSetCount} sets complete
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={`/training/workouts/${workout.id}`}
                        className="inline-flex h-7 items-center justify-center rounded-md border border-white/15 px-2 text-[11px] font-medium text-zinc-100 transition-colors hover:bg-white/10"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/training/history"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Full Workout History
              </Link>
              <Link
                href="/training/exercises"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Browse Exercise Catalog
              </Link>
            </div>
          </Card>
        </>
      ) : (
        <>
          <TrainingHomeView
            fixtureLabel={fixture}
            activeSession={activeSession}
            hideTodayWhenActive={!shouldRenderTodayCard}
            todaySummary={todaySummary}
            program={fixture ? fixtureProgram : currentProgram}
            hasAssignedProgram={!plannerUninitialized}
            weekStrip={weekStrip}
            todayDate={todayDate}
            completedThisWeek={completedWeekCount}
            recentWorkout={
              recentContext
                ? {
                    workoutName: recentContext.workoutName,
                    workoutDateLabel: formatDate(recentContext.workoutDate),
                    workoutHref: recentContext.workoutHref,
                  }
                : null
            }
          />
        </>
      )}
    </div>
  );
}
