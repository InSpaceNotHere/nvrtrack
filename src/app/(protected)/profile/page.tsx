import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationCenter } from "@/components/profile/notification-center";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getMyNotificationPreferences, getMyNotifications } from "@/lib/data/notifications";
import { getMyProfile } from "@/lib/data/profile";
import { profileToFormValues } from "@/lib/profile/validation";

interface ProfilePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const view = Array.isArray(resolvedSearchParams.view) ? resolvedSearchParams.view[0] : resolvedSearchParams.view;
  const [profileResult, notificationsResult, preferencesResult] = await Promise.all([
    getMyProfile(),
    getMyNotifications(),
    getMyNotificationPreferences(),
  ]);
  const formValues = profileToFormValues(profileResult.data);

  return (
    <div className="space-y-2.5">
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
      {view === "edit" ? (
        <>
          <Card variant="tertiary">
            <Link
              href="/profile"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Profile
            </Link>
          </Card>
          <ProfileSettingsForm initialValues={formValues} />
        </>
      ) : view === "notifications" ? (
        <>
          <Card variant="tertiary">
            <Link
              href="/profile"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Profile
            </Link>
          </Card>
          {preferencesResult.data ? (
            <NotificationCenter preferences={preferencesResult.data} notifications={notificationsResult.data ?? []} />
          ) : (
            <Card variant="tertiary">
              <p className="text-sm text-zinc-400">Notification preferences are unavailable.</p>
            </Card>
          )}
        </>
      ) : view === "account" ? (
        <Card title="Account" variant="tertiary">
          <div className="mb-3">
            <Link
              href="/profile"
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
            >
              Back to Profile
            </Link>
          </div>
          <LogoutButton />
        </Card>
      ) : (
        <>
          <Card title="Profile Summary" variant="secondary">
            <div className="grid gap-1.5">
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Profile</p>
                <p className="text-sm font-semibold text-zinc-100">{profileResult.data?.display_name?.trim() || "NVRTRACK User"}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-zinc-300">
                Calories {profileResult.data?.calorie_goal?.toFixed(0) ?? "--"} • Protein {profileResult.data?.protein_goal?.toFixed(0) ?? "--"}g
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-zinc-300">
                Unit {formValues.preferredWeightUnit.toUpperCase()} • TZ {formValues.timezone || "UTC"}
              </div>
            </div>
          </Card>
          <Card title="Actions" variant="tertiary">
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/profile?view=edit"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
              >
                Edit
              </Link>
              <Link
                href="/profile?view=notifications"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
              >
                Notify
              </Link>
              <Link
                href="/profile?view=account"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
              >
                Account
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
