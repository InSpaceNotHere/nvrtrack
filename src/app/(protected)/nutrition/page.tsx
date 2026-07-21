import { NutritionLogView } from "@/components/nutrition/nutrition-log-view";
import { PageHeader } from "@/components/ui/page-header";
import { getFeaturedActiveFoodCatalog } from "@/lib/data/food-catalog";
import { getMyFoods, getMyRecentFoods } from "@/lib/data/foods";
import { getMyFoodEntriesForDate, getMyRecentFoodEntries } from "@/lib/data/nutrition";
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

  const [
    entriesResult,
    foodsResult,
    recentFoodsResult,
    recentEntriesResult,
    catalogFoodsResult,
  ] = await Promise.all([
    getMyFoodEntriesForDate(selectedDate),
    getMyFoods(),
    getMyRecentFoods(12),
    getMyRecentFoodEntries(12),
    getFeaturedActiveFoodCatalog({ limit: 40 }),
  ]);

  const errorMessages = [
    profileResult.error?.message,
    entriesResult.error?.message,
    foodsResult.error?.message,
    recentFoodsResult.error?.message,
    recentEntriesResult.error?.message,
    catalogFoodsResult.error?.message,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader title="Nutrition" />
      <NutritionLogView
        selectedDate={selectedDate}
        todayDate={todayDate}
        dateWasFallback={wasFallback}
        foods={foodsResult.data ?? []}
        recentFoods={recentFoodsResult.data ?? []}
        recentEntries={recentEntriesResult.data ?? []}
        catalogFoods={catalogFoodsResult.data ?? []}
        entries={entriesResult.data ?? []}
        calorieGoal={profileResult.data?.calorie_goal ?? null}
        proteinGoal={profileResult.data?.protein_goal ?? null}
        carbohydrateGoal={profileResult.data?.carbohydrate_goal ?? null}
        fatGoal={profileResult.data?.fat_goal ?? null}
        dataErrorMessage={errorMessages[0] ?? null}
      />
    </div>
  );
}
