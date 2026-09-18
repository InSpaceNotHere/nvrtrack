export const CANONICAL_LIFTS = ["bench_press", "squat", "deadlift"] as const;

export type CanonicalLift = (typeof CANONICAL_LIFTS)[number];

export function isCanonicalLift(value: string | null | undefined): value is CanonicalLift {
  return value === "bench_press" || value === "squat" || value === "deadlift";
}

export function toCanonicalLift(value: string | null | undefined): CanonicalLift | null {
  return isCanonicalLift(value) ? value : null;
}
