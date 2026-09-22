"use server";

import { revalidatePath } from "next/cache";

import {
  getMyOnboardingProfileSnapshot,
  markMyOnboardingCompleted,
  saveMyOnboardingDraft,
} from "@/lib/data/onboarding";
import {
  DESIRED_TRAINING_DAYS_OPTIONS,
  ONBOARDING_REQUIRED_VERSION,
  PRIMARY_GOAL_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
} from "@/lib/onboarding/constants";
import {
  normalizeOptionalHeightInput,
  normalizeOnboardingStepOneInput,
  normalizeOnboardingStepThreeInput,
  normalizeOnboardingStepTwoInput,
  type OnboardingHeightField,
  type OnboardingHeightInput,
  type OnboardingStepOneField,
  type OnboardingStepOneInput,
  type OnboardingStepThreeField,
  type OnboardingStepThreeInput,
  type OnboardingStepTwoField,
  type OnboardingStepTwoInput,
} from "@/lib/onboarding/validation";

function revalidateAppViews() {
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/training");
  revalidatePath("/progress");
  revalidatePath("/profile");
}

function revalidateOnboardingViews() {
  revalidateAppViews();
  revalidatePath("/onboarding");
}

export interface SaveOnboardingStepResult<TField extends string> {
  status: "success" | "error";
  message: string;
  fieldErrors: Partial<Record<TField, string>>;
}

const PRIMARY_GOAL_CODES = new Set<string>(PRIMARY_GOAL_OPTIONS.map((option) => option.code));
const TRAINING_EXPERIENCE_CODES = new Set<string>(TRAINING_EXPERIENCE_OPTIONS.map((option) => option.code));
const DESIRED_TRAINING_DAYS_CODES = new Set<string>(DESIRED_TRAINING_DAYS_OPTIONS.map((option) => option.code));
const TRAINING_ENVIRONMENT_CODES = new Set<string>(TRAINING_ENVIRONMENT_OPTIONS.map((option) => option.code));

export async function saveOnboardingGoalAction(input: {
  primaryGoal: string;
}): Promise<SaveOnboardingStepResult<"primaryGoal">> {
  const primaryGoal = input.primaryGoal.trim();
  if (!PRIMARY_GOAL_CODES.has(primaryGoal)) {
    return {
      status: "error",
      message: "Select your main goal before continuing.",
      fieldErrors: { primaryGoal: "Select your main goal." },
    };
  }

  const saveResult = await saveMyOnboardingDraft({ primary_goal: primaryGoal });
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
    message: "Saved.",
    fieldErrors: {},
  };
}

export async function saveOnboardingExperienceAction(input: {
  trainingExperience: string;
}): Promise<SaveOnboardingStepResult<"trainingExperience">> {
  const trainingExperience = input.trainingExperience.trim();
  if (!TRAINING_EXPERIENCE_CODES.has(trainingExperience)) {
    return {
      status: "error",
      message: "Select your training experience before continuing.",
      fieldErrors: { trainingExperience: "Select your training experience." },
    };
  }

  const saveResult = await saveMyOnboardingDraft({ training_experience: trainingExperience });
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
    message: "Saved.",
    fieldErrors: {},
  };
}

export async function saveOnboardingTrainingDaysAction(input: {
  desiredTrainingDaysChoice: string;
}): Promise<SaveOnboardingStepResult<"desiredTrainingDaysChoice">> {
  const desiredTrainingDaysChoice = input.desiredTrainingDaysChoice.trim();
  if (!DESIRED_TRAINING_DAYS_CODES.has(desiredTrainingDaysChoice)) {
    return {
      status: "error",
      message: "Select your ideal training days before continuing.",
      fieldErrors: {
        desiredTrainingDaysChoice: "Select your ideal training days.",
      },
    };
  }

  let desired_training_days: number | null = null;
  let desired_training_days_state: "specified" | "not_sure" | "prefer_not_to_answer" = "specified";
  if (desiredTrainingDaysChoice === "not_sure") {
    desired_training_days_state = "not_sure";
  } else if (desiredTrainingDaysChoice === "prefer_not_to_answer") {
    desired_training_days_state = "prefer_not_to_answer";
  } else {
    desired_training_days = Number(desiredTrainingDaysChoice);
  }

  const saveResult = await saveMyOnboardingDraft({
    desired_training_days,
    desired_training_days_state,
  });
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
    message: "Saved.",
    fieldErrors: {},
  };
}

export async function saveOnboardingTrainingEnvironmentAction(input: {
  trainingEnvironment: string;
}): Promise<SaveOnboardingStepResult<"trainingEnvironment">> {
  const trainingEnvironment = input.trainingEnvironment.trim();
  if (!TRAINING_ENVIRONMENT_CODES.has(trainingEnvironment)) {
    return {
      status: "error",
      message: "Select your training environment before continuing.",
      fieldErrors: { trainingEnvironment: "Select your training environment." },
    };
  }

  const saveResult = await saveMyOnboardingDraft({
    training_environment: trainingEnvironment,
  });
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
    message: "Saved.",
    fieldErrors: {},
  };
}

export async function saveOnboardingHeightAction(
  input: OnboardingHeightInput,
): Promise<SaveOnboardingStepResult<OnboardingHeightField>> {
  const normalized = normalizeOptionalHeightInput(input);
  if (!normalized.data) {
    return {
      status: "error",
      message: "Please fix your height input before continuing.",
      fieldErrors: normalized.fieldErrors,
    };
  }

  const draftPayload: Parameters<typeof saveMyOnboardingDraft>[0] = {};
  if (normalized.data.height_inches !== undefined) {
    draftPayload.height_inches = normalized.data.height_inches;
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
    message: "Saved.",
    fieldErrors: {},
  };
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

  revalidateAppViews();
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

