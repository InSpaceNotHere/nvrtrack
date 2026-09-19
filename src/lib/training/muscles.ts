export const MUSCLE_TAXONOMY = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "upper_back",
  "traps",
  "lower_back",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "hamstrings",
  "adductors",
  "calves",
  "hip_flexors",
] as const;

export type MuscleId = (typeof MUSCLE_TAXONOMY)[number];

export const BODY_REGIONS = [
  "upper_body",
  "lower_body",
  "core",
  "posterior_chain",
  "full_body",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const MOVEMENT_PATTERNS = [
  "horizontal_press",
  "vertical_press",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hinge",
  "unilateral_leg",
  "knee_extension",
  "knee_flexion",
  "ankle_plantarflexion",
  "shoulder_abduction",
  "shoulder_flexion",
  "elbow_flexion",
  "elbow_extension",
  "upper_pull",
  "core",
  "hip_abduction",
  "hip_adduction",
  "carry",
  "full_body",
  "cardio",
  "isometric",
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

const MUSCLE_SET = new Set<string>(MUSCLE_TAXONOMY);
const BODY_REGION_SET = new Set<string>(BODY_REGIONS);
const MOVEMENT_PATTERN_SET = new Set<string>(MOVEMENT_PATTERNS);

const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: "Chest",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  lats: "Lats",
  upper_back: "Upper back",
  traps: "Traps",
  lower_back: "Lower back",
  abs: "Abs",
  obliques: "Obliques",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  adductors: "Adductors",
  calves: "Calves",
  hip_flexors: "Hip flexors",
};

const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  upper_body: "Upper body",
  lower_body: "Lower body",
  core: "Core",
  posterior_chain: "Posterior chain",
  full_body: "Full body",
};

const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  horizontal_press: "Horizontal press",
  vertical_press: "Vertical press",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  squat: "Squat",
  hinge: "Hinge",
  unilateral_leg: "Unilateral leg",
  knee_extension: "Knee extension",
  knee_flexion: "Knee flexion",
  ankle_plantarflexion: "Ankle plantarflexion",
  shoulder_abduction: "Shoulder abduction",
  shoulder_flexion: "Shoulder flexion",
  elbow_flexion: "Elbow flexion",
  elbow_extension: "Elbow extension",
  upper_pull: "Upper pull",
  core: "Core",
  hip_abduction: "Hip abduction",
  hip_adduction: "Hip adduction",
  carry: "Carry",
  full_body: "Full body",
  cardio: "Cardio",
  isometric: "Isometric",
};

export interface ExerciseMuscleMetadata {
  primary_muscles: MuscleId[];
  secondary_muscles: MuscleId[];
  body_region: BodyRegion | null;
  movement_pattern: MovementPattern | null;
}

export type ExerciseMuscleMetadataField =
  | "primary_muscles"
  | "secondary_muscles"
  | "body_region"
  | "movement_pattern";

export interface NormalizeExerciseMuscleMetadataInput {
  primary_muscles: string[] | null | undefined;
  secondary_muscles: string[] | null | undefined;
  body_region?: string | null | undefined;
  movement_pattern?: string | null | undefined;
  require_primary_muscles?: boolean;
}

export function isMuscleId(value: string | null | undefined): value is MuscleId {
  return !!value && MUSCLE_SET.has(value);
}

export function isBodyRegion(value: string | null | undefined): value is BodyRegion {
  return !!value && BODY_REGION_SET.has(value);
}

export function isMovementPattern(value: string | null | undefined): value is MovementPattern {
  return !!value && MOVEMENT_PATTERN_SET.has(value);
}

export function getMuscleLabel(muscle: MuscleId): string {
  return MUSCLE_LABELS[muscle];
}

export function getBodyRegionLabel(bodyRegion: BodyRegion): string {
  return BODY_REGION_LABELS[bodyRegion];
}

export function getMovementPatternLabel(movementPattern: MovementPattern): string {
  return MOVEMENT_PATTERN_LABELS[movementPattern];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function toNormalizedList(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const token = normalizeToken(item);
    if (!token) {
      continue;
    }
    normalized.push(token);
  }
  return normalized;
}

