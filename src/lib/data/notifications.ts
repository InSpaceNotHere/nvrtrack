import { getAuthenticatedContext } from "./auth-context";
import { fail, ok, type DataAccessResult } from "./result";
import { asLooseSupabaseClient } from "./untyped-supabase";

export type NotificationType =
  | "workout_reminder"
  | "protein_reminder"
  | "weight_reminder"
  | "photo_reminder"
  | "new_pr"
  | "workout_streak";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduled_for: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesRow {
  user_id: string;
  workout_reminder_enabled: boolean;
  protein_reminder_enabled: boolean;
  weight_reminder_enabled: boolean;
  photo_reminder_enabled: boolean;
  new_pr_enabled: boolean;
  workout_streak_enabled: boolean;
  created_at: string;
  updated_at: string;
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

const DEFAULT_NOTIFICATION_PREFERENCES = {
  workout_reminder_enabled: true,
  protein_reminder_enabled: true,
  weight_reminder_enabled: true,
  photo_reminder_enabled: true,
  new_pr_enabled: true,
  workout_streak_enabled: true,
};

export async function getMyNotificationPreferences(): Promise<DataAccessResult<NotificationPreferencesRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load notification preferences.",
      cause: error.message,
    });
  }
  let row = asRow<NotificationPreferencesRow>(data);
  if (!row) {
    const created = await supabase
      .from("notification_preferences")
      .insert({
        user_id: auth.data.user.id,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      })
      .select("*")
      .single();
    if (created.error) {
      return fail({
        code: "DB_ERROR",
        message: "Failed to create notification preferences.",
        cause: created.error.message,
      });
    }
    row = asRow<NotificationPreferencesRow>(created.data);
  }
  return ok(row!);
}

export async function updateMyNotificationPreferences(
  input: Partial<Omit<NotificationPreferencesRow, "user_id" | "created_at" | "updated_at">>,
): Promise<DataAccessResult<NotificationPreferencesRow>> {
  const current = await getMyNotificationPreferences();
  if (current.error) {
    return current;
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("notification_preferences")
    .update(input)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to update notification preferences.",
      cause: error.message,
    });
  }
  const row = asRow<NotificationPreferencesRow>(data);
  if (!row) {
    return fail({
      code: "NOT_FOUND",
      message: "Notification preferences not found.",
    });
  }
  return ok(row);
}

export async function getMyNotifications(limit = 40): Promise<DataAccessResult<NotificationRow[]>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 40;
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to load notifications.",
      cause: error.message,
    });
  }
  return ok(asRows<NotificationRow>(data));
}

export async function createMyNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  scheduled_for?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<DataAccessResult<NotificationRow>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const preferences = await getMyNotificationPreferences();
  if (preferences.error) {
    return preferences;
  }
  const prefKey = `${input.type}_enabled` as keyof Omit<NotificationPreferencesRow, "user_id" | "created_at" | "updated_at">;
  if (prefKey in preferences.data && preferences.data[prefKey] === false) {
    return fail({
      code: "INVALID_INPUT",
      message: "Notification type is disabled in preferences.",
    });
  }

  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: auth.data.user.id,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      scheduled_for: input.scheduled_for ?? null,
      metadata: input.metadata ?? {},
      is_read: false,
      read_at: null,
    })
    .select("*")
    .single();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to create notification.",
      cause: error.message,
    });
  }
  return ok(asRow<NotificationRow>(data)!);
}

export async function markMyNotificationRead(notificationId: string): Promise<DataAccessResult<NotificationRow>> {
  if (!notificationId) {
    return fail({ code: "INVALID_INPUT", message: "Notification id is required." });
  }
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }
  const supabase = asLooseSupabaseClient(auth.data.supabase);
  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", auth.data.user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    return fail({
      code: "DB_ERROR",
      message: "Failed to mark notification as read.",
      cause: error.message,
    });
  }
  const row = asRow<NotificationRow>(data);
  if (!row) {
    return fail({ code: "NOT_FOUND", message: "Notification not found." });
  }
  return ok(row);
}
