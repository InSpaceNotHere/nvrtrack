import { redirect } from "next/navigation";

import { OnboardingV1Flow } from "@/components/onboarding/onboarding-v1-flow";
import { Card } from "@/components/ui/card";
import { getMyExistingAccountDataProbe, getMyOnboardingProfileSnapshot } from "@/lib/data/onboarding";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import { deriveHeightDefaults } from "@/lib/onboarding/validation";

function resolveInitialStep(snapshot: {
  primary_goal: string | null;
  training_experience: string | null;
  desired_training_days_state: string;
  training_environment: string | null;
}): 1 | 2 | 3 {
  if (!snapshot.primary_goal || !snapshot.training_experience) {
    return 1;
  }
  if (!snapshot.training_environment || snapshot.desired_training_days_state === "unspecified") {
    return 2;
  }
  return 3;
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

function parsePreviewStep(value: string | undefined): 1 | 2 | 3 | null {
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3") return 3;
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
  if (completedVersion >= ONBOARDING_REQUIRED_VERSION) {
    redirect("/");
  }

  const existingProbe =
    existingDataProbeResult.error || !existingDataProbeResult.data
      ? { hasExistingData: snapshot.height_inches !== null || snapshot.display_name !== null }
      : existingDataProbeResult.data;
  const heightDefaults = deriveHeightDefaults(snapshot.height_inches);

  return (
    <div className="px-2 pb-5 pt-3 sm:px-4">
      <OnboardingV1Flow
        isExistingUser={previewExisting || existingProbe.hasExistingData}
        initialStep={previewStep ?? resolveInitialStep(snapshot)}
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

