import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { asLooseSupabaseClient } from "./untyped-supabase";

export interface WeeklyJournalEntryRow {
  id: string;
  user_id: string;
  week_start: string;
  notes: string | null;
  mood: string | null;
  recovery: number | null;
  energy: number | null;
  sleep_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertWeeklyJournalInput {
  week_start: string;
  notes?: string | null;
  mood?: string | null;
  recovery?: number | null;
  energy?: number | null;
  sleep_hours?: number | null;
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

export async function getMyWeeklyJournalEntries(): Promise<DataAccessResult<WeeklyJournalEntryRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("weekly_journal_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("week_start", { ascending: false });
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weekly journal entries.",
      cause: error.message,
    });
  }
  return ok(asRows<WeeklyJournalEntryRow>(data));
}

export async function upsertMyWeeklyJournalEntry(
  input: UpsertWeeklyJournalInput,
): Promise<DataAccessResult<WeeklyJournalEntryRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const existing = await supabase
    .from("weekly_journal_entries")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("week_start", input.week_start)
    .maybeSingle();
  if (existing.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weekly journal entry.",
      cause: existing.error.message,
    });
  }
  const payload = {
    notes: input.notes?.trim() || null,
    mood: input.mood?.trim() || null,
    recovery: input.recovery ?? null,
    energy: input.energy ?? null,
    sleep_hours: input.sleep_hours ?? null,
  };
  if (existing.data) {
    const updated = await supabase
      .from("weekly_journal_entries")
      .update(payload)
      .eq("id", (existing.data as WeeklyJournalEntryRow).id)
      .eq("user_id", auth.data.user.id)
      .select("*")
      .maybeSingle();
    if (updated.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to update weekly journal entry.",
        cause: updated.error.message,
      });
    }
    return ok(asRow<WeeklyJournalEntryRow>(updated.data)!);
  }

  const created = await supabase
    .from("weekly_journal_entries")
    .insert({
      user_id: auth.data.user.id,
      week_start: input.week_start,
      ...payload,
    })
    .select("*")
    .single();
  if (created.error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create weekly journal entry.",
      cause: created.error.message,
    });
  }
  return ok(asRow<WeeklyJournalEntryRow>(created.data)!);
}