function toUniqueMuscles(value: string[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const output: MuscleId[] = [];
  for (const token of value) {
    if (!isMuscleId(token)) {
      continue;
    }
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    output.push(token);
  }
  return output;
}

export function coerceMuscleIdArray(value: unknown): MuscleId[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return toUniqueMuscles(
    value
      .filter((item): item is string => typeof item === "string")
      .map(normalizeToken),
  );
}

export function normalizeExerciseMuscleMetadata(
  input: NormalizeExerciseMuscleMetadataInput,
): {
  data: ExerciseMuscleMetadata | null;
  errors: Partial<Record<ExerciseMuscleMetadataField, string>>;
} {
  const errors: Partial<Record<ExerciseMuscleMetadataField, string>> = {};
  const requirePrimary = input.require_primary_muscles === true;

  const normalizedPrimaryTokens = toNormalizedList(input.primary_muscles);
  const normalizedSecondaryTokens = toNormalizedList(input.secondary_muscles);

  const invalidPrimary = normalizedPrimaryTokens.filter((token) => !isMuscleId(token));
  if (invalidPrimary.length > 0) {
    errors.primary_muscles = "Primary muscles include an unsupported value.";
  }

  const invalidSecondary = normalizedSecondaryTokens.filter((token) => !isMuscleId(token));
  if (invalidSecondary.length > 0) {
    errors.secondary_muscles = "Secondary muscles include an unsupported value.";
  }

  const primaryMuscles = toUniqueMuscles(normalizedPrimaryTokens);
  const secondaryMuscles = toUniqueMuscles(normalizedSecondaryTokens);

  if (requirePrimary && primaryMuscles.length === 0) {
    errors.primary_muscles = "Select at least one primary muscle.";
  }

  const overlap = primaryMuscles.filter((muscle) => secondaryMuscles.includes(muscle));
  if (overlap.length > 0) {
    errors.secondary_muscles = "A muscle cannot be both primary and secondary.";
  }

  const normalizedBodyRegion = input.body_region ? normalizeToken(input.body_region) : "";
  const bodyRegion = normalizedBodyRegion ? normalizedBodyRegion : null;
  if (bodyRegion && !isBodyRegion(bodyRegion)) {
    errors.body_region = "Body region must use a supported value.";
  }

  const normalizedMovementPattern = input.movement_pattern
    ? normalizeToken(input.movement_pattern)
    : "";
  const movementPattern = normalizedMovementPattern ? normalizedMovementPattern : null;
  if (movementPattern && !isMovementPattern(movementPattern)) {
    errors.movement_pattern = "Movement pattern must use a supported value.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      data: null,
      errors,
    };
  }

  return {
    data: {
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles.filter((muscle) => !primaryMuscles.includes(muscle)),
      body_region: bodyRegion as BodyRegion | null,
      movement_pattern: movementPattern as MovementPattern | null,
    },
    errors: {},
  };
}

export function hasExerciseMuscleMetadata(input: {
  primary_muscles: string[] | null | undefined;
  secondary_muscles: string[] | null | undefined;
}): boolean {
  return coerceMuscleIdArray(input.primary_muscles).length > 0 || coerceMuscleIdArray(input.secondary_muscles).length > 0;
}

export function toLegacyPrimaryMuscleGroup(primaryMuscles: MuscleId[]): string | null {
  const primary = primaryMuscles[0];
  if (!primary) {
    return null;
  }
  const map: Record<MuscleId, string> = {
    chest: "chest",
    front_delts: "shoulders",
    side_delts: "shoulders",
    rear_delts: "shoulders",
    triceps: "triceps",
    biceps: "biceps",
    forearms: "forearms",
    lats: "back",
    upper_back: "back",
    traps: "back",
    lower_back: "back",
    abs: "core",
    obliques: "core",
    glutes: "glutes",
    quads: "quadriceps",
    hamstrings: "hamstrings",
    adductors: "adductors",
    calves: "calves",
    hip_flexors: "hip_flexors",
  };
  return map[primary];
}

export function mapLegacyMuscleGroupToPrimaryMuscles(legacyMuscleGroup: string | null | undefined): MuscleId[] {
  if (!legacyMuscleGroup) {
    return [];
  }
  const normalized = normalizeToken(legacyMuscleGroup);
  const map: Record<string, MuscleId[]> = {
    chest: ["chest"],
    shoulders: ["front_delts"],
    triceps: ["triceps"],
    biceps: ["biceps"],
    forearms: ["forearms"],
    back: ["upper_back"],
    lats: ["lats"],
    traps: ["traps"],
    glutes: ["glutes"],
    quadriceps: ["quads"],
    quads: ["quads"],
    hamstrings: ["hamstrings"],
    calves: ["calves"],
    core: ["abs"],
    abs: ["abs"],
    obliques: ["obliques"],
    adductors: ["adductors"],
    hip_flexors: ["hip_flexors"],
  };
  return map[normalized] ?? [];
}
