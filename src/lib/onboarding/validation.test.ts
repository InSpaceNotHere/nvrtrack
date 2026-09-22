import { describe, expect, it } from "vitest";

import {
  deriveHeightDefaults,
  normalizeOnboardingStepOneInput,
  normalizeOnboardingStepThreeInput,
  normalizeOnboardingStepTwoInput,
  normalizeOptionalHeightInput,
} from "./validation";

describe("normalizeOnboardingStepOneInput", () => {
  it("accepts valid goal and training experience codes", () => {
    const result = normalizeOnboardingStepOneInput({
      primaryGoal: "build_muscle",
      trainingExperience: "some_experience",
    });

    expect(result.data).toEqual({
      primary_goal: "build_muscle",
      training_experience: "some_experience",
    });
    expect(result.fieldErrors).toEqual({});
  });

  it("rejects unknown values", () => {
    const result = normalizeOnboardingStepOneInput({
      primaryGoal: "unknown",
      trainingExperience: "",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.primaryGoal).toBeDefined();
    expect(result.fieldErrors.trainingExperience).toBeDefined();
  });
});

describe("normalizeOnboardingStepTwoInput", () => {
  it("keeps specified desired training days as integer + state", () => {
    const result = normalizeOnboardingStepTwoInput({
      desiredTrainingDaysChoice: "4",
      trainingEnvironment: "mixed",
    });

    expect(result.data).toEqual({
      desired_training_days: 4,
      desired_training_days_state: "specified",
      training_environment: "mixed",
    });
  });

  it("encodes not_sure distinctly from prefer_not_to_answer", () => {
    const notSure = normalizeOnboardingStepTwoInput({
      desiredTrainingDaysChoice: "not_sure",
      trainingEnvironment: "full_gym",
    });
    const preferNot = normalizeOnboardingStepTwoInput({
      desiredTrainingDaysChoice: "prefer_not_to_answer",
      trainingEnvironment: "full_gym",
    });

    expect(notSure.data?.desired_training_days).toBeNull();
    expect(notSure.data?.desired_training_days_state).toBe("not_sure");
    expect(preferNot.data?.desired_training_days).toBeNull();
    expect(preferNot.data?.desired_training_days_state).toBe("prefer_not_to_answer");
  });
});

describe("normalizeOnboardingStepThreeInput", () => {
  it("accepts discovery and optional blank height", () => {
    const result = normalizeOnboardingStepThreeInput({
      discoverySource: "search",
      heightUnit: "ft_in",
      heightFeet: "",
      heightInches: "",
      heightCentimeters: "",
    });

    expect(result.data).toEqual({
      discovery_source: "search",
      height_inches: undefined,
    });
  });

  it("parses feet + inches", () => {
    const result = normalizeOnboardingStepThreeInput({
      discoverySource: "friend",
      heightUnit: "ft_in",
      heightFeet: "5",
      heightInches: "8",
      heightCentimeters: "",
    });

    expect(result.data?.height_inches).toBe(68);
  });

  it("parses centimeters", () => {
    const result = normalizeOnboardingStepThreeInput({
      discoverySource: "youtube",
      heightUnit: "cm",
      heightFeet: "",
      heightInches: "",
      heightCentimeters: "173",
    });

    expect(result.data?.height_inches).toBe(68);
  });
});

describe("normalizeOptionalHeightInput", () => {
  it("allows skipping height with blank values", () => {
    const result = normalizeOptionalHeightInput({
      heightUnit: "ft_in",
      heightFeet: "",
      heightInches: "",
      heightCentimeters: "",
    });

    expect(result.data).toEqual({ height_inches: undefined });
    expect(result.fieldErrors).toEqual({});
  });

  it("rejects out-of-range feet independently of discovery", () => {
    const result = normalizeOptionalHeightInput({
      heightUnit: "ft_in",
      heightFeet: "9",
      heightInches: "11",
      heightCentimeters: "",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.heightFeet).toBe("Feet must be between 3 and 8.");
  });
});

describe("deriveHeightDefaults", () => {
  it("returns empty defaults for unknown height", () => {
    expect(deriveHeightDefaults(null)).toEqual({
      feet: "",
      inches: "",
      centimeters: "",
      unit: "ft_in",
    });
  });

  it("derives feet/inches/cm defaults from saved height", () => {
    expect(deriveHeightDefaults(68)).toEqual({
      feet: "5",
      inches: "8",
      centimeters: "173",
      unit: "ft_in",
    });
  });
});

