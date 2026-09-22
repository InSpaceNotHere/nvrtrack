import { describe, expect, it } from "vitest";

import { resolveOnboardingGate } from "./gating";

describe("resolveOnboardingGate", () => {
  it("allows completed users to visit normal routes", () => {
    const decision = resolveOnboardingGate({
      pathname: "/",
      completedVersion: 1,
      requiredVersion: 1,
      activeWorkoutId: null,
    });

    expect(decision).toEqual({ allow: true, redirectTo: null });
  });

  it("redirects completed users away from onboarding route", () => {
    const decision = resolveOnboardingGate({
      pathname: "/onboarding",
      completedVersion: 1,
      requiredVersion: 1,
      activeWorkoutId: null,
    });

    expect(decision).toEqual({ allow: false, redirectTo: "/" });
  });

  it("redirects incomplete users to onboarding by default", () => {
    const decision = resolveOnboardingGate({
      pathname: "/training",
      completedVersion: 0,
      requiredVersion: 1,
      activeWorkoutId: null,
    });

    expect(decision).toEqual({ allow: false, redirectTo: "/onboarding" });
  });

  it("allows incomplete users on onboarding route", () => {
    const decision = resolveOnboardingGate({
      pathname: "/onboarding",
      completedVersion: 0,
      requiredVersion: 1,
      activeWorkoutId: null,
    });

    expect(decision).toEqual({ allow: true, redirectTo: null });
  });

  it("allows incomplete users to stay in active workout route", () => {
    const decision = resolveOnboardingGate({
      pathname: "/training/workouts/workout-123",
      completedVersion: 0,
      requiredVersion: 1,
      activeWorkoutId: "workout-123",
    });

    expect(decision).toEqual({ allow: true, redirectTo: null });
  });

  it("redirects incomplete users if route workout does not match active workout", () => {
    const decision = resolveOnboardingGate({
      pathname: "/training/workouts/workout-999",
      completedVersion: 0,
      requiredVersion: 1,
      activeWorkoutId: "workout-123",
    });

    expect(decision).toEqual({ allow: false, redirectTo: "/onboarding" });
  });
});

