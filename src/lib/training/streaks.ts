import type { WorkoutRow } from "./types";

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

export function computeWorkoutDayStreak(workouts: WorkoutRow[], referenceDate: string): number {
  const completedDays = [...new Set(workouts.filter((workout) => workout.completed_at).map((workout) => toDayNumber(workout.workout_date)))]
    .sort((left, right) => right - left);
  if (!completedDays.length) {
    return 0;
  }
  const referenceDay = toDayNumber(referenceDate);
  let pointer = completedDays[0] === referenceDay ? referenceDay : completedDays[0];
  let streak = 0;
  const completedSet = new Set(completedDays);
  while (completedSet.has(pointer)) {
    streak += 1;
    pointer -= 1;
  }
  return streak;
}

export function computeWorkoutWeeklyStreak(workouts: WorkoutRow[], referenceDate: string): number {
  const completedWeekKeys = [...new Set(workouts.filter((workout) => workout.completed_at).map((workout) => toWeekKey(workout.workout_date)))]
    .sort((left, right) => (left < right ? 1 : -1));
  if (!completedWeekKeys.length) {
    return 0;
  }
  const startWeek = toWeekKey(referenceDate);
  const weeks = new Set(completedWeekKeys);
  let streak = 0;
  const cursor = new Date(`${startWeek}T00:00:00.000Z`);
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}
