import { NutritionTodayView } from "@/components/nutrition/nutrition-today-view";
import { getMyFoodEntriesForDate } from "@/lib/data/nutrition";
import { getMyProfile } from "@/lib/data/profile";
import { getTodayDateString, normalizeDateParam } from "@/lib/nutrition/date";
import { normalizeTimeZone } from "@/lib/timezone";

interface NutritionPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function NutritionPage({ searchParams }: NutritionPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  const { selectedDate, wasFallback } = normalizeDateParam(resolvedSearchParams.date, new Date(), profileTimeZone);

  const entriesResult = await getMyFoodEntriesForDate(selectedDate);

  const errorMessages = [profileResult.error?.message, entriesResult.error?.message].filter(Boolean);

  return (
    <NutritionTodayView
      selectedDate={selectedDate}
      todayDate={todayDate}
      dateWasFallback={wasFallback}
      entries={entriesResult.data ?? []}
      calorieGoal={profileResult.data?.calorie_goal ?? null}
      proteinGoal={profileResult.data?.protein_goal ?? null}
      carbohydrateGoal={profileResult.data?.carbohydrate_goal ?? null}
      fatGoal={profileResult.data?.fat_goal ?? null}
      dataErrorMessage={errorMessages[0] ?? null}
    />
  );
}
