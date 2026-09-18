import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExerciseCatalogRow } from "./exercise-catalog";
import type { WorkoutScheduleOverrideRow, WorkoutTemplateExerciseRow, WorkoutTemplateRow, WorkoutWeekdayScheduleRow } from "./workout-planner";

type FakeTableName =
  | "workout_templates"
  | "workout_template_exercises"
  | "workout_weekday_schedule"
  | "workout_schedule_overrides";

interface FakeState {
  workout_templates: WorkoutTemplateRow[];
  workout_template_exercises: WorkoutTemplateExerciseRow[];
  workout_weekday_schedule: WorkoutWeekdayScheduleRow[];
  workout_schedule_overrides: WorkoutScheduleOverrideRow[];
}

interface FakeCounters {
  insert: number;
  update: number;
  delete: number;
  upsert: number;
}

const authContextMock = vi.fn();
const exerciseCatalogMock = vi.fn<() => Promise<{ error: null; data: ExerciseCatalogRow[] }>>();

vi.mock("./auth-context", () => ({
  getAuthenticatedContext: () => authContextMock(),
}));

vi.mock("./exercise-catalog", () => ({
  getExerciseCatalog: () => exerciseCatalogMock(),
}));

function buildSupabase(state: FakeState, counters: FakeCounters, userId = "user-1") {
  const idCounter = new Map<string, number>();
  function nextId(prefix: string): string {
    const current = (idCounter.get(prefix) ?? 0) + 1;
    idCounter.set(prefix, current);
    return `${prefix}-${current}`;
  }

  function filterRows(rows: Array<Record<string, unknown>>, filters: Array<{ key: string; value: unknown }>) {
    return rows.filter((row) => filters.every((filter) => row[filter.key] === filter.value));
  }

  function tableQuery(table: FakeTableName) {
    const filters: Array<{ key: string; value: unknown }> = [];
    let selectedRows: Array<Record<string, unknown>> = state[table] as Array<Record<string, unknown>>;

    const query = {
      select() {
        return query;
      },
      eq(key: string, value: unknown) {
        filters.push({ key, value });
        return query;
      },
      gte(key: string, value: string) {
        selectedRows = selectedRows.filter((row) => String(row[key] ?? "") >= value);
        return query;
      },
      lte(key: string, value: string) {
        selectedRows = selectedRows.filter((row) => String(row[key] ?? "") <= value);
        return query;
      },
      in(key: string, values: string[]) {
        const allowed = new Set(values);
        selectedRows = selectedRows.filter((row) => allowed.has(String(row[key] ?? "")));
        return query;
      },
      async order(key: string, options?: { ascending?: boolean }) {
        const asc = options?.ascending !== false;
        const rows = filterRows(selectedRows, filters).sort((left, right) => {
          const a = String(left[key] ?? "");
          const b = String(right[key] ?? "");
          return asc ? a.localeCompare(b) : b.localeCompare(a);
        });
        return { data: rows, error: null };
      },
      async maybeSingle() {
        const rows = filterRows(selectedRows, filters);
        return { data: rows[0] ?? null, error: null };
      },
      async single() {
        const rows = filterRows(selectedRows, filters);
        return { data: rows[0] ?? null, error: null };
      },
      insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
        counters.insert += 1;
        const rows = Array.isArray(payload) ? payload : [payload];
        const now = "2026-07-20T00:00:00.000Z";
        const inserted = rows.map((row) => {
          if (table === "workout_templates") {
            const typed = row as Partial<WorkoutTemplateRow> & { user_id: string; name: string; template_type: WorkoutTemplateRow["template_type"] };
            const created: WorkoutTemplateRow = {
              id: typed.id ?? nextId("template"),
              user_id: typed.user_id,
              name: typed.name,
              template_type: typed.template_type,
              estimated_duration_minutes: typed.estimated_duration_minutes ?? null,
              notes: typed.notes ?? null,
              is_archived: typed.is_archived ?? false,
              created_at: now,
              updated_at: now,
            };
            state.workout_templates.push(created);
            return created as Record<string, unknown>;
          }
          if (table === "workout_template_exercises") {
            const typed = row as Partial<WorkoutTemplateExerciseRow> & {
              user_id: string;
              template_id: string;
              exercise_name: string;
              position: number;
            };
            const created: WorkoutTemplateExerciseRow = {
              id: typed.id ?? nextId("template-exercise"),
              user_id: typed.user_id,
              template_id: typed.template_id,
              exercise_id: typed.exercise_id ?? null,
              catalog_exercise_id: typed.catalog_exercise_id ?? null,
              exercise_name: typed.exercise_name,
              position: typed.position,
              notes: typed.notes ?? null,
              primary_muscles: typed.primary_muscles ?? [],
              secondary_muscles: typed.secondary_muscles ?? [],
              body_region: typed.body_region ?? null,
              movement_pattern: typed.movement_pattern ?? null,
              created_at: now,
              updated_at: now,
            };
            state.workout_template_exercises.push(created);
            return created as Record<string, unknown>;
          }
          if (table === "workout_weekday_schedule") {
            const typed = row as Partial<WorkoutWeekdayScheduleRow> & { user_id: string; weekday: number };
            const created: WorkoutWeekdayScheduleRow = {
              id: typed.id ?? nextId("weekday"),
              user_id: typed.user_id,
              weekday: typed.weekday,
              template_id: typed.template_id ?? null,
              is_rest_day: typed.is_rest_day ?? false,
              created_at: now,
              updated_at: now,
            };
            state.workout_weekday_schedule.push(created);
            return created as Record<string, unknown>;
          }
          return row;
        });
        return {
          select: () => ({
            async single() {
              return { data: inserted[0] ?? null, error: null };
            },
            async maybeSingle() {
              return { data: inserted[0] ?? null, error: null };
            },
            async then(resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown) {
              return resolve({ data: inserted, error: null });
            },
          }),
          async single() {
            return { data: inserted[0] ?? null, error: null };
          },
          async maybeSingle() {
            return { data: inserted[0] ?? null, error: null };
          },
        };
      },
      update(payload: Record<string, unknown>) {
        counters.update += 1;
        const rows = filterRows(state[table] as Array<Record<string, unknown>>, filters);
        for (const row of rows) {
          Object.assign(row, payload);
        }
        return {
          eq(key: string, value: unknown) {
            filters.push({ key, value });
            return this;
          },
          select: async () => ({ data: rows[0] ?? null, error: null }),
          maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        };
      },
      delete() {
        counters.delete += 1;
        return {
          eq(key: string, value: unknown) {
            filters.push({ key, value });
            return this;
          },
          async select() {
            const rows = filterRows(state[table] as Array<Record<string, unknown>>, filters);
            state[table] = (state[table] as Array<Record<string, unknown>>).filter((row) => !rows.includes(row)) as never;
            return { data: rows[0] ?? null, error: null };
          },
        };
      },
      upsert(payload: Array<Record<string, unknown>>) {
        counters.upsert += 1;
        const now = "2026-07-20T00:00:00.000Z";
        for (const row of payload) {
          const match = state.workout_weekday_schedule.find(
            (entry) => entry.user_id === String(row.user_id ?? userId) && entry.weekday === Number(row.weekday ?? -1),
          );
          if (match) {
            match.template_id = (row.template_id as string | null) ?? null;
            match.is_rest_day = Boolean(row.is_rest_day);
            match.updated_at = now;
            continue;
          }
          state.workout_weekday_schedule.push({
            id: nextId("weekday"),
            user_id: String(row.user_id ?? userId),
            weekday: Number(row.weekday ?? 0),
            template_id: (row.template_id as string | null) ?? null,
            is_rest_day: Boolean(row.is_rest_day),
            created_at: now,
            updated_at: now,
          });
        }
        return {
          select: async () => ({ data: state.workout_weekday_schedule.map((row) => ({ id: row.id })), error: null }),
        };
      },
    };

    return query;
  }

  return {
    from(table: FakeTableName) {
      return tableQuery(table);
    },
  };
}

