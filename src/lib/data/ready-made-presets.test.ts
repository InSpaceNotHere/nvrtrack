import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExerciseCatalogRow } from "./exercise-catalog";
import type { WorkoutTemplateRow, WorkoutWeekdayScheduleRow } from "./workout-planner";

const getAuthenticatedContextMock = vi.fn();
const getExerciseCatalogMock = vi.fn();
const getMyWorkoutTemplatesMock = vi.fn();
const getMyWorkoutTemplateExercisesMock = vi.fn();
const createWorkoutTemplateMock = vi.fn();
const replaceWorkoutTemplateExercisesMock = vi.fn();
const getMyWeekdayScheduleMock = vi.fn();
const setWeekdayScheduleMock = vi.fn();

vi.mock("./auth-context", () => ({
  getAuthenticatedContext: () => getAuthenticatedContextMock(),
}));

vi.mock("./exercise-catalog", () => ({
  getExerciseCatalog: (...args: unknown[]) => getExerciseCatalogMock(...args),
}));

vi.mock("./workout-planner", () => ({
  getMyWorkoutTemplates: () => getMyWorkoutTemplatesMock(),
  getMyWorkoutTemplateExercises: (...args: unknown[]) => getMyWorkoutTemplateExercisesMock(...args),
  createWorkoutTemplate: (...args: unknown[]) => createWorkoutTemplateMock(...args),
  replaceWorkoutTemplateExercises: (...args: unknown[]) => replaceWorkoutTemplateExercisesMock(...args),
  getMyWeekdaySchedule: () => getMyWeekdayScheduleMock(),
  setWeekdaySchedule: (...args: unknown[]) => setWeekdayScheduleMock(...args),
}));

interface FixtureState {
  templates: WorkoutTemplateRow[];
  templateExercises: Array<{
    id: string;
    template_id: string;
    user_id: string;
    position: number;
    exercise_name: string;
  }>;
  weekdaySchedule: WorkoutWeekdayScheduleRow[];
  nextTemplateId: number;
  nextTemplateExerciseId: number;
  scheduleWriteCount: number;
}

function makeCatalogRow(input: {
  id: string;
  name: string;
  normalized_name?: string;
  aliases?: string[];
  equipment?: string;
}): ExerciseCatalogRow {
  return {
    id: input.id,
    name: input.name,
    normalized_name: input.normalized_name ?? input.name.toLowerCase(),
    aliases: input.aliases ?? [],
    primary_muscle_group: "full body",
    secondary_muscle_groups: [],
    equipment: input.equipment ?? "dumbbell",
    movement_pattern: "full_body",
    instructions: null,
    is_active: true,
    created_at: "2026-09-21T00:00:00.000Z",
    updated_at: "2026-09-21T00:00:00.000Z",
    primary_muscles: [],
    secondary_muscles: [],
    body_region: null,
    canonical_lift: null,
    muscle_metadata_version: 1,
  };
}

function setupFixtureState(): FixtureState {
  return {
    templates: [],
    templateExercises: [],
    weekdaySchedule: [],
    nextTemplateId: 1,
    nextTemplateExerciseId: 1,
    scheduleWriteCount: 0,
  };
}

