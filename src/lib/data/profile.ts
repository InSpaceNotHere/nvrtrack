import type { Database } from "@/types/database";

import { getAuthenticatedContext, type ProfileRow } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";

export interface UpdateMyProfileInput {
  display_name?: string | null;
  height_inches?: number | null;
  calorie_goal?: number | null;
  protein_goal?: number | null;
  carbohydrate_goal?: number | null;
  fat_goal?: number | null;
  preferred_weight_unit?: "lb" | "kg";
}

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function getMyProfile(): Promise<DataAccessResult<ProfileRow | null>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load profile.",
      cause: error.message,
    });
  }

  return ok(data);
}

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<DataAccessResult<ProfileRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;

  const payload: ProfileUpdate = {
    display_name: input.display_name,
    height_inches: input.height_inches,
    calorie_goal: input.calorie_goal,
    protein_goal: input.protein_goal,
    carbohydrate_goal: input.carbohydrate_goal,
    fat_goal: input.fat_goal,
    preferred_weight_unit: input.preferred_weight_unit,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...payload,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update profile.",
      cause: error.message,
    });
  }

  return ok(data);
}
