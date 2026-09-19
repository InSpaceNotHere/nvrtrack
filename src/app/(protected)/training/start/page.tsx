import Link from "next/link";

import { StartWorkoutForm } from "@/components/training/start-workout-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getTodayDateString } from "@/lib/nutrition/date";
import { getMyProfile } from "@/lib/data/profile";
import { normalizeTimeZone } from "@/lib/timezone";

export default async function StartWorkoutPage() {
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  return (
    <div className="space-y-4">
      <PageHeader title="Start Workout" subtitle="Create a live workout and begin logging sets." />

      <div>
        <Link
          href="/training"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          Back to Training
        </Link>
      </div>

      <Card title="Workout Setup" subtitle="Name, date, and optional notes">
        <StartWorkoutForm initialName="Workout" initialDate={todayDate} />
      </Card>
    </div>
  );
}
