import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedContextMock = vi.fn();

vi.mock("./auth-context", () => ({
  getAuthenticatedContext: getAuthenticatedContextMock,
}));

vi.mock("@/lib/nutrition/date", () => ({
  isValidDateString: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
}));

interface DeleteFlowConfig {
  storageErrorMessage?: string | null;
  existingRow?: { id: string; storage_path: string } | null;
  metadataDeleteErrorMessage?: string | null;
}

function createSupabaseDeleteDouble(config: DeleteFlowConfig) {
  const removeMock = vi.fn(async () => ({
    data: [],
    error: config.storageErrorMessage ? { message: config.storageErrorMessage } : null,
  }));
  const metadataMaybeSingleMock = vi.fn(async () => ({
    data: config.existingRow ?? { id: "photo-1", storage_path: "user-1/2099-01-01/front-a.jpg" },
    error: null,
  }));
  const metadataDeleteMaybeSingleMock = vi.fn(async () => ({
    data: config.metadataDeleteErrorMessage ? null : { id: "photo-1" },
    error: config.metadataDeleteErrorMessage ? { message: config.metadataDeleteErrorMessage } : null,
  }));

  const supabase = {
    from(table: string) {
      expect(table).toBe("progress_photos");
      return {
        select() {
          return {
            eq() {
              return this;
            },
            maybeSingle: metadataMaybeSingleMock,
          };
        },
        delete() {
          return {
            eq() {
              return this;
            },
            select() {
              return {
                maybeSingle: metadataDeleteMaybeSingleMock,
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("progress-photos");
        return {
          remove: removeMock,
        };
      },
    },
  };

  return {
    supabase,
    removeMock,
    metadataMaybeSingleMock,
    metadataDeleteMaybeSingleMock,
  };
}

describe("deleteMyProgressPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats missing storage object as idempotent and deletes metadata", async () => {
    const doubles = createSupabaseDeleteDouble({
      storageErrorMessage: "The resource was not found",
    });
    getAuthenticatedContextMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        supabase: doubles.supabase,
      },
      error: null,
    });

    const { deleteMyProgressPhoto } = await import("./progress-photos");
    const result = await deleteMyProgressPhoto("photo-1");

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: "photo-1" });
    expect(doubles.removeMock).toHaveBeenCalledTimes(1);
    expect(doubles.metadataDeleteMaybeSingleMock).toHaveBeenCalledTimes(1);
  });

  it("does not delete metadata when storage removal fails for other reasons", async () => {
    const doubles = createSupabaseDeleteDouble({
      storageErrorMessage: "storage timeout",
    });
    getAuthenticatedContextMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        supabase: doubles.supabase,
      },
      error: null,
    });

    const { deleteMyProgressPhoto } = await import("./progress-photos");
    const result = await deleteMyProgressPhoto("photo-1");

    expect(result.error?.message).toBe("Failed to delete progress photo file from storage.");
    expect(doubles.metadataDeleteMaybeSingleMock).not.toHaveBeenCalled();
  });

  it("returns retriable metadata cleanup error when db delete fails after storage delete", async () => {
    const doubles = createSupabaseDeleteDouble({
      metadataDeleteErrorMessage: "relation lock timeout",
    });
    getAuthenticatedContextMock.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        supabase: doubles.supabase,
      },
      error: null,
    });

    const { deleteMyProgressPhoto } = await import("./progress-photos");
    const result = await deleteMyProgressPhoto("photo-1");

    expect(result.error?.message).toBe("Photo file removed but metadata cleanup failed. Retry delete.");
    expect(result.error?.cause).toBe("relation lock timeout");
    expect(doubles.removeMock).toHaveBeenCalledTimes(1);
    expect(doubles.metadataDeleteMaybeSingleMock).toHaveBeenCalledTimes(1);
  });
});
