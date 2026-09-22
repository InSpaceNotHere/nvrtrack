import {
  DESIRED_TRAINING_DAYS_OPTIONS,
  DISCOVERY_SOURCE_OPTIONS,
  HEIGHT_UNIT_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  type DesiredTrainingDaysChoiceCode,
  type DesiredTrainingDaysStateCode,
  type DiscoverySourceCode,
  type HeightUnitCode,
  type PrimaryGoalCode,
  type TrainingEnvironmentCode,
  type TrainingExperienceCode,
} from "./constants";

const PRIMARY_GOAL_CODES = new Set<string>(PRIMARY_GOAL_OPTIONS.map((option) => option.code));
const TRAINING_EXPERIENCE_CODES = new Set<string>(TRAINING_EXPERIENCE_OPTIONS.map((option) => option.code));
const TRAINING_ENVIRONMENT_CODES = new Set<string>(TRAINING_ENVIRONMENT_OPTIONS.map((option) => option.code));
const DISCOVERY_SOURCE_CODES = new Set<string>(DISCOVERY_SOURCE_OPTIONS.map((option) => option.code));
const HEIGHT_UNIT_CODES = new Set<string>(HEIGHT_UNIT_OPTIONS.map((option) => option.code));
const DESIRED_TRAINING_DAY_CHOICES = new Set<string>(DESIRED_TRAINING_DAYS_OPTIONS.map((option) => option.code));

const HEIGHT_INCHES_MIN = 36;
const HEIGHT_INCHES_MAX = 96;
const HEIGHT_CM_MIN = 91;
const HEIGHT_CM_MAX = 244;

export interface OnboardingStepOneInput {
  primaryGoal: string;
  trainingExperience: string;
}

export interface OnboardingStepTwoInput {
  desiredTrainingDaysChoice: string;
  trainingEnvironment: string;
}

export interface OnboardingStepThreeInput {
  discoverySource: string;
  heightUnit: string;
  heightFeet: string;
  heightInches: string;
  heightCentimeters: string;
}

export interface OnboardingHeightInput {
  heightUnit: string;
  heightFeet: string;
  heightInches: string;
  heightCentimeters: string;
}

export interface OnboardingStepValidationResult<TValue extends object, TField extends string> {
  data: TValue | null;
  fieldErrors: Partial<Record<TField, string>>;
}

export type OnboardingStepOneField = "primaryGoal" | "trainingExperience";
export type OnboardingStepTwoField = "desiredTrainingDaysChoice" | "trainingEnvironment";
export type OnboardingStepThreeField = "discoverySource" | "heightFeet" | "heightInches" | "heightCentimeters";
export type OnboardingHeightField = "heightFeet" | "heightInches" | "heightCentimeters";

export interface NormalizedStepOneValues {
  primary_goal: PrimaryGoalCode;
  training_experience: TrainingExperienceCode;
}

export interface NormalizedStepTwoValues {
  desired_training_days: number | null;
  desired_training_days_state: DesiredTrainingDaysStateCode;
  training_environment: TrainingEnvironmentCode;
}

export interface NormalizedStepThreeValues {
  discovery_source: DiscoverySourceCode;
  height_inches: number | undefined;
}

export interface NormalizedHeightValues {
  height_inches: number | undefined;
}

function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function normalizeOnboardingStepOneInput(
  input: OnboardingStepOneInput,
): OnboardingStepValidationResult<NormalizedStepOneValues, OnboardingStepOneField> {
  const fieldErrors: Partial<Record<OnboardingStepOneField, string>> = {};
  const primaryGoal = input.primaryGoal.trim();
  const trainingExperience = input.trainingExperience.trim();

  if (!PRIMARY_GOAL_CODES.has(primaryGoal)) {
    fieldErrors.primaryGoal = "Select your main goal.";
  }
  if (!TRAINING_EXPERIENCE_CODES.has(trainingExperience)) {
    fieldErrors.trainingExperience = "Select your training experience.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  return {
    data: {
      primary_goal: primaryGoal as PrimaryGoalCode,
      training_experience: trainingExperience as TrainingExperienceCode,
    },
    fieldErrors: {},
  };
}

