import type { Database } from "@/types/database";
import { ONBOARDING_REQUIRED_VERSION } from "@/lib/onboarding/constants";

import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { asLooseSupabaseClient } from "./untyped-supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface OnboardingProfileSnapshot {
  id: string;
  display_name: string | null;
  height_inches: number | null;
  primary_goal: string | null;
  training_experience: string | null;
  desired_training_days: number | null;
  desired_training_days_state: string;
  training_environment: string | null;
  discovery_source: string | null;
  onboarding_version_completed: number | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingDraftUpdateInput {
  primary_goal?: string | null;
  training_experience?: string | null;
  desired_training_days?: number | null;
  desired_training_days_state?: string;
  training_environment?: string | null;
  discovery_source?: string | null;
  height_inches?: number | null;
  onboarding_version_completed?: number | null;
  onboarding_completed_at?: string | null;
}

interface ExistingAccountDataProbe {
  hasExistingData: boolean;
}

const ONBOARDING_PROFILE_SELECT = [
  "id",
  "display_name",
  "height_inches",
  "primary_goal",
  "training_experience",
  "desired_training_days",
  "desired_training_days_state",
  "training_environment",
  "discovery_source",
  "onboarding_version_completed",
  "onboarding_completed_at",
  "created_at",
  "updated_at",
].join(",");

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find the") && normalized.includes("column")) ||
    normalized.includes("schema cache")
  );
}

function mapProfileToOnboardingSnapshot(profile: ProfileRow): OnboardingProfileSnapshot {
  const source = profile as ProfileRow & {
    primary_goal?: string | null;
    training_experience?: string | null;
    desired_training_days?: number | null;
    desired_training_days_state?: string | null;
    training_environment?: string | null;
    discovery_source?: string | null;
    onboarding_version_completed?: number | null;
    onboarding_completed_at?: string | null;
  };

  return {
    id: profile.id,
    display_name: profile.display_name,
    height_inches: profile.height_inches,
    primary_goal: source.primary_goal ?? null,
    training_experience: source.training_experience ?? null,
    desired_training_days: source.desired_training_days ?? null,
    desired_training_days_state: source.desired_training_days_state ?? "unspecified",
    training_environment: source.training_environment ?? null,
    discovery_source: source.discovery_source ?? null,
    onboarding_version_completed: source.onboarding_version_completed ?? null,
    onboarding_completed_at: source.onboarding_completed_at ?? null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

export async function getMyOnboardingProfileSnapshot(): Promise<DataAccessResult<OnboardingProfileSnapshot>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const result = await supabase.from("profiles").select(ONBOARDING_PROFILE_SELECT).eq("id", user.id).maybeSingle();

  if (result.error) {
    if (isMissingColumnError(result.error.message)) {
      const legacyResult = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (legacyResult.error || !legacyResult.data) {
        return fail({
          code: "DB_ERROR",
          message: legacyResult.error?.message ?? "Failed to load onboarding profile data.",
        });
      }
      return ok(mapProfileToOnboardingSnapshot(legacyResult.data));
    }
    return fail({
      code: "DB_ERROR",
      message: "Failed to load onboarding profile data.",
      cause: result.error.message,
    });
  }

  if (!result.data) {
    return fail({
      code: "NOT_FOUND",
      message: "Profile was not found for the current user.",
    });
  }

  return ok(mapProfileToOnboardingSnapshot(result.data as unknown as ProfileRow));
}

export async function saveMyOnboardingDraft(
  input: OnboardingDraftUpdateInput,
): Promise<DataAccessResult<OnboardingProfileSnapshot>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const { supabase, user } = auth.data;
  const payload: ProfileUpdate = {};
  if (input.primary_goal !== undefined) payload.primary_goal = input.primary_goal;
  if (input.training_experience !== undefined) payload.training_experience = input.training_experience;
  if (input.desired_training_days !== undefined) payload.desired_training_days = input.desired_training_days;
  if (input.desired_training_days_state !== undefined) payload.desired_training_days_state = input.desired_training_days_state;
  if (input.training_environment !== undefined) payload.training_environment = input.training_environment;
  if (input.discovery_source !== undefined) payload.discovery_source = input.discovery_source;
  if (input.height_inches !== undefined) payload.height_inches = input.height_inches;
  if (input.onboarding_version_completed !== undefined) payload.onboarding_version_completed = input.onboarding_version_completed;
  if (input.onboarding_completed_at !== undefined) payload.onboarding_completed_at = input.onboarding_completed_at;

  const response = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...payload,
      },
      { onConflict: "id" },
    )
    .select(ONBOARDING_PROFILE_SELECT)
    .single();

  if (response.error) {
    return fail({
      code: "DB_ERROR",
      message: "Unable to save onboarding answers right now.",
      cause: response.error.message,
    });
  }

  return ok(mapProfileToOnboardingSnapshot(response.data as unknown as ProfileRow));
}

export async function markMyOnboardingCompleted(version = ONBOARDING_REQUIRED_VERSION): Promise<DataAccessResult<OnboardingProfileSnapshot>> {
  return saveMyOnboardingDraft({
    onboarding_version_completed: version,
    onboarding_completed_at: new Date().toISOString(),
  });
}

async function hasAnyRowsByUserId(tableName: string, userIdColumn: string): Promise<DataAccessResult<boolean>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const { supabase, user } = auth.data;
  const looseSupabase = asLooseSupabaseClient(supabase);
  const query = await looseSupabase.from(tableName).select("id").eq(userIdColumn, user.id).limit(1);
  if (query.error) {
    return fail({
      code: "DB_ERROR",
      message: `Unable to inspect ${tableName}.`,
      cause: query.error.message,
    });
  }
  const rows = Array.isArray(query.data) ? query.data : [];
  return ok(rows.length > 0);
}

export async function getMyExistingAccountDataProbe(): Promise<DataAccessResult<ExistingAccountDataProbe>> {
  const snapshotResult = await getMyOnboardingProfileSnapshot();
  if (snapshotResult.error) {
    return snapshotResult;
  }

  const snapshot = snapshotResult.data;
  if (
    snapshot.height_inches !== null ||
    snapshot.display_name !== null ||
    snapshot.primary_goal !== null ||
    snapshot.training_experience !== null ||
    snapshot.training_environment !== null ||
    snapshot.discovery_source !== null ||
    snapshot.desired_training_days !== null ||
    snapshot.desired_training_days_state !== "unspecified"
  ) {
    return ok({ hasExistingData: true });
  }

  const tableChecks = await Promise.all([
    hasAnyRowsByUserId("workouts", "user_id"),
    hasAnyRowsByUserId("workout_templates", "user_id"),
    hasAnyRowsByUserId("food_entries", "user_id"),
    hasAnyRowsByUserId("weight_entries", "user_id"),
    hasAnyRowsByUserId("progress_photos", "user_id"),
    hasAnyRowsByUserId("body_measurement_entries", "user_id"),
    hasAnyRowsByUserId("weekly_journal_entries", "user_id"),
  ]);

  const failed = tableChecks.find((result) => result.error);
  if (failed?.error) {
    return failed as DataAccessResult<ExistingAccountDataProbe>;
  }

  return ok({
    hasExistingData: tableChecks.some((result) => !result.error && result.data),
  });
}

