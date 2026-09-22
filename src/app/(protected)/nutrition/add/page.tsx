import { redirect } from "next/navigation";

import { AddFoodView } from "@/components/nutrition/add-food-view";
import { getActiveFoodCatalog } from "@/lib/data/food-catalog";
import { getMyFoods } from "@/lib/data/foods";
import { getMyProfile } from "@/lib/data/profile";
import { getTodayDateString, isValidDateString } from "@/lib/nutrition/date";
import { parseMealTypeParam } from "@/lib/nutrition/meals";
import { normalizeTimeZone } from "@/lib/timezone";

interface AddFoodPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function AddFoodPage({ searchParams }: AddFoodPageProps) {
  const resolved = (await Promise.resolve(searchParams)) ?? {};
  const profileResult = await getMyProfile();
  const profileTimeZone = normalizeTimeZone((profileResult.data as { timezone?: string | null } | null)?.timezone);
  const todayDate = getTodayDateString(profileTimeZone);
  const dateParam = Array.isArray(resolved.date) ? resolved.date[0] : resolved.date;
  const entryDate = dateParam && isValidDateString(dateParam) ? dateParam : todayDate;
  const mealType = parseMealTypeParam(resolved.meal);

  if (!dateParam || !isValidDateString(dateParam)) {
    redirect(`/nutrition/add?meal=${mealType}&date=${entryDate}`);
  }

  const [catalogResult, foodsResult] = await Promise.all([getActiveFoodCatalog(200), getMyFoods()]);

  return (
    <AddFoodView
      mealType={mealType}
      entryDate={entryDate}
      catalogFoods={catalogResult.data ?? []}
      foods={foodsResult.data ?? []}
      loadErrorMessage={catalogResult.error?.message ?? foodsResult.error?.message ?? null}
    />
  );
}
