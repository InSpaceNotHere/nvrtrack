export function getElapsedWorkoutMinutes(startedAt: string | null, referenceMs: number): number | null {
  if (!startedAt) {
    return null;
  }

  const startedMs = Date.parse(startedAt);
  if (Number.isNaN(startedMs)) {
    return null;
  }

  return Math.max(1, Math.floor((referenceMs - startedMs) / 60000));
}

export function formatElapsedWorkoutDuration(startedAt: string | null, referenceMs: number): string {
  const minutes = getElapsedWorkoutMinutes(startedAt, referenceMs);
  if (minutes === null) {
    return "--";
  }
  return `${minutes} min elapsed`;
}
