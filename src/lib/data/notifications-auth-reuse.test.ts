import { beforeEach, describe, expect, it, vi } from "vitest";

type Filters = Array<{ column: string; value: unknown }>;

const createServerSupabaseClientMock = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult): (...args: TArgs) => TResult {
      const records = new Map<string, TResult>();
      return (...args: TArgs) => {
        const key = JSON.stringify(args);
        if (!records.has(key)) {
          records.set(key, fn(...args));
        }
        return records.get(key) as TResult;
      };
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

function createSupabaseDouble(getUser: ReturnType<typeof vi.fn>) {
  const selectFilters: Filters = [];
  const updateFilters: Filters = [];
  const existingRow = {
    user_id: "user-1",
    workout_reminder_enabled: true,
    protein_reminder_enabled: true,
    weight_reminder_enabled: true,
    photo_reminder_enabled: true,
    new_pr_enabled: true,
    workout_streak_enabled: true,
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  };

  const supabase = {
    auth: {
      getUser,
    },
    from(table: "notification_preferences") {
      expect(table).toBe("notification_preferences");
      return {
        select() {
          return {
            eq(column: string, value: unknown) {
              selectFilters.push({ column, value });
              return this;
            },
            async maybeSingle() {
              return { data: existingRow, error: null };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            eq(column: string, value: unknown) {
              updateFilters.push({ column, value });
              return this;
            },
            select() {
              return {
                async maybeSingle() {
                  return {
                    data: {
                      ...existingRow,
                      ...payload,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    supabase,
    selectFilters,
    updateFilters,
  };
}

describe("notifications data helper auth-context reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reuses one auth resolution across nested helper calls and preserves user-scoped filters", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const { supabase, selectFilters, updateFilters } = createSupabaseDouble(getUser);
    createServerSupabaseClientMock.mockResolvedValue(supabase);

    const notificationsModule = await import("./notifications");
    const result = await notificationsModule.updateMyNotificationPreferences({
      workout_reminder_enabled: false,
    });

    expect(result.error).toBeNull();
    expect(result.data.workout_reminder_enabled).toBe(false);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(selectFilters).toEqual(expect.arrayContaining([{ column: "user_id", value: "user-1" }]));
    expect(updateFilters).toEqual(expect.arrayContaining([{ column: "user_id", value: "user-1" }]));
  });

  it("keeps unauthenticated behavior unchanged for nested helper callers", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { supabase } = createSupabaseDouble(getUser);
    createServerSupabaseClientMock.mockResolvedValue(supabase);

    const notificationsModule = await import("./notifications");
    const result = await notificationsModule.updateMyNotificationPreferences({
      workout_reminder_enabled: false,
    });
    expect(result.error?.code).toBe("UNAUTHENTICATED");
  });
});
