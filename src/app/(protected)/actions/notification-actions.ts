"use server";

import { revalidatePath } from "next/cache";

import {
  createMyNotification,
  markMyNotificationRead,
  updateMyNotificationPreferences,
  type NotificationType,
} from "@/lib/data/notifications";

function revalidateNotificationViews() {
  revalidatePath("/");
  revalidatePath("/profile");
}

export async function createReminderNotificationAction(input: {
  type: NotificationType;
  title: string;
  body: string;
  scheduledFor?: string;
}): Promise<{ status: "success" | "error"; message: string }> {
  const created = await createMyNotification({
    type: input.type,
    title: input.title,
    body: input.body,
    scheduled_for: input.scheduledFor ?? null,
    metadata: { source: "manual" },
  });
  if (created.error) {
    return {
      status: "error",
      message: created.error.message,
    };
  }
  revalidateNotificationViews();
  return {
    status: "success",
    message: "Notification saved.",
  };
}

export async function markNotificationReadAction(notificationId: string): Promise<{ status: "success" | "error"; message: string }> {
  const result = await markMyNotificationRead(notificationId);
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidateNotificationViews();
  return {
    status: "success",
    message: "Notification marked as read.",
  };
}

export async function updateNotificationPreferencesAction(input: {
  workoutReminderEnabled: boolean;
  proteinReminderEnabled: boolean;
  weightReminderEnabled: boolean;
  photoReminderEnabled: boolean;
  newPrEnabled: boolean;
  workoutStreakEnabled: boolean;
}): Promise<{ status: "success" | "error"; message: string }> {
  const result = await updateMyNotificationPreferences({
    workout_reminder_enabled: input.workoutReminderEnabled,
    protein_reminder_enabled: input.proteinReminderEnabled,
    weight_reminder_enabled: input.weightReminderEnabled,
    photo_reminder_enabled: input.photoReminderEnabled,
    new_pr_enabled: input.newPrEnabled,
    workout_streak_enabled: input.workoutStreakEnabled,
  });
  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
    };
  }
  revalidateNotificationViews();
  return {
    status: "success",
    message: "Notification preferences updated.",
  };
}
