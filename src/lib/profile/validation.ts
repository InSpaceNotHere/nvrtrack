import type { Database } from "@/types/database";
import { isValidIanaTimeZone, normalizeTimeZone } from "../timezone";

export const PROFILE_DISPLAY_NAME_MAX_LENGTH = 60;
export const HEIGHT_INCHES_MIN = 36;
export const HEIGHT_INCHES_MAX = 96;
export const CALORIE_GOAL_MAX = 10000;
export const MACRO_GOAL_MAX = 1000;

export type PreferredWeightUnit = "lb" | "kg";

export interface ProfileFormInput {
  displayName: string;
  heightInches: string;
  calorieGoal: string;
  proteinGoal: string;
  carbohydrateGoal: string;
  fatGoal: string;
  preferredWeightUnit: string;
  timezone: string;
}

export interface ProfileFormValues {
  displayName: string;
  heightInches: string;
  calorieGoal: string;
  proteinGoal: string;
  carbohydrateGoal: string;
  fatGoal: string;
  preferredWeightUnit: PreferredWeightUnit;
  timezone: string;
}

export type ProfileFormField =
  | "displayName"
  | "heightInches"
  | "calorieGoal"
  | "proteinGoal"
  | "carbohydrateGoal"
  | "fatGoal"
  | "preferredWeightUnit"
  | "timezone";

export type FieldErrors = Partial<Record<ProfileFormField, string>>;

export interface NormalizedProfileUpdate {
  display_name: string | null;
  height_inches: number | null;
  calorie_goal: number | null;
  protein_goal: number | null;
  carbohydrate_goal: number | null;
  fat_goal: number | null;
  preferred_weight_unit: PreferredWeightUnit;
  timezone: string;
}

export interface ProfileValidationResult {
  data: NormalizedProfileUpdate | null;
  fieldErrors: FieldErrors;
}

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function parseOptionalWholeNumber(
  value: string,
  fieldLabel: string,
  min: number,
  max: number,
): { value: number | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: `${fieldLabel} must be a number.` };
  }

  if (!Number.isInteger(parsed)) {
    return { value: null, error: `${fieldLabel} must be a whole number.` };
  }

  if (parsed < min || parsed > max) {
    return { value: null, error: `${fieldLabel} must be between ${min} and ${max}.` };
  }

  return { value: parsed, error: null };
}

export function isPreferredWeightUnit(value: string): value is PreferredWeightUnit {
  return value === "lb" || value === "kg";
}

export function formatHeightFeetInches(totalInches: number | null | undefined): string | null {
  if (typeof totalInches !== "number" || !Number.isFinite(totalInches) || totalInches <= 0) {
    return null;
  }

  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} ft ${inches} in`;
}

export function profileToFormValues(profile: ProfileRow | null): ProfileFormValues {
  const profileTimezone = (profile as (ProfileRow & { timezone?: string | null }) | null)?.timezone;
  return {
    displayName: profile?.display_name ?? "",
    heightInches: profile?.height_inches?.toString() ?? "",
    calorieGoal: profile?.calorie_goal?.toString() ?? "",
    proteinGoal: profile?.protein_goal?.toString() ?? "",
    carbohydrateGoal: profile?.carbohydrate_goal?.toString() ?? "",
    fatGoal: profile?.fat_goal?.toString() ?? "",
    preferredWeightUnit: profile?.preferred_weight_unit === "kg" ? "kg" : "lb",
    timezone: normalizeTimeZone(profileTimezone),
  };
}

export function normalizeProfileInput(input: ProfileFormInput): ProfileValidationResult {
  const fieldErrors: FieldErrors = {};
  const preferredWeightUnit = isPreferredWeightUnit(input.preferredWeightUnit) ? input.preferredWeightUnit : null;

  const displayName = input.displayName.trim();
  if (displayName.length > PROFILE_DISPLAY_NAME_MAX_LENGTH) {
    fieldErrors.displayName = `Display name must be ${PROFILE_DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  const heightInches = parseOptionalWholeNumber(input.heightInches, "Height", HEIGHT_INCHES_MIN, HEIGHT_INCHES_MAX);
  if (heightInches.error) {
    fieldErrors.heightInches = heightInches.error;
  }

  const calorieGoal = parseOptionalWholeNumber(input.calorieGoal, "Calorie goal", 0, CALORIE_GOAL_MAX);
  if (calorieGoal.error) {
    fieldErrors.calorieGoal = calorieGoal.error;
  }

  const proteinGoal = parseOptionalWholeNumber(input.proteinGoal, "Protein goal", 0, MACRO_GOAL_MAX);
  if (proteinGoal.error) {
    fieldErrors.proteinGoal = proteinGoal.error;
  }

  const carbohydrateGoal = parseOptionalWholeNumber(input.carbohydrateGoal, "Carbohydrate goal", 0, MACRO_GOAL_MAX);
  if (carbohydrateGoal.error) {
    fieldErrors.carbohydrateGoal = carbohydrateGoal.error;
  }

  const fatGoal = parseOptionalWholeNumber(input.fatGoal, "Fat goal", 0, MACRO_GOAL_MAX);
  if (fatGoal.error) {
    fieldErrors.fatGoal = fatGoal.error;
  }

  if (!preferredWeightUnit) {
    fieldErrors.preferredWeightUnit = "Preferred unit must be lb or kg.";
  }
  const timezone = input.timezone.trim();
  if (!isValidIanaTimeZone(timezone)) {
    fieldErrors.timezone = "Timezone must be a valid IANA timezone (for example, UTC or America/Los_Angeles).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  const safePreferredWeightUnit: PreferredWeightUnit = preferredWeightUnit ?? "lb";

  return {
    data: {
      display_name: displayName || null,
      height_inches: heightInches.value,
      calorie_goal: calorieGoal.value,
      protein_goal: proteinGoal.value,
      carbohydrate_goal: carbohydrateGoal.value,
      fat_goal: fatGoal.value,
      preferred_weight_unit: safePreferredWeightUnit,
      timezone: normalizeTimeZone(timezone),
    },
    fieldErrors: {},
  };
}
