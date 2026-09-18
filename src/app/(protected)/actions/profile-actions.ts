"use server";

import { revalidatePath } from "next/cache";

import { updateMyProfile } from "@/lib/data/profile";
import {
  normalizeProfileInput,
  profileToFormValues,
  type FieldErrors,
  type ProfileFormInput,
  type ProfileFormValues,
} from "@/lib/profile/validation";

export interface SaveProfileResult {
  status: "success" | "error";
  message: string;
  fieldErrors: FieldErrors;
  values: ProfileFormValues;
}

function revalidateProfileViews() {
  revalidatePath("/");
  revalidatePath("/nutrition");
  revalidatePath("/progress");
  revalidatePath("/profile");
}

export async function saveProfileAction(input: ProfileFormInput): Promise<SaveProfileResult> {
  const normalized = normalizeProfileInput(input);
  const inputValues: ProfileFormValues = {
    displayName: input.displayName,
    heightInches: input.heightInches,
    calorieGoal: input.calorieGoal,
    proteinGoal: input.proteinGoal,
    carbohydrateGoal: input.carbohydrateGoal,
    fatGoal: input.fatGoal,
    preferredWeightUnit: input.preferredWeightUnit === "kg" ? "kg" : "lb",
  };

  if (!normalized.data) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: normalized.fieldErrors,
      values: inputValues,
    };
  }

  const saveResult = await updateMyProfile(normalized.data);
  if (saveResult.error) {
    return {
      status: "error",
      message: saveResult.error.message || "Unable to save profile right now.",
      fieldErrors: {},
      values: inputValues,
    };
  }

  revalidateProfileViews();

  return {
    status: "success",
    message: "Profile updated successfully.",
    fieldErrors: {},
    values: profileToFormValues(saveResult.data),
  };
}
