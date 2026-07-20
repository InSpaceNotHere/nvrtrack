import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ExerciseRow as TrainingExerciseRow,
  WorkoutExerciseRow as TrainingWorkoutExerciseRow,
  WorkoutRow as TrainingWorkoutRow,
  WorkoutSetRow as TrainingWorkoutSetRow,
} from "@/lib/training/types";
import type { Database } from "@/types/database";

import { fail, ok, type DataAccessResult } from "./result";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export interface AuthenticatedContext {
  supabase: ServerSupabaseClient;
  user: User;
}

export async function getAuthenticatedContext(): Promise<DataAccessResult<AuthenticatedContext>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return fail({
      code: "NOT_CONFIGURED",
      message: "Supabase environment variables are not configured.",
    });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return fail({
      code: "UNAUTHENTICATED",
      message: "An authenticated user is required.",
      cause: error?.message,
    });
  }

  return ok({ supabase, user });
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type FoodCatalogRow = Database["public"]["Tables"]["food_catalog"]["Row"];
export type FoodRow = Database["public"]["Tables"]["foods"]["Row"];
export type FoodEntryRow = Database["public"]["Tables"]["food_entries"]["Row"];
export type WeightEntryRow = Database["public"]["Tables"]["weight_entries"]["Row"];
export type ExerciseRow = TrainingExerciseRow;
export type WorkoutRow = TrainingWorkoutRow;
export type WorkoutExerciseRow = TrainingWorkoutExerciseRow;
export type WorkoutSetRow = TrainingWorkoutSetRow;
