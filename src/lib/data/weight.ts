import type { Database } from "@/types/database";

import { getAuthenticatedContext, type WeightEntryRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";

type WeightInsert = Database["public"]["Tables"]["weight_entries"]["Insert"];
type WeightUpdate = Database["public"]["Tables"]["weight_entries"]["Update"];

export interface CreateWeightEntryInput {
  weight: number;
  unit?: "lb" | "kg";
  entry_date: string;
  note?: string | null;
}

export interface UpdateWeightEntryInput {
  weight?: number;
  unit?: "lb" | "kg";
  entry_date?: string;
  note?: string | null;
}

export async function getWeightEntryByDate(entryDate: string): Promise<DataAccessResult<WeightEntryRow | null>> {
  if (!entryDate) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry date is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weight entry by date.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getWeightEntries(): Promise<DataAccessResult<WeightEntryRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load weight entries.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function getLatestWeightEntry(): Promise<DataAccessResult<WeightEntryRow | null>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load latest weight entry.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function createWeightEntry(input: CreateWeightEntryInput): Promise<DataAccessResult<WeightEntryRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const payload: WeightInsert = {
    user_id: user.id,
    weight: input.weight,
    unit: input.unit,
    entry_date: input.entry_date,
    note: input.note,
  };

  const { data, error } = await supabase.from("weight_entries").insert(payload).select("*").single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create weight entry.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function updateWeightEntry(
  entryId: string,
  input: UpdateWeightEntryInput,
): Promise<DataAccessResult<WeightEntryRow>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const payload: WeightUpdate = {
    weight: input.weight,
    unit: input.unit,
    entry_date: input.entry_date,
    note: input.note,
  };

  const { data, error } = await supabase
    .from("weight_entries")
    .update(payload)
    .eq("id", entryId)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update weight entry.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Weight entry not found.",
    });
  }

  return ok(data);
}

export async function deleteWeightEntry(entryId: string): Promise<DataAccessResult<{ id: string }>> {
  if (!entryId) {
    return fail({
      code: "INVALID_INPUT",
      message: "Entry id is required.",
    });
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to delete weight entry.",
      cause: error.message,
    });
  }

  if (!data) {
    return fail({
      code: "NOT_FOUND",
      message: "Weight entry not found.",
    });
  }

  return ok({ id: data.id });
}
