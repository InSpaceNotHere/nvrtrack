"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createReminderNotificationAction,
  markNotificationReadAction,
  updateNotificationPreferencesAction,
} from "@/app/(protected)/actions/notification-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationPreferencesRow, NotificationRow, NotificationType } from "@/lib/data/notifications";

interface NotificationCenterProps {
  preferences: NotificationPreferencesRow;
  notifications: NotificationRow[];
}

const NOTIFICATION_TYPES: Array<{ type: NotificationType; label: string }> = [
  { type: "workout_reminder", label: "Workout reminder" },
  { type: "protein_reminder", label: "Protein reminder" },
  { type: "weight_reminder", label: "Weight reminder" },
  { type: "photo_reminder", label: "Photo reminder" },
  { type: "new_pr", label: "New PR" },
  { type: "workout_streak", label: "Workout streak" },
];

function formatDateTime(dateTime: string | null): string {
  if (!dateTime) {
    return "Not scheduled";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateTime));
}

function nowInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function NotificationCenter({ preferences, notifications }: NotificationCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<NotificationType>("workout_reminder");
  const [title, setTitle] = useState("Reminder");
  const [body, setBody] = useState("Don't forget your planned check-in.");
  const [scheduledFor, setScheduledFor] = useState(nowInputValue());
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [toggles, setToggles] = useState({
    workoutReminderEnabled: preferences.workout_reminder_enabled,
    proteinReminderEnabled: preferences.protein_reminder_enabled,
    weightReminderEnabled: preferences.weight_reminder_enabled,
    photoReminderEnabled: preferences.photo_reminder_enabled,
    newPrEnabled: preferences.new_pr_enabled,
    workoutStreakEnabled: preferences.workout_streak_enabled,
  });

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function savePreferences() {
    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(toggles);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function createReminder() {
    startTransition(async () => {
      const result = await createReminderNotificationAction({
        type: selectedType,
        title,
        body,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function markRead(notificationId: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-medium text-zinc-100">Notification Preferences</h3>
        <p className="text-xs text-zinc-500">Choose which in-app reminders and streak notifications you want to track.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {NOTIFICATION_TYPES.map((type) => {
            const keyMap: Record<NotificationType, keyof typeof toggles> = {
              workout_reminder: "workoutReminderEnabled",
              protein_reminder: "proteinReminderEnabled",
              weight_reminder: "weightReminderEnabled",
              photo_reminder: "photoReminderEnabled",
              new_pr: "newPrEnabled",
              workout_streak: "workoutStreakEnabled",
            };
            const toggleKey = keyMap[type.type];
            return (
              <label key={type.type} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs text-zinc-300">
                <span>{type.label}</span>
                <input
                  type="checkbox"
                  checked={toggles[toggleKey]}
                  onChange={(event) => setToggles((state) => ({ ...state, [toggleKey]: event.target.checked }))}
                />
              </label>
            );
          })}
        </div>
        <Button type="button" onClick={savePreferences} disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
          {isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </section>

      <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-medium text-zinc-100">Create In-App Reminder</h3>
        <p className="text-xs text-zinc-500">Reminders are stored in your in-app notification inbox for now.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Type</span>
            <Select value={selectedType} onChange={(event) => setSelectedType(event.target.value as NotificationType)} className="app-input h-9 text-sm">
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.type} value={type.type}>
                  {type.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Scheduled for</span>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="app-input h-9 text-sm"
            />
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} className="app-input h-9 text-sm" maxLength={160} />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Body</span>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            className="text-sm"
            maxLength={4000}
          />
        </label>
        <Button type="button" onClick={createReminder} disabled={isPending} variant="secondary" size="sm" className="h-9 rounded-lg px-3 text-xs">
          {isPending ? "Saving..." : "Save Reminder"}
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-300">Stored Notifications</h3>
        {notifications.length ? (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li key={notification.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {notification.type.replaceAll("_", " ")} • {formatDateTime(notification.scheduled_for)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-300">{notification.body}</p>
                  </div>
                  {!notification.is_read ? (
                    <Button type="button" onClick={() => markRead(notification.id)} variant="secondary" size="sm" className="h-7 rounded-md px-2 py-1 text-[11px]">
                      Mark Read
                    </Button>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Read</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No notifications yet.</p>
        )}
      </section>

      {message ? <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"}>{message}</Toast> : null}
    </div>
  );
}