describe("workout planner data read/mutation boundaries", () => {
  let plannerModule: typeof import("./workout-planner");

  function baseState(): FakeState {
    return {
      workout_templates: [],
      workout_template_exercises: [],
      workout_weekday_schedule: [],
      workout_schedule_overrides: [],
    };
  }

  function makeAuth(state: FakeState, counters: FakeCounters) {
    authContextMock.mockResolvedValue({
      error: null,
      data: {
        user: { id: "user-1" },
        supabase: buildSupabase(state, counters),
      },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    exerciseCatalogMock.mockResolvedValue({ error: null, data: [] });
  });

  beforeEach(async () => {
    plannerModule = await import("./workout-planner");
  });

  it("empty planner read performs zero writes and is deterministic", async () => {
    const state = baseState();
    const counters: FakeCounters = { insert: 0, update: 0, delete: 0, upsert: 0 };
    makeAuth(state, counters);

    const first = await plannerModule.getMyWeekdaySchedule();
    const second = await plannerModule.getMyWeekdaySchedule();

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toEqual([]);
    expect(second.data).toEqual([]);
    expect(counters.insert).toBe(0);
    expect(counters.update).toBe(0);
    expect(counters.delete).toBe(0);
    expect(counters.upsert).toBe(0);
  });

  it("configured planner read performs zero writes including dashboard/training planner reads", async () => {
    const state = baseState();
    state.workout_templates.push({
      id: "template-1",
      user_id: "user-1",
      name: "Push",
      template_type: "push",
      estimated_duration_minutes: 60,
      notes: null,
      is_archived: false,
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    });
    state.workout_weekday_schedule.push({
      id: "weekday-1",
      user_id: "user-1",
      weekday: 1,
      template_id: "template-1",
      is_rest_day: false,
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    });
    const counters: FakeCounters = { insert: 0, update: 0, delete: 0, upsert: 0 };
    makeAuth(state, counters);

    const templates = await plannerModule.getMyWorkoutTemplates();
    const weekday = await plannerModule.getMyWeekdaySchedule();
    const overrides = await plannerModule.getMyScheduleOverridesForRange("2026-07-20", "2026-07-26");

    expect(templates.error).toBeNull();
    expect(weekday.error).toBeNull();
    expect(overrides.error).toBeNull();
    expect(counters.insert).toBe(0);
    expect(counters.update).toBe(0);
    expect(counters.delete).toBe(0);
    expect(counters.upsert).toBe(0);
  });

  it("explicit initialization creates starter state and is idempotent", async () => {
    const state = baseState();
    const counters: FakeCounters = { insert: 0, update: 0, delete: 0, upsert: 0 };
    makeAuth(state, counters);

    const first = await plannerModule.initializePlannerDefaults();
    const second = await plannerModule.initializePlannerDefaults();

    expect(first.error).toBeNull();
    expect(first.data).toEqual({ created: true, skippedReason: null });
    expect(state.workout_templates.length).toBe(5);
    expect(state.workout_weekday_schedule.length).toBe(7);
    expect(state.workout_weekday_schedule.find((row) => row.weekday === 0)?.is_rest_day).toBe(true);
    expect(state.workout_weekday_schedule.find((row) => row.weekday === 6)?.is_rest_day).toBe(true);
    expect(state.workout_weekday_schedule.find((row) => row.weekday === 1)?.template_id).toBeTruthy();

    expect(second.error).toBeNull();
    expect(second.data).toEqual({ created: false, skippedReason: "already_configured" });
    expect(state.workout_templates.length).toBe(5);
    expect(state.workout_weekday_schedule.length).toBe(7);
  });

  it("explicit initialization preserves existing planner configuration", async () => {
    const state = baseState();
    state.workout_templates.push({
      id: "template-existing",
      user_id: "user-1",
      name: "Custom Day",
      template_type: "custom",
      estimated_duration_minutes: null,
      notes: null,
      is_archived: false,
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    });
    state.workout_weekday_schedule.push({
      id: "weekday-existing",
      user_id: "user-1",
      weekday: 2,
      template_id: "template-existing",
      is_rest_day: false,
      created_at: "2026-07-20T00:00:00.000Z",
      updated_at: "2026-07-20T00:00:00.000Z",
    });
    const counters: FakeCounters = { insert: 0, update: 0, delete: 0, upsert: 0 };
    makeAuth(state, counters);

    const result = await plannerModule.initializePlannerDefaults();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ created: false, skippedReason: "already_configured" });
    expect(state.workout_templates).toHaveLength(1);
    expect(state.workout_weekday_schedule).toHaveLength(1);
    expect(counters.insert).toBe(0);
    expect(counters.upsert).toBe(0);
  });

  it("legacy initializePlannerDefaultsIfNeeded remains no-op to prevent write-on-read", async () => {
    const state = baseState();
    const counters: FakeCounters = { insert: 0, update: 0, delete: 0, upsert: 0 };
    makeAuth(state, counters);

    const result = await plannerModule.initializePlannerDefaultsIfNeeded();

    expect(result.error).toBeNull();
    expect(counters.insert).toBe(0);
    expect(counters.update).toBe(0);
    expect(counters.delete).toBe(0);
    expect(counters.upsert).toBe(0);
  });
});
