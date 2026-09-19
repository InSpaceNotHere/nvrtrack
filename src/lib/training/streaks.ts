import type { WorkoutRow } from "./types";
import { getDateStringInTimeZone, normalizeTimeZone } from "../timezone";

function toDayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86400000);
}

function toWeekKey(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const weekday = parsed.getUTCDay();
  const mondayDistance = (weekday + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - mondayDistance);
  return parsed.toISOString().slice(0, 10);
}

function parseCompletedWorkoutLocalDate(workout: WorkoutRow, timeZone: string): string | null {
  if (!workout.completed_at) {
    return null;
  }

  const completed = new Date(workout.completed_at);
  if (Number.isNaN(completed.getTime())) {
    return null;
  }

  return getDateStringInTimeZone(timeZone, completed);
}

function shiftDateString(date: string, dayDelta: number): string {
  const baseMs = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(baseMs)) {
    return date;
  }
  return new Date(baseMs + dayDelta * 86400000).toISOString().slice(0, 10);
}

interface WorkoutStreakOptions {
  timeZone?: string;
  reference?: Date;
}

export function computeWorkoutDayStreak(workouts: WorkoutRow[], options: WorkoutStreakOptions = {}): number {
  // Day streak semantics:
  // - Uses completed workouts only (valid completed_at timestamps).
  // - Converts each completion instant into the user's local calendar day.
  // - Counts unique days only (multiple workouts on one day count once).
  // - Anchors on today if trained today, else yesterday if trained yesterday.
  // - Returns 0 when latest completion is older than yesterday.
  // - Counts consecutive days backwards until first gap.
  const timeZone = normalizeTimeZone(options.timeZone);
  const referenceDate = getDateStringInTimeZone(timeZone, options.reference ?? new Date());
  const referenceDay = toDayNumber(referenceDate);
  const completedDays = [
    ...new Set(
      workouts
        .map((workout) => parseCompletedWorkoutLocalDate(workout, timeZone))
        .filter((value): value is string => value !== null)
        .map((date) => toDayNumber(date))
        .filter((dayNumber) => dayNumber <= referenceDay),
    ),
  ]
    .sort((left, right) => right - left);
  if (!completedDays.length) {
    return 0;
  }

  const latestCompletedDay = completedDays[0];
  if (latestCompletedDay < referenceDay - 1) {
    return 0;
  }
  if (latestCompletedDay !== referenceDay && latestCompletedDay !== referenceDay - 1) {
    return 0;
  }

  let pointer = latestCompletedDay;
  let streak = 0;
  const completedSet = new Set(completedDays);
  while (completedSet.has(pointer)) {
    streak += 1;
    pointer -= 1;
  }
  return streak;
}

export function computeWorkoutWeeklyStreak(workouts: WorkoutRow[], options: WorkoutStreakOptions = {}): number {
  // Weekly streak semantics (Monday-start weeks):
  // - Uses completed workouts only (valid completed_at timestamps).
  // - Converts each completion instant into the user's local calendar day, then local week key.
  // - Multiple workouts in one week count as one qualifying week.
  // - Anchors on current week if qualified, else previous week if qualified.
  // - Returns 0 when neither current nor previous week qualifies.
  // - Counts consecutive qualifying weeks backwards until first gap.
  const timeZone = normalizeTimeZone(options.timeZone);
  const referenceDate = getDateStringInTimeZone(timeZone, options.reference ?? new Date());
  const referenceWeek = toWeekKey(referenceDate);
  const previousWeek = shiftDateString(referenceWeek, -7);

  const completedWeekKeys = new Set(
    workouts
      .map((workout) => parseCompletedWorkoutLocalDate(workout, timeZone))
      .filter((value): value is string => value !== null)
      .map((date) => toWeekKey(date))
      .filter((weekKey) => weekKey <= referenceWeek),
  );

  if (!completedWeekKeys.size) {
    return 0;
  }

  let cursorWeek: string;
  if (completedWeekKeys.has(referenceWeek)) {
    cursorWeek = referenceWeek;
  } else if (completedWeekKeys.has(previousWeek)) {
    cursorWeek = previousWeek;
  } else {
    return 0;
  }

  let streak = 0;
  while (completedWeekKeys.has(cursorWeek)) {
    streak += 1;
    cursorWeek = shiftDateString(cursorWeek, -7);
  }
  return streak;
}
