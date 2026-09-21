import type { ExerciseCatalogRow } from "@/lib/data/exercise-catalog";
import type { WorkoutTemplateType } from "@/lib/data/workout-planner";

export type ReadyMadePresetId =
  | "full-body-basics"
  | "classic-ppl"
  | "ppl-upper-lower"
  | "glute-killer"
  | "arms-killer";

export type ReadyMadePresetKind = "weekly_program" | "focused_workout";

export interface ReadyMadePresetExerciseDefinition {
  key: string;
  requestedName: string;
  catalogCandidates: string[];
  workingSets: number;
  repMin: number;
  repMax: number;
  restSecondsMin: number;
  restSecondsMax: number;
  isPerLeg: boolean;
}

export interface ReadyMadePresetSessionDefinition {
  key: string;
  name: string;
  templateType: WorkoutTemplateType;
  estimatedDurationMinutes: number;
  exercises: ReadyMadePresetExerciseDefinition[];
}

export interface ReadyMadePresetScheduleEntry {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekdayLabel: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  sessionKey: string | null;
  isRestDay: boolean;
}

export interface ReadyMadePresetDefinition {
  id: ReadyMadePresetId;
  order: number;
  title: string;
  subtitle: string;
  kind: ReadyMadePresetKind;
  startHereHint: string | null;
  designation: string;
  weeklyCommitment: string;
  summary: string;
  focusWarning: string | null;
  sessions: ReadyMadePresetSessionDefinition[];
  schedule: ReadyMadePresetScheduleEntry[];
}

export interface ReadyMadePresetResolvedExercise extends ReadyMadePresetExerciseDefinition {
  catalogExerciseId: string | null;
  resolvedName: string | null;
  resolvedEquipment: string | null;
  substitutionUsed: string | null;
}

export interface ReadyMadePresetResolvedSession extends Omit<ReadyMadePresetSessionDefinition, "exercises"> {
  exercises: ReadyMadePresetResolvedExercise[];
}

export interface ReadyMadePresetResolvedDefinition extends Omit<ReadyMadePresetDefinition, "sessions"> {
  sessions: ReadyMadePresetResolvedSession[];
  requiredEquipment: string[];
}

export interface ReadyMadePresetMissingExercise {
  presetId: ReadyMadePresetId;
  presetTitle: string;
  sessionName: string;
  requestedName: string;
  catalogCandidates: string[];
}

export interface ReadyMadePresetResolution {
  presets: ReadyMadePresetResolvedDefinition[];
  missingExercises: ReadyMadePresetMissingExercise[];
}

export const SHARED_TRAINING_GUIDANCE: string[] = [
  "Warm up and use lighter preparation sets before demanding lifts.",
  "Choose a controllable weight and aim to finish with about 2-3 good reps still possible.",
  "Start conservatively while learning unfamiliar movements.",
  "Rest about 2-3 minutes for compound movements and 1-2 minutes for isolation movements (longer when needed).",
  "When all sets reach the top of the rep target with controlled form, consider the smallest available weight increase.",
  "Stop an exercise that causes sharp or unusual pain.",
  "These are general templates, not injury-rehabilitation plans.",
];

const WEEKDAY_LABELS: Record<ReadyMadePresetScheduleEntry["weekday"], ReadyMadePresetScheduleEntry["weekdayLabel"]> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function scheduleEntry(
  weekday: ReadyMadePresetScheduleEntry["weekday"],
  sessionKey: string | null,
): ReadyMadePresetScheduleEntry {
  return {
    weekday,
    weekdayLabel: WEEKDAY_LABELS[weekday],
    sessionKey,
    isRestDay: sessionKey === null,
  };
}

function exercise(
  key: string,
  requestedName: string,
  options?: Partial<Pick<ReadyMadePresetExerciseDefinition, "catalogCandidates" | "workingSets" | "repMin" | "repMax" | "restSecondsMin" | "restSecondsMax" | "isPerLeg">>,
): ReadyMadePresetExerciseDefinition {
  return {
    key,
    requestedName,
    catalogCandidates: options?.catalogCandidates ?? [requestedName],
    workingSets: options?.workingSets ?? 2,
    repMin: options?.repMin ?? 8,
    repMax: options?.repMax ?? 12,
    restSecondsMin: options?.restSecondsMin ?? 90,
    restSecondsMax: options?.restSecondsMax ?? 150,
    isPerLeg: options?.isPerLeg ?? false,
  };
}

