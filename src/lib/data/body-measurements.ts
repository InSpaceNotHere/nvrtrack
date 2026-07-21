import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";

export interface BodyMeasurementEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  measurements: Record<string, number>;
  custom_measurements: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertBodyMeasurementEntryInput {
  entry_date: string;
  measurements: Record<string, number>;
  custom_measurements: Record<string, number>;
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

export async function getMyBodyMeasurementEntries(): Promise<DataAccessResult<BodyMeasurementEntryRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("body_measurement_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load body measurements.",
      cause: error.message,
    });
  }
  return ok(asRows<BodyMeasurementEntryRow>(data));
}

export async function upsertMyBodyMeasurementEntry(
  input: UpsertBodyMeasurementEntryInput,
): Promise<DataAccessResult<BodyMeasurementEntryRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const existing = await supabase
    .from("body_measurement_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("entry_date", input.entry_date)
    .maybeSingle();
  if (existing.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load body measurement entry.",
      cause: existing.error.message,
    });
  }
  const payload = {
    measurements: input.measurements,
    custom_measurements: input.custom_measurements,
    notes: input.notes?.trim() || null,
  };
  if (existing.data) {
    const updated = await supabase
      .from("body_measurement_entries")
      .update(payload)
      .eq("id", (existing.data as BodyMeasurementEntryRow).id)
      .eq("user_id", auth.data.user.id)
      .select("*")
      .maybeSingle();
    if (updated.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to update body measurement entry.",
        cause: updated.error.message,
      });
    }
    return ok(asRow<BodyMeasurementEntryRow>(updated.data)!);
  }

  const created = await supabase
    .from("body_measurement_entries")
    .insert({
      user_id: auth.data.user.id,
      entry_date: input.entry_date,
      ...payload,
    })
    .select("*")
    .single();
  if (created.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create body measurement entry.",
      cause: created.error.message,
    });
  }
  return ok(asRow<BodyMeasurementEntryRow>(created.data)!);
}

export async function deleteMyBodyMeasurementEntry(entryId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!entryId) {
    return fail({ code: "INVALID_INPUT", message: "Body measurement entry id is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = auth.data.supabase;
  const { data, error } = await supabase
    .from("body_measurement_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", auth.data.user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete body measurement entry.",
      cause: error.message,
    });
  }
  const row = asRow<{ id: string }>(data);
  if (!row) {
    return fail({ code: "NOT_FOUND", message: "Body measurement entry not found." });
  }
  return ok(row);
}
