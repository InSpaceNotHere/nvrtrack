export const ONBOARDING_REQUIRED_VERSION = 1;

export const PRIMARY_GOAL_OPTIONS = [
  { code: "build_muscle", label: "Build muscle" },
  { code: "get_stronger", label: "Get stronger" },
  { code: "lose_fat", label: "Lose fat" },
  { code: "improve_consistency", label: "Improve consistency" },
  { code: "general_fitness", label: "General fitness" },
  { code: "not_sure", label: "Not sure yet" },
  { code: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export type PrimaryGoalCode = (typeof PRIMARY_GOAL_OPTIONS)[number]["code"];

export const TRAINING_EXPERIENCE_OPTIONS = [
  { code: "new", label: "New" },
  { code: "some_experience", label: "Some experience" },
  { code: "experienced", label: "Experienced" },
  { code: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export type TrainingExperienceCode = (typeof TRAINING_EXPERIENCE_OPTIONS)[number]["code"];

export const DESIRED_TRAINING_DAYS_OPTIONS = [
  { code: "2", label: "2" },
  { code: "3", label: "3" },
  { code: "4", label: "4" },
  { code: "5", label: "5" },
  { code: "6", label: "6" },
  { code: "not_sure", label: "Not sure" },
  { code: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export type DesiredTrainingDaysChoiceCode = (typeof DESIRED_TRAINING_DAYS_OPTIONS)[number]["code"];

export const TRAINING_ENVIRONMENT_OPTIONS = [
  { code: "full_gym", label: "Full gym" },
  { code: "home_equipment", label: "Home gym / equipment" },
  { code: "bodyweight", label: "Mostly bodyweight" },
  { code: "mixed", label: "Mixed" },
  { code: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export type TrainingEnvironmentCode = (typeof TRAINING_ENVIRONMENT_OPTIONS)[number]["code"];

export const DISCOVERY_SOURCE_OPTIONS = [
  { code: "tiktok", label: "TikTok" },
  { code: "instagram", label: "Instagram" },
  { code: "youtube", label: "YouTube" },
  { code: "search", label: "Google / Search" },
  { code: "friend", label: "Friend" },
  { code: "other", label: "Other" },
  { code: "dont_remember", label: "Don't remember" },
  { code: "prefer_not_to_answer", label: "Prefer not to answer" },
] as const;

export type DiscoverySourceCode = (typeof DISCOVERY_SOURCE_OPTIONS)[number]["code"];

export const DESIRED_TRAINING_DAYS_STATE_OPTIONS = [
  "unspecified",
  "specified",
  "not_sure",
  "prefer_not_to_answer",
] as const;

export type DesiredTrainingDaysStateCode = (typeof DESIRED_TRAINING_DAYS_STATE_OPTIONS)[number];

export const HEIGHT_UNIT_OPTIONS = [
  { code: "ft_in", label: "ft + in" },
  { code: "cm", label: "cm" },
] as const;

export type HeightUnitCode = (typeof HEIGHT_UNIT_OPTIONS)[number]["code"];