const PUSH_SESSION: ReadyMadePresetSessionDefinition = {
  key: "push",
  name: "Push",
  templateType: "push",
  estimatedDurationMinutes: 60,
  exercises: [
    exercise("barbell-bench-press", "Barbell Bench Press", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("incline-dumbbell-bench-press", "Incline Dumbbell Bench Press", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("dumbbell-shoulder-press", "Dumbbell Shoulder Press", {
      catalogCandidates: ["Dumbbell Shoulder Press", "Overhead Press"],
      workingSets: 2,
      repMin: 8,
      repMax: 12,
      restSecondsMin: 120,
      restSecondsMax: 180,
    }),
    exercise("dumbbell-lateral-raise", "Dumbbell Lateral Raise", { workingSets: 2, repMin: 12, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("triceps-pushdown", "Triceps Pushdown", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
  ],
};

const PULL_SESSION: ReadyMadePresetSessionDefinition = {
  key: "pull",
  name: "Pull",
  templateType: "pull",
  estimatedDurationMinutes: 60,
  exercises: [
    exercise("lat-pulldown", "Lat Pulldown", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("seated-cable-row", "Seated Cable Row", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("reverse-fly", "Reverse Fly", {
      catalogCandidates: ["Reverse Fly", "Cable Reverse Fly", "Machine Reverse Fly"],
      workingSets: 2,
      repMin: 12,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
    exercise("dumbbell-curl", "Dumbbell Curl", {
      catalogCandidates: ["Dumbbell Curl", "Dumbbell Biceps Curl", "Barbell Curl"],
      workingSets: 2,
      repMin: 10,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
    exercise("hammer-curl", "Hammer Curl", {
      catalogCandidates: ["Hammer Curl", "Dumbbell Hammer Curl", "Cable Hammer Curl"],
      workingSets: 2,
      repMin: 10,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
  ],
};

const LEGS_SESSION: ReadyMadePresetSessionDefinition = {
  key: "legs",
  name: "Legs",
  templateType: "legs",
  estimatedDurationMinutes: 65,
  exercises: [
    exercise("back-squat", "Back Squat", { workingSets: 3, repMin: 8, repMax: 10, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("romanian-deadlift", "Romanian Deadlift", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("seated-leg-curl", "Seated Leg Curl", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("leg-extension", "Leg Extension", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("standing-calf-raise", "Standing Calf Raise", { workingSets: 2, repMin: 12, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
  ],
};

const UPPER_SESSION: ReadyMadePresetSessionDefinition = {
  key: "upper",
  name: "Upper",
  templateType: "upper",
  estimatedDurationMinutes: 60,
  exercises: [
    exercise("barbell-bench-press", "Barbell Bench Press", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("seated-cable-row", "Seated Cable Row", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("lat-pulldown", "Lat Pulldown", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("dumbbell-lateral-raise", "Dumbbell Lateral Raise", { workingSets: 2, repMin: 12, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("dumbbell-curl", "Dumbbell Curl", {
      catalogCandidates: ["Dumbbell Curl", "Dumbbell Biceps Curl", "Barbell Curl"],
      workingSets: 2,
      repMin: 10,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
    exercise("triceps-pushdown", "Triceps Pushdown", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
  ],
};

const LOWER_SESSION: ReadyMadePresetSessionDefinition = {
  key: "lower",
  name: "Lower",
  templateType: "lower",
  estimatedDurationMinutes: 60,
  exercises: [
    exercise("leg-press", "Leg Press", { workingSets: 3, repMin: 10, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("hip-thrust", "Hip Thrust", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("seated-leg-curl", "Seated Leg Curl", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("leg-extension", "Leg Extension", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("standing-calf-raise", "Standing Calf Raise", { workingSets: 2, repMin: 12, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
  ],
};

const FULL_BODY_SESSION: ReadyMadePresetSessionDefinition = {
  key: "full-body",
  name: "Full Body",
  templateType: "custom",
  estimatedDurationMinutes: 50,
  exercises: [
    exercise("goblet-squat", "Goblet Squat", {
      catalogCandidates: ["Goblet Squat", "Dumbbell Goblet Squat", "Bodyweight Squat"],
      workingSets: 2,
      repMin: 8,
      repMax: 12,
      restSecondsMin: 120,
      restSecondsMax: 180,
    }),
    exercise("dumbbell-bench-press", "Dumbbell Bench Press", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("lat-pulldown", "Lat Pulldown", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("dumbbell-romanian-deadlift", "Dumbbell Romanian Deadlift", {
      catalogCandidates: ["Dumbbell Romanian Deadlift", "Romanian Deadlift"],
      workingSets: 2,
      repMin: 8,
      repMax: 12,
      restSecondsMin: 120,
      restSecondsMax: 180,
    }),
    exercise("seated-cable-row", "Seated Cable Row", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("crunch", "Crunch", { workingSets: 2, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
  ],
};

const GLUTE_KILLER_SESSION: ReadyMadePresetSessionDefinition = {
  key: "glute-killer",
  name: "Glute Killer",
  templateType: "custom",
  estimatedDurationMinutes: 55,
  exercises: [
    exercise("hip-thrust", "Hip Thrust", { workingSets: 3, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("romanian-deadlift", "Romanian Deadlift", { workingSets: 2, repMin: 8, repMax: 12, restSecondsMin: 120, restSecondsMax: 180 }),
    exercise("reverse-lunge", "Reverse Lunge", {
      catalogCandidates: ["Reverse Lunge", "Dumbbell Reverse Lunge", "Barbell Reverse Lunge"],
      workingSets: 2,
      repMin: 8,
      repMax: 12,
      restSecondsMin: 120,
      restSecondsMax: 180,
      isPerLeg: true,
    }),
    exercise("hip-abduction", "Hip Abduction", {
      catalogCandidates: ["Hip Abduction", "Machine Hip Abduction", "Cable Hip Abduction"],
      workingSets: 2,
      repMin: 12,
      repMax: 20,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
  ],
};

const ARMS_KILLER_SESSION: ReadyMadePresetSessionDefinition = {
  key: "arms-killer",
  name: "Arms Killer",
  templateType: "custom",
  estimatedDurationMinutes: 45,
  exercises: [
    exercise("dumbbell-curl", "Dumbbell Curl", {
      catalogCandidates: ["Dumbbell Curl", "Dumbbell Biceps Curl", "Barbell Curl"],
      workingSets: 3,
      repMin: 8,
      repMax: 12,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
    exercise("triceps-pushdown", "Triceps Pushdown", { workingSets: 3, repMin: 10, repMax: 15, restSecondsMin: 60, restSecondsMax: 120 }),
    exercise("hammer-curl", "Hammer Curl", {
      catalogCandidates: ["Hammer Curl", "Dumbbell Hammer Curl", "Cable Hammer Curl"],
      workingSets: 2,
      repMin: 10,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
    exercise("overhead-triceps-extension", "Overhead Triceps Extension", {
      catalogCandidates: ["Overhead Triceps Extension", "Dumbbell Overhead Triceps Extension", "Cable Overhead Triceps Extension"],
      workingSets: 2,
      repMin: 10,
      repMax: 15,
      restSecondsMin: 60,
      restSecondsMax: 120,
    }),
  ],
};

const READY_MADE_PRESET_LIST: ReadyMadePresetDefinition[] = [
  {
    id: "full-body-basics",
    order: 1,
    title: "Full Body Basics",
    subtitle: "3-day program",
    kind: "weekly_program",
    startHereHint: "Not sure where to start? Start here.",
    designation: "Program",
    weeklyCommitment: "3 sessions per week",
    summary: "Straightforward full-body repeat session on Monday, Wednesday, and Friday.",
    focusWarning: null,
    sessions: [FULL_BODY_SESSION],
    schedule: [
      scheduleEntry(1, "full-body"),
      scheduleEntry(2, null),
      scheduleEntry(3, "full-body"),
      scheduleEntry(4, null),
      scheduleEntry(5, "full-body"),
      scheduleEntry(6, null),
      scheduleEntry(0, null),
    ],
  },
  {
    id: "classic-ppl",
    order: 2,
    title: "Classic PPL",
    subtitle: "6-day program",
    kind: "weekly_program",
    startHereHint: null,
    designation: "Program",
    weeklyCommitment: "6 sessions per week",
    summary: "Higher-frequency option for users already training consistently.",
    focusWarning: null,
    sessions: [PUSH_SESSION, PULL_SESSION, LEGS_SESSION],
    schedule: [
      scheduleEntry(1, "push"),
      scheduleEntry(2, "pull"),
      scheduleEntry(3, "legs"),
      scheduleEntry(4, "push"),
      scheduleEntry(5, "pull"),
      scheduleEntry(6, "legs"),
      scheduleEntry(0, null),
    ],
  },
  {
    id: "ppl-upper-lower",
    order: 3,
    title: "PPL + Upper/Lower",
    subtitle: "5-day program",
    kind: "weekly_program",
    startHereHint: null,
    designation: "Program",
    weeklyCommitment: "5 sessions per week",
    summary: "Push/Pull/Legs start with Upper/Lower finish and built-in recovery days.",
    focusWarning: null,
    sessions: [PUSH_SESSION, PULL_SESSION, LEGS_SESSION, UPPER_SESSION, LOWER_SESSION],
    schedule: [
      scheduleEntry(1, "push"),
      scheduleEntry(2, "pull"),
      scheduleEntry(3, "legs"),
      scheduleEntry(4, null),
      scheduleEntry(5, "upper"),
      scheduleEntry(6, "lower"),
      scheduleEntry(0, null),
    ],
  },
  {
    id: "glute-killer",
    order: 4,
    title: "Glute Killer",
    subtitle: "Glute-focused session.",
    kind: "focused_workout",
    startHereHint: null,
    designation: "Focused workout",
    weeklyCommitment: "Single session",
    summary: "Focused lower-body accessory session to slot into an existing routine.",
    focusWarning:
      "Use within your broader routine; account for other training of the same muscles. Do not automatically stack onto every workout.",
    sessions: [GLUTE_KILLER_SESSION],
    schedule: [],
  },
  {
    id: "arms-killer",
    order: 5,
    title: "Arms Killer",
    subtitle: "Biceps and triceps session.",
    kind: "focused_workout",
    startHereHint: null,
    designation: "Focused workout",
    weeklyCommitment: "Single session",
    summary: "Focused arm session for biceps and triceps volume.",
    focusWarning:
      "Use within your broader routine; account for other training of the same muscles. Do not automatically stack onto every workout.",
    sessions: [ARMS_KILLER_SESSION],
    schedule: [],
  },
];

export const READY_MADE_PRESETS: ReadyMadePresetDefinition[] = READY_MADE_PRESET_LIST.sort(
  (left, right) => left.order - right.order,
);

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ");
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildCatalogIndexes(catalog: ExerciseCatalogRow[]): {
  byNormalizedName: Map<string, ExerciseCatalogRow>;
  byExactName: Map<string, ExerciseCatalogRow>;
  byAlias: Map<string, ExerciseCatalogRow>;
} {
  const byNormalizedName = new Map<string, ExerciseCatalogRow>();
  const byExactName = new Map<string, ExerciseCatalogRow>();
  const byAlias = new Map<string, ExerciseCatalogRow>();

  for (const entry of catalog) {
    byNormalizedName.set(normalizeLookup(entry.normalized_name), entry);
    byExactName.set(normalizeLookup(entry.name), entry);
    for (const alias of entry.aliases ?? []) {
      byAlias.set(normalizeLookup(alias), entry);
    }
  }

  return { byNormalizedName, byExactName, byAlias };
}

function resolveCatalogExercise(
  candidates: string[],
  indexes: ReturnType<typeof buildCatalogIndexes>,
): { match: ExerciseCatalogRow | null; candidateUsed: string | null } {
  for (const candidate of candidates) {
    const normalized = normalizeLookup(candidate);
    const exact = indexes.byExactName.get(normalized);
    if (exact) {
      return { match: exact, candidateUsed: candidate };
    }
    const byNormalized = indexes.byNormalizedName.get(normalized);
    if (byNormalized) {
      return { match: byNormalized, candidateUsed: candidate };
    }
    const byAlias = indexes.byAlias.get(normalized);
    if (byAlias) {
      return { match: byAlias, candidateUsed: candidate };
    }
  }

  return { match: null, candidateUsed: null };
}

function sortEquipment(values: string[]): string[] {
  return [...new Set(values)]
    .filter(Boolean)
    .map((item) => titleCase(item))
    .sort((left, right) => left.localeCompare(right));
}

export function buildReadyMadePresetResolution(catalog: ExerciseCatalogRow[]): ReadyMadePresetResolution {
  const indexes = buildCatalogIndexes(catalog);
  const missingExercises: ReadyMadePresetMissingExercise[] = [];

  const presets = READY_MADE_PRESETS.map((preset): ReadyMadePresetResolvedDefinition => {
    const sessions = preset.sessions.map((session): ReadyMadePresetResolvedSession => {
      const exercises = session.exercises.map((exerciseDef): ReadyMadePresetResolvedExercise => {
        const candidates = [exerciseDef.requestedName, ...exerciseDef.catalogCandidates.filter((name) => name !== exerciseDef.requestedName)];
        const resolution = resolveCatalogExercise(candidates, indexes);
        if (!resolution.match) {
          missingExercises.push({
            presetId: preset.id,
            presetTitle: preset.title,
            sessionName: session.name,
            requestedName: exerciseDef.requestedName,
            catalogCandidates: candidates,
          });
        }
        return {
          ...exerciseDef,
          catalogExerciseId: resolution.match?.id ?? null,
          resolvedName: resolution.match?.name ?? null,
          resolvedEquipment: resolution.match?.equipment ?? null,
          substitutionUsed:
            resolution.match && resolution.match.name.toLowerCase() !== exerciseDef.requestedName.toLowerCase()
              ? resolution.match.name
              : null,
        };
      });

      return { ...session, exercises };
    });

    const requiredEquipment = sortEquipment(
      sessions.flatMap((session) =>
        session.exercises.map((exercise) => exercise.resolvedEquipment).filter((value): value is string => Boolean(value)),
      ),
    );

    return {
      ...preset,
      sessions,
      requiredEquipment,
    };
  });

  return { presets, missingExercises };
}

export function formatRepRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}-${max}`;
}

export function formatRestGuidance(minSeconds: number, maxSeconds: number): string {
  const minMinutes = minSeconds / 60;
  const maxMinutes = maxSeconds / 60;
  if (Number.isInteger(minMinutes) && Number.isInteger(maxMinutes)) {
    return minMinutes === maxMinutes ? `${minMinutes} min` : `${minMinutes}-${maxMinutes} min`;
  }
  const minLabel = minMinutes.toFixed(1).replace(/\.0$/, "");
  const maxLabel = maxMinutes.toFixed(1).replace(/\.0$/, "");
  return minLabel === maxLabel ? `${minLabel} min` : `${minLabel}-${maxLabel} min`;
}

export function buildTemplateExerciseGuidanceLabel(input: {
  workingSets: number;
  repMin: number;
  repMax: number;
  restSecondsMin: number;
  restSecondsMax: number;
  isPerLeg: boolean;
}): string {
  const repRangeLabel = formatRepRange(input.repMin, input.repMax);
  const restLabel = formatRestGuidance(input.restSecondsMin, input.restSecondsMax);
  const perLegSuffix = input.isPerLeg ? " per leg" : "";
  return `${input.workingSets} working sets x ${repRangeLabel} reps${perLegSuffix}; rest ${restLabel}.`;
}
