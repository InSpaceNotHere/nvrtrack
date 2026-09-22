import { redirect } from "next/navigation";

import {
  OnboardingV1Flow,
  type OnboardingQuestionScreen,
  type OnboardingScreen,
} from "@/components/onboarding/onboarding-v1-flow";
import { Card } from "@/components/ui/card";
import { getMyExistingAccountDataProbe, getMyOnboardingProfileSnapshot } from "@/lib/data/onboarding";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import { deriveHeightDefaults } from "@/lib/onboarding/validation";

function resolveInitialQuestion(snapshot: {
  primary_goal: string | null;
  training_experience: string | null;
  desired_training_days_state: string;
  training_environment: string | null;
  discovery_source: string | null;
}): OnboardingQuestionScreen {
  if (!snapshot.primary_goal || !snapshot.training_experience) {
    return !snapshot.primary_goal ? "goal" : "experience";
  }
  if (!snapshot.training_environment || snapshot.desired_training_days_state === "unspecified") {
    return snapshot.desired_training_days_state === "unspecified" ? "days" : "environment";
  }
  if (!snapshot.discovery_source) {
    return "height";
  }
  return "discovery";
}

function toDesiredTrainingDaysChoice(snapshot: {
  desired_training_days_state: string;
  desired_training_days: number | null;
}): string {
  if (snapshot.desired_training_days_state === "specified" && snapshot.desired_training_days !== null) {
    return String(snapshot.desired_training_days);
  }
  if (snapshot.desired_training_days_state === "not_sure") {
    return "not_sure";
  }
  if (snapshot.desired_training_days_state === "prefer_not_to_answer") {
    return "prefer_not_to_answer";
  }
  return "";
}

function parseSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePreviewStep(value: string | undefined): OnboardingQuestionScreen | null {
  if (value === "1") return "goal";
  if (value === "2") return "days";
  if (value === "3") return "height";
  return null;
}

function parseScreen(value: string | undefined): OnboardingScreen | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "welcome") return "welcome";
  if (normalized === "goal") return "goal";
  if (normalized === "experience") return "experience";
  if (normalized === "days") return "days";
  if (normalized === "environment") return "environment";
  if (normalized === "height") return "height";
  if (normalized === "discovery") return "discovery";
  if (normalized === "complete") return "complete";
  return null;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const previewStepParam = parseSingleParam(resolvedSearchParams.previewStep);
  const previewExistingParam = parseSingleParam(resolvedSearchParams.previewExisting);
  const screenParam = parseSingleParam(resolvedSearchParams.q);
  const requestedScreen = parseScreen(screenParam);
  const allowPreviewOverrides = process.env.NODE_ENV !== "production";
  const previewStep = allowPreviewOverrides ? parsePreviewStep(previewStepParam) : null;
  const previewExisting = allowPreviewOverrides ? previewExistingParam === "1" : false;

  const [snapshotResult, existingDataProbeResult] = await Promise.all([
    getMyOnboardingProfileSnapshot(),
    getMyExistingAccountDataProbe(),
  ]);

  if (snapshotResult.error) {
    return (
      <div className="mx-auto w-full max-w-xl px-3 pt-3">
        <Card title="Onboarding" variant="tertiary">
          <p className="text-sm text-rose-200">{snapshotResult.error.message}</p>
        </Card>
      </div>
    );
  }

  const snapshot = snapshotResult.data;
  const completedVersion = snapshot.onboarding_version_completed ?? 0;
  const allowCompletedOnboardingScreen = requestedScreen === "complete";
  if (completedVersion >= ONBOARDING_REQUIRED_VERSION && !allowCompletedOnboardingScreen) {
    redirect("/");
  }

  const existingProbe =
    existingDataProbeResult.error || !existingDataProbeResult.data
      ? { hasExistingData: snapshot.height_inches !== null || snapshot.display_name !== null }
      : existingDataProbeResult.data;
  const heightDefaults = deriveHeightDefaults(snapshot.height_inches);
  const initialQuestion = resolveInitialQuestion(snapshot);
  const hasAnyOnboardingDraft =
    snapshot.primary_goal !== null ||
    snapshot.training_experience !== null ||
    snapshot.desired_training_days_state !== "unspecified" ||
    snapshot.training_environment !== null ||
    snapshot.discovery_source !== null;

  const initialScreen: OnboardingScreen =
    previewStep ??
    requestedScreen ??
    (hasAnyOnboardingDraft ? initialQuestion : "welcome");

  return (
    <div className="px-2 pb-5 pt-3 sm:px-4">
      <OnboardingV1Flow
        isExistingUser={previewExisting || existingProbe.hasExistingData}
        initialScreen={initialScreen}
        initialValues={{
          primaryGoal: snapshot.primary_goal ?? "",
          trainingExperience: snapshot.training_experience ?? "",
          desiredTrainingDaysChoice: toDesiredTrainingDaysChoice(snapshot),
          trainingEnvironment: snapshot.training_environment ?? "",
          discoverySource: snapshot.discovery_source ?? "",
          heightFeet: heightDefaults.feet,
          heightInches: heightDefaults.inches,
          heightCentimeters: heightDefaults.centimeters,
          heightUnit: heightDefaults.unit,
        }}
      />
    </div>
  );
}

