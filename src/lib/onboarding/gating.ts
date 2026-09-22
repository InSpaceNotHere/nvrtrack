const ONBOARDING_ROUTE_PREFIX = "/onboarding";
const ACTIVE_WORKOUT_ROUTE_REGEX = /^\/training\/workouts\/([^/]+)$/;

export interface ResolveOnboardingGateInput {
  pathname: string;
  completedVersion: number;
  requiredVersion: number;
  activeWorkoutId: string | null;
}

export interface OnboardingGateDecision {
  allow: boolean;
  redirectTo: string | null;
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE_PREFIX || pathname.startsWith(`${ONBOARDING_ROUTE_PREFIX}/`);
}

function getWorkoutIdFromRoute(pathname: string): string | null {
  const match = pathname.match(ACTIVE_WORKOUT_ROUTE_REGEX);
  return match?.[1] ?? null;
}

export function resolveOnboardingGate(input: ResolveOnboardingGateInput): OnboardingGateDecision {
  const { pathname, completedVersion, requiredVersion, activeWorkoutId } = input;
  const hasCompletedRequiredVersion = completedVersion >= requiredVersion;

  if (hasCompletedRequiredVersion) {
    if (isOnboardingRoute(pathname)) {
      return { allow: false, redirectTo: "/" };
    }
    return { allow: true, redirectTo: null };
  }

  if (isOnboardingRoute(pathname)) {
    return { allow: true, redirectTo: null };
  }

  const routeWorkoutId = getWorkoutIdFromRoute(pathname);
  if (routeWorkoutId && activeWorkoutId && routeWorkoutId === activeWorkoutId) {
    return { allow: true, redirectTo: null };
  }

  return { allow: false, redirectTo: "/onboarding" };
}

