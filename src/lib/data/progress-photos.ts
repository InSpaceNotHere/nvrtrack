import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { asLooseSupabaseClient } from "./untyped-supabase";

export type ProgressPhotoView = "front" | "side" | "back";

export interface ProgressPhotoRow {
  id: string;
  user_id: string;
  photo_date: string;
  view: ProgressPhotoView;
  image_data_url: string;
  weight: number | null;
  weight_unit: "lb" | "kg" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProgressPhotoInput {
  photo_date: string;
  view: ProgressPhotoView;
  image_data_url: string;
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
  const supabase = asLooseSupabaseClient(auth.data.supabase);
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

export async function createMyProgressPhoto(input: CreateProgressPhotoInput): Promise<DataAccessResult<ProgressPhotoRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("progress_photos")
    .insert({
      user_id: auth.data.user.id,
      photo_date: input.photo_date,
      view: input.view,
      image_data_url: input.image_data_url,
      weight: input.weight ?? null,
      weight_unit: input.weight_unit ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create progress photo.",
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
  const supabase = asLooseSupabaseClient(auth.data.supabase);
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
