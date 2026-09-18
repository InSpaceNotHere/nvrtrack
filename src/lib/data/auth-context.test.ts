import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("getAuthenticatedContext request-scoped behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reuses authenticated context within the same render/request scope", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "user1@example.com" } },
      error: null,
    });
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser,
      },
    });

    const authContextModule = await import("./auth-context");
    const first = await authContextModule.getAuthenticatedContext();
    const second = await authContextModule.getAuthenticatedContext();

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data.user.id).toBe("user-1");
    expect(second.data.user.id).toBe("user-1");
    expect(createServerSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("does not share cached authenticated users across isolated request scopes", async () => {
    const firstGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "user1@example.com" } },
      error: null,
    });
    createServerSupabaseClientMock.mockResolvedValueOnce({
      auth: {
        getUser: firstGetUser,
      },
    });

    let authContextModule = await import("./auth-context");
    const first = await authContextModule.getAuthenticatedContext();
    expect(first.error).toBeNull();
    expect(first.data.user.id).toBe("user-1");
    expect(firstGetUser).toHaveBeenCalledTimes(1);

    vi.resetModules();

    const secondGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-2", email: "user2@example.com" } },
      error: null,
    });
    createServerSupabaseClientMock.mockResolvedValueOnce({
      auth: {
        getUser: secondGetUser,
      },
    });

    authContextModule = await import("./auth-context");
    const second = await authContextModule.getAuthenticatedContext();
    expect(second.error).toBeNull();
    expect(second.data.user.id).toBe("user-2");
    expect(secondGetUser).toHaveBeenCalledTimes(1);
  });

  it("preserves unauthenticated and not-configured failure behavior", async () => {
    createServerSupabaseClientMock.mockResolvedValueOnce(null);
    let authContextModule = await import("./auth-context");
    const notConfigured = await authContextModule.getAuthenticatedContext();
    expect(notConfigured.error?.code).toBe("NOT_CONFIGURED");

    vi.resetModules();
    createServerSupabaseClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    authContextModule = await import("./auth-context");
    const unauthenticated = await authContextModule.getAuthenticatedContext();
    expect(unauthenticated.error?.code).toBe("UNAUTHENTICATED");
  });
});
