import { describe, expect, it } from "vitest";

import {
  CALORIE_GOAL_MAX,
  HEIGHT_INCHES_MAX,
  HEIGHT_INCHES_MIN,
  MACRO_GOAL_MAX,
  formatHeightFeetInches,
  isPreferredWeightUnit,
  normalizeProfileInput,
  profileToFormValues,
} from "./validation";

describe("profile height formatting", () => {
  it("formats inches as feet and inches", () => {
    expect(formatHeightFeetInches(69)).toBe("5 ft 9 in");
    expect(formatHeightFeetInches(72)).toBe("6 ft 0 in");
  });

  it("returns null for missing/invalid values", () => {
    expect(formatHeightFeetInches(null)).toBeNull();
    expect(formatHeightFeetInches(undefined)).toBeNull();
    expect(formatHeightFeetInches(0)).toBeNull();
  });
});

describe("profile form defaults", () => {
  it("normalizes null profile fields to empty strings", () => {
    const values = profileToFormValues({
      id: "u1",
      display_name: null,
      height_inches: null,
      calorie_goal: null,
      protein_goal: null,
      carbohydrate_goal: null,
      fat_goal: null,
      preferred_weight_unit: "lb",
      created_at: "",
      updated_at: "",
    });

    expect(values.displayName).toBe("");
    expect(values.heightInches).toBe("");
    expect(values.calorieGoal).toBe("");
    expect(values.proteinGoal).toBe("");
    expect(values.carbohydrateGoal).toBe("");
    expect(values.fatGoal).toBe("");
    expect(values.preferredWeightUnit).toBe("lb");
    expect(values.timezone).toBe("UTC");
  });
});

describe("profile input normalization", () => {
  it("trims display name and keeps blanks nullable", () => {
    const result = normalizeProfileInput({
      displayName: "  Casey  ",
      heightInches: "",
      calorieGoal: "",
      proteinGoal: "",
      carbohydrateGoal: "",
      fatGoal: "",
      preferredWeightUnit: "kg",
      timezone: "America/Los_Angeles",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data).toMatchObject({
      display_name: "Casey",
      height_inches: null,
      calorie_goal: null,
      protein_goal: null,
      carbohydrate_goal: null,
      fat_goal: null,
      preferred_weight_unit: "kg",
      timezone: "America/Los_Angeles",
    });
  });

  it("rejects invalid non-numeric values", () => {
    const result = normalizeProfileInput({
      displayName: "",
      heightInches: "abc",
      calorieGoal: "x",
      proteinGoal: "12",
      carbohydrateGoal: "20",
      fatGoal: "30",
      preferredWeightUnit: "lb",
      timezone: "UTC",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.heightInches).toContain("must be a number");
    expect(result.fieldErrors.calorieGoal).toContain("must be a number");
  });

  it("rejects out-of-range goals and height", () => {
    const result = normalizeProfileInput({
      displayName: "",
      heightInches: `${HEIGHT_INCHES_MAX + 1}`,
      calorieGoal: `${CALORIE_GOAL_MAX + 1}`,
      proteinGoal: `${MACRO_GOAL_MAX + 1}`,
      carbohydrateGoal: `${MACRO_GOAL_MAX + 1}`,
      fatGoal: `${MACRO_GOAL_MAX + 1}`,
      preferredWeightUnit: "lb",
      timezone: "UTC",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.heightInches).toContain(`${HEIGHT_INCHES_MIN}`);
    expect(result.fieldErrors.calorieGoal).toContain(`${CALORIE_GOAL_MAX}`);
    expect(result.fieldErrors.proteinGoal).toContain(`${MACRO_GOAL_MAX}`);
    expect(result.fieldErrors.carbohydrateGoal).toContain(`${MACRO_GOAL_MAX}`);
    expect(result.fieldErrors.fatGoal).toContain(`${MACRO_GOAL_MAX}`);
  });

  it("rejects unit values other than lb/kg", () => {
    expect(isPreferredWeightUnit("lb")).toBe(true);
    expect(isPreferredWeightUnit("kg")).toBe(true);
    expect(isPreferredWeightUnit("stone")).toBe(false);

    const result = normalizeProfileInput({
      displayName: "",
      heightInches: "70",
      calorieGoal: "2400",
      proteinGoal: "180",
      carbohydrateGoal: "220",
      fatGoal: "70",
      preferredWeightUnit: "stone",
      timezone: "UTC",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.preferredWeightUnit).toBe("Preferred unit must be lb or kg.");
  });

  it("accepts valid full payload transformation", () => {
    const result = normalizeProfileInput({
      displayName: "NVR Athlete",
      heightInches: "70",
      calorieGoal: "2400",
      proteinGoal: "180",
      carbohydrateGoal: "230",
      fatGoal: "70",
      preferredWeightUnit: "lb",
      timezone: "UTC",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data).toEqual({
      display_name: "NVR Athlete",
      height_inches: 70,
      calorie_goal: 2400,
      protein_goal: 180,
      carbohydrate_goal: 230,
      fat_goal: 70,
      preferred_weight_unit: "lb",
      timezone: "UTC",
    });
  });

  it("rejects invalid timezone values", () => {
    const result = normalizeProfileInput({
      displayName: "Athlete",
      heightInches: "70",
      calorieGoal: "2400",
      proteinGoal: "180",
      carbohydrateGoal: "230",
      fatGoal: "70",
      preferredWeightUnit: "lb",
      timezone: "Mars/OlympusMons",
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.timezone).toContain("valid IANA timezone");
  });
});