export function normalizeOnboardingStepTwoInput(
  input: OnboardingStepTwoInput,
): OnboardingStepValidationResult<NormalizedStepTwoValues, OnboardingStepTwoField> {
  const fieldErrors: Partial<Record<OnboardingStepTwoField, string>> = {};
  const desiredDaysChoice = input.desiredTrainingDaysChoice.trim();
  const trainingEnvironment = input.trainingEnvironment.trim();

  if (!DESIRED_TRAINING_DAY_CHOICES.has(desiredDaysChoice)) {
    fieldErrors.desiredTrainingDaysChoice = "Select your ideal weekly training days.";
  }
  if (!TRAINING_ENVIRONMENT_CODES.has(trainingEnvironment)) {
    fieldErrors.trainingEnvironment = "Select your training environment.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  let desired_training_days: number | null = null;
  let desired_training_days_state: DesiredTrainingDaysStateCode = "unspecified";
  if (desiredDaysChoice === "not_sure") {
    desired_training_days_state = "not_sure";
  } else if (desiredDaysChoice === "prefer_not_to_answer") {
    desired_training_days_state = "prefer_not_to_answer";
  } else {
    desired_training_days = Number(desiredDaysChoice);
    desired_training_days_state = "specified";
  }

  return {
    data: {
      desired_training_days,
      desired_training_days_state,
      training_environment: trainingEnvironment as TrainingEnvironmentCode,
    },
    fieldErrors: {},
  };
}

function normalizeHeightInchesFromFeetAndInches(input: Pick<OnboardingStepThreeInput, "heightFeet" | "heightInches">): {
  heightInches: number | undefined;
  fieldErrors: Pick<Partial<Record<OnboardingStepThreeField, string>>, "heightFeet" | "heightInches">;
} {
  const feetRaw = input.heightFeet.trim();
  const inchesRaw = input.heightInches.trim();

  if (!feetRaw && !inchesRaw) {
    return { heightInches: undefined, fieldErrors: {} };
  }

  const feetValue = parseInteger(feetRaw);
  const inchesValue = parseInteger(inchesRaw);
  const fieldErrors: Pick<Partial<Record<OnboardingStepThreeField, string>>, "heightFeet" | "heightInches"> = {};

  if (feetValue === null) {
    fieldErrors.heightFeet = "Enter feet as a whole number.";
  }
  if (inchesValue === null) {
    fieldErrors.heightInches = "Enter inches as a whole number.";
  }
  if (feetValue !== null && (feetValue < 3 || feetValue > 8)) {
    fieldErrors.heightFeet = "Feet must be between 3 and 8.";
  }
  if (inchesValue !== null && (inchesValue < 0 || inchesValue > 11)) {
    fieldErrors.heightInches = "Inches must be between 0 and 11.";
  }

  if (Object.keys(fieldErrors).length > 0 || feetValue === null || inchesValue === null) {
    return { heightInches: undefined, fieldErrors };
  }

  const totalInches = feetValue * 12 + inchesValue;
  if (totalInches < HEIGHT_INCHES_MIN || totalInches > HEIGHT_INCHES_MAX) {
    return {
      heightInches: undefined,
      fieldErrors: {
        heightFeet: "Height must be between 3'0\" and 8'0\".",
      },
    };
  }

  return { heightInches: totalInches, fieldErrors: {} };
}

function normalizeHeightInchesFromCentimeters(centimetersRaw: string): {
  heightInches: number | undefined;
  fieldError?: string;
} {
  const centimetersValue = parseInteger(centimetersRaw.trim());
  if (centimetersRaw.trim() === "") {
    return { heightInches: undefined };
  }
  if (centimetersValue === null) {
    return { heightInches: undefined, fieldError: "Enter centimeters as a whole number." };
  }
  if (centimetersValue < HEIGHT_CM_MIN || centimetersValue > HEIGHT_CM_MAX) {
    return {
      heightInches: undefined,
      fieldError: `Centimeters must be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX}.`,
    };
  }
  return { heightInches: Math.round(centimetersValue / 2.54) };
}

export function normalizeOnboardingStepThreeInput(
  input: OnboardingStepThreeInput,
): OnboardingStepValidationResult<NormalizedStepThreeValues, OnboardingStepThreeField> {
  const fieldErrors: Partial<Record<OnboardingStepThreeField, string>> = {};
  const discoverySource = input.discoverySource.trim();

  if (!DISCOVERY_SOURCE_CODES.has(discoverySource)) {
    fieldErrors.discoverySource = "Select how you heard about NVRTRACK.";
  }

  const parsedHeight = normalizeOptionalHeightInput({
    heightUnit: input.heightUnit,
    heightFeet: input.heightFeet,
    heightInches: input.heightInches,
    heightCentimeters: input.heightCentimeters,
  });
  if (!parsedHeight.data) {
    Object.assign(fieldErrors, parsedHeight.fieldErrors);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  return {
    data: {
      discovery_source: discoverySource as DiscoverySourceCode,
      height_inches: parsedHeight.data?.height_inches,
    },
    fieldErrors: {},
  };
}

export function normalizeOptionalHeightInput(
  input: OnboardingHeightInput,
): OnboardingStepValidationResult<NormalizedHeightValues, OnboardingHeightField> {
  const fieldErrors: Partial<Record<OnboardingHeightField, string>> = {};
  const heightUnit = input.heightUnit.trim();

  if (!HEIGHT_UNIT_CODES.has(heightUnit)) {
    fieldErrors.heightCentimeters = "Select a height unit.";
    return { data: null, fieldErrors };
  }

  let heightInches: number | undefined = undefined;
  if (heightUnit === "ft_in") {
    const parsed = normalizeHeightInchesFromFeetAndInches(input);
    heightInches = parsed.heightInches;
    Object.assign(fieldErrors, parsed.fieldErrors);
  } else if (heightUnit === "cm") {
    const parsed = normalizeHeightInchesFromCentimeters(input.heightCentimeters);
    heightInches = parsed.heightInches;
    if (parsed.fieldError) {
      fieldErrors.heightCentimeters = parsed.fieldError;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  return {
    data: {
      height_inches: heightInches,
    },
    fieldErrors: {},
  };
}

export function deriveHeightDefaults(heightInches: number | null | undefined): {
  feet: string;
  inches: string;
  centimeters: string;
  unit: HeightUnitCode;
} {
  if (typeof heightInches !== "number" || !Number.isFinite(heightInches) || heightInches <= 0) {
    return { feet: "", inches: "", centimeters: "", unit: "ft_in" };
  }
  const rounded = Math.round(heightInches);
  const feet = Math.floor(rounded / 12);
  const inches = rounded % 12;
  const centimeters = Math.round(rounded * 2.54);
  return {
    feet: String(feet),
    inches: String(inches),
    centimeters: String(centimeters),
    unit: "ft_in",
  };
}

export function isDesiredTrainingDaysChoiceCode(value: string): value is DesiredTrainingDaysChoiceCode {
  return DESIRED_TRAINING_DAY_CHOICES.has(value);
}

