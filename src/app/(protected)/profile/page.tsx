import { NotificationCenter } from "@/components/profile/notification-center";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { getMyNotificationPreferences, getMyNotifications } from "@/lib/data/notifications";
import { getMyProfile } from "@/lib/data/profile";
import { profileToFormValues } from "@/lib/profile/validation";

export default async function ProfilePage() {
  const [profileResult, notificationsResult, preferencesResult] = await Promise.all([
    getMyProfile(),
    getMyNotifications(),
    getMyNotificationPreferences(),
  ]);
  const formValues = profileToFormValues(profileResult.data);

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" />
      {profileResult.error ? (
        <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {profileResult.error.message}
        </p>
      ) : null}
      {notificationsResult.error || preferencesResult.error ? (
        <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {notificationsResult.error?.message ?? preferencesResult.error?.message}
        </p>
      ) : null}
      <ProfileSettingsForm initialValues={formValues} />
      {preferencesResult.data ? (
        <details className="rounded-xl border border-white/10 bg-black/15 p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">
            App Notifications
          </summary>
          <p className="mt-1 text-xs text-zinc-500">Optional reminder settings and inbox.</p>
          <div className="mt-2">
            <NotificationCenter preferences={preferencesResult.data} notifications={notificationsResult.data ?? []} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