function installPlannerMocks(state: FixtureState) {
  getMyWorkoutTemplatesMock.mockImplementation(async () => ({
    error: null,
    data: state.templates,
  }));

  getMyWorkoutTemplateExercisesMock.mockImplementation(async () => ({
    error: null,
    data: state.templateExercises,
  }));

  createWorkoutTemplateMock.mockImplementation(async (input: {
    name: string;
    template_type: WorkoutTemplateRow["template_type"];
    estimated_duration_minutes: number | null;
    notes: string | null;
  }) => {
    const existing = state.templates.find(
      (template) => template.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (existing) {
      return {
        error: { code: "DB_ERROR", message: "duplicate key value violates unique constraint" },
      };
    }
    const created: WorkoutTemplateRow = {
      id: `template-${state.nextTemplateId++}`,
      user_id: "user-1",
      name: input.name,
      template_type: input.template_type,
      estimated_duration_minutes: input.estimated_duration_minutes,
      notes: input.notes,
      is_archived: false,
      created_at: "2026-09-21T00:00:00.000Z",
      updated_at: "2026-09-21T00:00:00.000Z",
    };
    state.templates.push(created);
    return { error: null, data: created };
  });

  replaceWorkoutTemplateExercisesMock.mockImplementation(
    async (
      templateId: string,
      exercises: Array<{ position: number; exercise_name: string }>,
    ) => {
      state.templateExercises = state.templateExercises.filter(
        (exercise) => exercise.template_id !== templateId,
      );
      for (const exercise of exercises) {
        state.templateExercises.push({
          id: `template-exercise-${state.nextTemplateExerciseId++}`,
          template_id: templateId,
          user_id: "user-1",
          position: exercise.position,
          exercise_name: exercise.exercise_name,
        });
      }
      return { error: null, data: [] };
    },
  );

  getMyWeekdayScheduleMock.mockImplementation(async () => ({
    error: null,
    data: state.weekdaySchedule,
  }));

  setWeekdayScheduleMock.mockImplementation(
    async (
      weekday: number,
      payload: { template_id: string | null; is_rest_day: boolean },
    ) => {
      state.scheduleWriteCount += 1;
      const existing = state.weekdaySchedule.find((entry) => entry.weekday === weekday);
      if (existing) {
        existing.template_id = payload.template_id;
        existing.is_rest_day = payload.is_rest_day;
        return { error: null, data: existing };
      }
      const created: WorkoutWeekdayScheduleRow = {
        id: `weekday-${weekday}`,
        user_id: "user-1",
        weekday,
        template_id: payload.template_id,
        is_rest_day: payload.is_rest_day,
        created_at: "2026-09-21T00:00:00.000Z",
        updated_at: "2026-09-21T00:00:00.000Z",
      };
      state.weekdaySchedule.push(created);
      return { error: null, data: created };
    },
  );
}

describe("importReadyMadePreset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContextMock.mockResolvedValue({
      error: null,
      data: {
        user: { id: "user-1" },
        supabase: {},
      },
    });
  });

  it("saves templates without schedule writes and remains idempotent across retries", async () => {
    const state = setupFixtureState();
    installPlannerMocks(state);
    getExerciseCatalogMock.mockResolvedValue({
      error: null,
      data: [
        makeCatalogRow({ id: "1", name: "Dumbbell Goblet Squat" }),
        makeCatalogRow({ id: "2", name: "Dumbbell Bench Press" }),
        makeCatalogRow({ id: "3", name: "Lat Pulldown" }),
        makeCatalogRow({ id: "4", name: "Dumbbell Romanian Deadlift" }),
        makeCatalogRow({ id: "5", name: "Seated Cable Row" }),
        makeCatalogRow({ id: "6", name: "Crunch" }),
      ],
    });

    const presetModule = await import("./ready-made-presets");
    const first = await presetModule.importReadyMadePreset({
      presetId: "full-body-basics",
      applySchedule: false,
      confirmScheduleReplace: false,
    });
    const second = await presetModule.importReadyMadePreset({
      presetId: "full-body-basics",
      applySchedule: false,
      confirmScheduleReplace: false,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(state.templates).toHaveLength(1);
    expect(state.templateExercises.filter((exercise) => exercise.template_id === state.templates[0]?.id)).toHaveLength(6);
    expect(state.scheduleWriteCount).toBe(0);
  });

  it("requires explicit confirmation before replacing existing weekday assignments", async () => {
    const state = setupFixtureState();
    installPlannerMocks(state);
    state.weekdaySchedule = [
      {
        id: "weekday-1",
        user_id: "user-1",
        weekday: 1,
        template_id: "legacy-template",
        is_rest_day: false,
        created_at: "2026-09-21T00:00:00.000Z",
        updated_at: "2026-09-21T00:00:00.000Z",
      },
    ];
    getExerciseCatalogMock.mockResolvedValue({
      error: null,
      data: [
        makeCatalogRow({ id: "1", name: "Dumbbell Goblet Squat" }),
        makeCatalogRow({ id: "2", name: "Dumbbell Bench Press" }),
        makeCatalogRow({ id: "3", name: "Lat Pulldown" }),
        makeCatalogRow({ id: "4", name: "Dumbbell Romanian Deadlift" }),
        makeCatalogRow({ id: "5", name: "Seated Cable Row" }),
        makeCatalogRow({ id: "6", name: "Crunch" }),
      ],
    });

    const presetModule = await import("./ready-made-presets");
    const pending = await presetModule.importReadyMadePreset({
      presetId: "full-body-basics",
      applySchedule: true,
      confirmScheduleReplace: false,
    });
    expect(pending.error).toBeNull();
    if (pending.error) {
      throw new Error("Unexpected import error");
    }
    expect(pending.data.requiresScheduleConfirmation).toBe(true);
    expect(state.scheduleWriteCount).toBe(0);

    const confirmed = await presetModule.importReadyMadePreset({
      presetId: "full-body-basics",
      applySchedule: true,
      confirmScheduleReplace: true,
    });
    expect(confirmed.error).toBeNull();
    if (confirmed.error) {
      throw new Error("Unexpected import error");
    }
    expect(confirmed.data.appliedSchedule).toBe(true);
    expect(state.scheduleWriteCount).toBe(7);

    const monday = state.weekdaySchedule.find((entry) => entry.weekday === 1);
    const wednesday = state.weekdaySchedule.find((entry) => entry.weekday === 3);
    const friday = state.weekdaySchedule.find((entry) => entry.weekday === 5);
    const sunday = state.weekdaySchedule.find((entry) => entry.weekday === 0);
    expect(monday?.template_id).toBeTruthy();
    expect(wednesday?.template_id).toBeTruthy();
    expect(friday?.template_id).toBeTruthy();
    expect(sunday?.is_rest_day).toBe(true);
  });
});
