import { getAuthenticatedContext, type AuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { isValidDateString } from "@/lib/nutrition/date";

export type ProgressPhotoView = "front" | "side" | "back";

export interface ProgressPhotoRow {
  id: string;
  user_id: string;
  photo_date: string;
  view: ProgressPhotoView;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  original_filename: string;
  weight: number | null;
  weight_unit: "lb" | "kg" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressPhotoSignedRow extends ProgressPhotoRow {
  signed_url: string | null;
}

export interface CreateProgressPhotoMetadataInput {
  photo_date: string;
  view: ProgressPhotoView;
  storage_path: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  original_filename: string;
  weight?: number | null;
  weight_unit?: "lb" | "kg" | null;
  notes?: string | null;
}

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRow<T>(value: unknown): T | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return value as T;
}

export async function getMyProgressPhotos(): Promise<DataAccessResult<ProgressPhotoRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("photo_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load progress photos.",
      cause: error.message,
    });
  }
  return ok(asRows<ProgressPhotoRow>(data));
}

export async function getMyProgressPhotoPage(
  offset = 0,
  limit = 24,
): Promise<DataAccessResult<{ rows: ProgressPhotoSignedRow[]; nextOffset: number | null }>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 60) : 24;
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("photo_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .range(safeOffset, safeOffset + safeLimit - 1);
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load paginated progress photos.",
      cause: error.message,
    });
  }
  const rows = asRows<ProgressPhotoRow>(data);
  const signed = await signProgressPhotoRows(auth.data.supabase, rows);
  if (signed.error) {
    return signed;
  }
  return ok({
    rows: signed.data,
    nextOffset: rows.length < safeLimit ? null : safeOffset + rows.length,
  });
}

export async function getMyProgressPhotoDates(limit = 200): Promise<DataAccessResult<string[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;
  const { data, error } = await supabase
    .from("progress_photos")
    .select("photo_date")
    .eq("user_id", auth.data.user.id)
    .order("photo_date", { ascending: false })
    .limit(safeLimit);
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load progress photo dates.",
      cause: error.message,
    });
  }
  const rows = asRows<{ photo_date: string }>(data);
  return ok([...new Set(rows.map((row) => row.photo_date))]);
}

export async function getMyProgressPhotosForDates(
  dates: string[],
): Promise<DataAccessResult<ProgressPhotoSignedRow[]>> {
  const normalizedDates = [...new Set(dates.filter((date) => isValidDateString(date)))];
  if (!normalizedDates.length) {
    return ok([]);
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .in("photo_date", normalizedDates)
    .order("photo_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load progress photo comparison rows.",
      cause: error.message,
    });
  }
  const signed = await signProgressPhotoRows(auth.data.supabase, asRows<ProgressPhotoRow>(data));
  if (signed.error) {
    return signed;
  }
  return ok(signed.data);
}

export async function createMyProgressPhotoMetadata(
  input: CreateProgressPhotoMetadataInput,
): Promise<DataAccessResult<ProgressPhotoRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("progress_photos")
    .insert({
      user_id: auth.data.user.id,
      photo_date: input.photo_date,
      view: input.view,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      byte_size: input.byte_size,
      original_filename: input.original_filename,
      weight: input.weight ?? null,
      weight_unit: input.weight_unit ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create progress photo metadata.",
      cause: error.message,
    });
  }
  return ok(asRow<ProgressPhotoRow>(data)!);
}

export async function deleteMyProgressPhoto(photoId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!photoId) {
    return fail({ code: "INVALID_INPUT", message: "Photo id is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const existing = await supabase
    .from("progress_photos")
    .select("id,storage_path")
    .eq("id", photoId)
    .eq("user_id", auth.data.user.id)
    .maybeSingle();
  if (existing.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load progress photo before deletion.",
      cause: existing.error.message,
    });
  }
  const existingRow = asRow<{ id: string; storage_path: string }>(existing.data);
  if (!existingRow) {
    return fail({ code: "NOT_FOUND", message: "Progress photo not found." });
  }

  const storageDelete = await auth.data.supabase.storage.from("progress-photos").remove([existingRow.storage_path]);
  if (storageDelete.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete progress photo file from storage.",
      cause: storageDelete.error.message,
    });
  }

  const { data, error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete progress photo.",
      cause: error.message,
    });
  }
  const row = asRow<{ id: string }>(data);
  if (!row) {
    return fail({ code: "NOT_FOUND", message: "Progress photo not found." });
  }
  return ok(row);
}

async function signProgressPhotoRows(
  supabase: AuthenticatedContext["supabase"],
  rows: ProgressPhotoRow[],
): Promise<DataAccessResult<ProgressPhotoSignedRow[]>> {
  if (!rows.length) {
    return ok([]);
  }
  const paths = rows.map((row) => row.storage_path);
  const signed = await supabase.storage.from("progress-photos").createSignedUrls(paths, 900);
  if (signed.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create signed photo URLs.",
      cause: signed.error.message,
    });
  }
  const signedUrlByPath = new Map<string, string | null>();
  for (const row of signed.data ?? []) {
    if (row.path) {
      signedUrlByPath.set(row.path, row.signedUrl ?? null);
    }
  }

  return ok(
    rows.map((row) => ({
      ...row,
      signed_url: signedUrlByPath.get(row.storage_path) ?? null,
    })),
  );
}
