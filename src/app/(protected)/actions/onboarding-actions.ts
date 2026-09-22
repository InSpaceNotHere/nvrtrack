"use server";

import { revalidatePath } from "next/cache";

import {
  getMyOnboardingProfileSnapshot,
  markMyOnboardingCompleted,
  saveMyOnboardingDraft,
} from "@/lib/data/onboarding";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";
import {
  normalizeOnboardingStepOneInput,
  normalizeOnboardingStepThreeInput,
  normalizeOnboardingStepTwoInput,
  type OnboardingStepOneField,
  type OnboardingStepOneInput,
  type OnboardingStepThreeField,
  type OnboardingStepThreeInput,
  type OnboardingStepTwoField,
  type OnboardingStepTwoInput,
} from "@/lib/onboarding/validation";

function revalidateOnboardingViews() {
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/training");
  revalidatePath("/progress");
  revalidatePath("/profile");
  revalidatePath("/onboarding");
}

export interface SaveOnboardingStepResult<TField extends string> {
  status: "success" | "error";
  message: string;
  fieldErrors: Partial<Record<TField, string>>;
}

export async function saveOnboardingStepOneAction(
  input: OnboardingStepOneInput,
): Promise<SaveOnboardingStepResult<OnboardingStepOneField>> {
  const normalized = normalizeOnboardingStepOneInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please complete this step before continuing.",
      fieldErrors: normalized.fieldErrors,
    };
  }

  const saveResult = await saveMyOnboardingDraft(normalized.data);
  if (saveResult.error) {
    return {
      status: "error",
      message: saveResult.error.message,
      fieldErrors: {},
    };
  }

  revalidateOnboardingViews();
  return {
    status: "success",
    message: "Step saved.",
    fieldErrors: {},
  };
}

export async function saveOnboardingStepTwoAction(
  input: OnboardingStepTwoInput,
): Promise<SaveOnboardingStepResult<OnboardingStepTwoField>> {
  const normalized = normalizeOnboardingStepTwoInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please complete this step before continuing.",
      fieldErrors: normalized.fieldErrors,
    };
  }

  const saveResult = await saveMyOnboardingDraft(normalized.data);
  if (saveResult.error) {
    return {
      status: "error",
      message: saveResult.error.message,
      fieldErrors: {},
    };
  }

  revalidateOnboardingViews();
  return {
    status: "success",
    message: "Step saved.",
    fieldErrors: {},
  };
}

export async function completeOnboardingV1Action(
  input: OnboardingStepThreeInput,
): Promise<SaveOnboardingStepResult<OnboardingStepThreeField> & { redirectTo?: string }> {
  const normalized = normalizeOnboardingStepThreeInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: normalized.fieldErrors,
    };
  }

  const draftPayload: Parameters<typeof saveMyOnboardingDraft>[0] = {
    discovery_source: normalized.data.discovery_source,
  };
  if (normalized.data.height_inches !== undefined) {
    draftPayload.height_inches = normalized.data.height_inches;
  }

  const saveDraftResult = await saveMyOnboardingDraft(draftPayload);
  if (saveDraftResult.error) {
    return {
      status: "error",
      message: saveDraftResult.error.message,
      fieldErrors: {},
    };
  }

  const snapshotResult = await getMyOnboardingProfileSnapshot();
  if (snapshotResult.error) {
    return {
      status: "error",
      message: snapshotResult.error.message,
      fieldErrors: {},
    };
  }

  const snapshot = snapshotResult.data;
  const hasRequiredAnswers =
    snapshot.primary_goal !== null &&
    snapshot.training_experience !== null &&
    snapshot.training_environment !== null &&
    snapshot.discovery_source !== null &&
    snapshot.desired_training_days_state !== "unspecified";

  if (!hasRequiredAnswers) {
    return {
      status: "error",
      message: "Please complete all onboarding steps before finishing.",
      fieldErrors: {},
    };
  }

  const completeResult = await markMyOnboardingCompleted(ONBOARDING_REQUIRED_VERSION);
  if (completeResult.error) {
    return {
      status: "error",
      message: completeResult.error.message,
      fieldErrors: {},
    };
  }

  revalidateOnboardingViews();
  return {
    status: "success",
    message: "Onboarding completed.",
    fieldErrors: {},
    redirectTo: "/",
  };
}

export interface SaveTrainingPreferencesInput extends OnboardingStepOneInput, OnboardingStepTwoInput, OnboardingStepThreeInput {}

export async function saveTrainingPreferencesAction(
  input: SaveTrainingPreferencesInput,
): Promise<
  SaveOnboardingStepResult<OnboardingStepOneField | OnboardingStepTwoField | OnboardingStepThreeField>
> {
  const stepOne = normalizeOnboardingStepOneInput(input);
  const stepTwo = normalizeOnboardingStepTwoInput(input);
  const stepThree = normalizeOnboardingStepThreeInput(input);

  const fieldErrors: Partial<
    Record<OnboardingStepOneField | OnboardingStepTwoField | OnboardingStepThreeField, string>
  > = {
    ...(stepOne.fieldErrors ?? {}),
    ...(stepTwo.fieldErrors ?? {}),
    ...(stepThree.fieldErrors ?? {}),
  };

  if (!stepOne.data || !stepTwo.data || !stepThree.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const draftPayload: Parameters<typeof saveMyOnboardingDraft>[0] = {
    ...stepOne.data,
    ...stepTwo.data,
    discovery_source: stepThree.data.discovery_source,
  };
  if (stepThree.data.height_inches !== undefined) {
    draftPayload.height_inches = stepThree.data.height_inches;
  }

  const saveResult = await saveMyOnboardingDraft(draftPayload);
  if (saveResult.error) {
    return {
      status: "error",
      message: saveResult.error.message,
      fieldErrors: {},
    };
  }

  revalidateOnboardingViews();
  return {
    status: "success",
    message: "Training preferences saved.",
    fieldErrors: {},
  };
}

