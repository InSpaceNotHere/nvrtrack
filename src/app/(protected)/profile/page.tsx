import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationCenter } from "@/components/profile/notification-center";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import { getMyNotificationPreferences, getMyNotifications } from "@/lib/data/notifications";
import { getMyProfile } from "@/lib/data/profile";
import { formatHeightFeetInches, profileToFormValues } from "@/lib/profile/validation";

type ProfileView = "overview" | "edit" | "notifications";

function asSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toView(value: string | undefined): ProfileView {
  if (value === "edit") return "edit";
  if (value === "notifications") return "notifications";
  return "overview";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const view = toView(asSingleParam(resolvedSearchParams.view));
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
      {view === "overview" ? (
        <section className="mx-auto w-full max-w-xl space-y-2.5">
          <Card title="Profile Summary" variant="primary">
            <div className="space-y-2">
              <div>
                <p className="text-base font-semibold text-zinc-100">{formValues.displayName || "No display name set"}</p>
                <p className="text-xs text-zinc-500">Account profile and settings overview</p>
              </div>
              {!formValues.displayName || !formValues.heightInches || !formValues.calorieGoal || !formValues.proteinGoal ? (
                <div className="rounded-md border border-dashed border-white/15 bg-black/20 px-2 py-1.5">
                  <StateChip state="missing" label="Profile is incomplete" className="text-[10px]" />
                  <p className="mt-1 text-xs text-zinc-300">Complete your core fields for better personalized tracking.</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Height</p>
                  <p className="text-sm font-semibold text-zinc-100">
                    {formValues.heightInches ? formatHeightFeetInches(Number(formValues.heightInches)) ?? `${formValues.heightInches} in` : "--"}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Weight Unit</p>
                  <p className="text-sm font-semibold text-zinc-100">{formValues.preferredWeightUnit.toUpperCase()}</p>
                </div>
                <div className="col-span-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Timezone</p>
                  <p className="text-sm font-semibold text-zinc-100">{formValues.timezone || "UTC"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Goals" variant="secondary">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] text-zinc-500">Calories</p>
                <p className="text-sm font-semibold text-zinc-100">{formValues.calorieGoal || "--"} kcal</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] text-zinc-500">Protein</p>
                <p className="text-sm font-semibold text-zinc-100">{formValues.proteinGoal || "--"} g</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] text-zinc-500">Carbs</p>
                <p className="text-sm font-semibold text-zinc-100">{formValues.carbohydrateGoal || "--"} g</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <p className="text-[10px] text-zinc-500">Fat</p>
                <p className="text-sm font-semibold text-zinc-100">{formValues.fatGoal || "--"} g</p>
              </div>
            </div>
          </Card>

          <Card title="Actions" variant="tertiary">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/profile?view=edit"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/12 bg-black/20 px-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
              >
                Edit Profile
              </Link>
              <Link
                href="/profile?view=notifications"
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/12 bg-black/20 px-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
              >
                Notifications
              </Link>
            </div>
          </Card>

          <Card title="Account" variant="tertiary">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Session and account actions</p>
              <LogoutButton />
            </div>
          </Card>
        </section>
      ) : null}

      {view === "edit" ? <ProfileSettingsForm initialValues={formValues} /> : null}

      {view === "notifications" && preferencesResult.data ? (
        <section className="mx-auto w-full max-w-xl space-y-2.5">
          <Card title="App Notifications" variant="secondary">
            <p className="text-xs text-zinc-500">Optional reminder settings and inbox.</p>
            <div className="mt-2">
              <NotificationCenter preferences={preferencesResult.data} notifications={notificationsResult.data ?? []} />
            </div>
          </Card>
          <Link
            href="/profile"
            className="inline-flex h-8 items-center justify-center rounded-md border border-white/12 bg-black/20 px-3 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
          >
            Back to Profile
          </Link>
        </section>
      ) : null}
    </div>
  );
}
