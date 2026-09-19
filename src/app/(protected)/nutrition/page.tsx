import Link from "next/link";

import { NutritionLogView } from "@/components/nutrition/nutrition-log-view";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getFeaturedActiveFoodCatalog } from "@/lib/data/food-catalog";
import { getMyFoods, getMyRecentFoods } from "@/lib/data/foods";
import { getMyFoodEntriesForDate, getMyRecentFoodEntries } from "@/lib/data/nutrition";
import { getMyProfile } from "@/lib/data/profile";
import { calculateDailyTotals, calculateMealTotals } from "@/lib/nutrition/calculations";
import { getTodayDateString, normalizeDateParam } from "@/lib/nutrition/date";
import { addDaysToDateString } from "@/lib/nutrition/date";
import type { MealType } from "@/lib/nutrition/types";
import { normalizeTimeZone } from "@/lib/timezone";

interface NutritionPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

const MEAL_ROWS: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export default async function NutritionPage({ searchParams }: NutritionPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const view = Array.isArray(resolvedSearchParams.view) ? resolvedSearchParams.view[0] : resolvedSearchParams.view;
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

  const dailyTotals = calculateDailyTotals(entriesResult.data ?? []);
  const mealTotals = calculateMealTotals(entriesResult.data ?? []);
  const previousDate = addDaysToDateString(selectedDate, -1);
  const nextDate = addDaysToDateString(selectedDate, 1);
  const isDrillDown = view === "add";

  return (
    <div className="space-y-4">
      <PageHeader title="Nutrition" subtitle="What have I eaten?" />
      {isDrillDown ? (
        <>
          <Card variant="tertiary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-300">Add foods, search USDA, and manage saved foods.</p>
              <Link
                href={`/nutrition?date=${selectedDate}`}
                className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
              >
                Back to Daily Summary
              </Link>
            </div>
          </Card>
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
        </>
      ) : (
        <>
          {errorMessages[0] ? (
            <Card variant="tertiary">
              <p className="text-sm text-rose-200">Nutrition data is temporarily unavailable.</p>
              <p className="mt-1 text-xs text-zinc-500">{errorMessages[0]}</p>
            </Card>
          ) : null}
          <section className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
            <Card title="Date" variant="tertiary">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href={`/nutrition?date=${previousDate}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  Previous
                </Link>
                <Link
                  href={`/nutrition?date=${todayDate}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  Today
                </Link>
                <Link
                  href={`/nutrition?date=${nextDate}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  Next
                </Link>
              </div>
              {wasFallback ? <p className="mt-2 text-xs text-zinc-500">Invalid date query reset to today.</p> : null}
            </Card>
            <Card title="Daily Status" variant="primary">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-xs text-zinc-500">Calories</p>
                  <p className="text-base font-semibold text-white">
                    {dailyTotals.calories.toFixed(0)} / {profileResult.data?.calorie_goal?.toFixed(0) ?? "--"} kcal
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-xs text-zinc-500">Protein</p>
                  <p className="text-base font-semibold text-white">
                    {dailyTotals.protein_g.toFixed(0)} / {profileResult.data?.protein_goal?.toFixed(0) ?? "--"} g
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 sm:col-span-2">
                  <p className="text-xs text-zinc-500">
                    Carbs {dailyTotals.carbohydrate_g.toFixed(0)} / {profileResult.data?.carbohydrate_goal?.toFixed(0) ?? "--"} g • Fat{" "}
                    {dailyTotals.fat_g.toFixed(0)} / {profileResult.data?.fat_goal?.toFixed(0) ?? "--"} g
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <Card title="Meals" subtitle="At-a-glance meal totals" variant="secondary">
            <ul className="space-y-2">
              {MEAL_ROWS.map((meal) => (
                <li key={meal.value} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{meal.label}</p>
                    <p className="text-xs text-zinc-500">{mealTotals[meal.value].calories.toFixed(0)} kcal</p>
                  </div>
                  <Link
                    href={`/nutrition?date=${selectedDate}&view=add`}
                    className="inline-flex h-7 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
                  >
                    Add
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/nutrition?date=${selectedDate}&view=add`}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Add Food
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
