import { redirect } from "next/navigation";

import { AddFoodView } from "@/components/nutrition/add-food-view";
import { getActiveFoodCatalog } from "@/lib/data/food-catalog";
import { listMyNutritionFoodFavorites } from "@/lib/data/nutrition-favorites";
import { getMyLatestLoggedFoodEntries, getMyFrequentWindowFoodEntries } from "@/lib/data/nutrition";
import { getMyFoods } from "@/lib/data/foods";
import { getMyProfile } from "@/lib/data/profile";
import { getTodayDateString, isValidDateString } from "@/lib/nutrition/date";
import { parseMealTypeParam } from "@/lib/nutrition/meals";
import {
  buildFavoritePersonalFoods,
  buildFrequentPersonalFoods,
  buildRecentPersonalFoods,
} from "@/lib/nutrition/personal-foods";
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
  const savedParam = Array.isArray(resolved.saved) ? resolved.saved[0] : resolved.saved;

  if (!dateParam || !isValidDateString(dateParam)) {
    redirect(`/nutrition/add?meal=${mealType}&date=${entryDate}`);
  }

  const [catalogResult, foodsResult, recentResult, frequentResult, favoritesResult] = await Promise.all([
    getActiveFoodCatalog(200),
    getMyFoods(),
    getMyLatestLoggedFoodEntries(80),
    getMyFrequentWindowFoodEntries(45, 400),
    listMyNutritionFoodFavorites(),
  ]);

  const catalogFoods = catalogResult.data ?? [];
  const foods = foodsResult.data ?? [];
  const recentEntries = recentResult.data ?? [];
  const frequentEntries = frequentResult.data ?? [];
  const favoritesAvailable = favoritesResult.data?.available === true;
  const favoriteRecords = favoritesAvailable ? (favoritesResult.data?.favorites ?? []) : [];
  const recentFoods = buildRecentPersonalFoods(recentEntries, catalogFoods, foods);
  const frequentFoods = buildFrequentPersonalFoods(frequentEntries, catalogFoods, foods);
  const favoriteFoods = favoritesAvailable
    ? buildFavoritePersonalFoods(favoriteRecords, catalogFoods, foods, recentEntries)
    : [];

  return (
    <AddFoodView
      mealType={mealType}
      entryDate={entryDate}
      catalogFoods={catalogFoods}
      foods={foods}
      recentFoods={recentFoods}
      frequentFoods={frequentFoods}
      favoriteFoods={favoriteFoods}
      favoriteIdentities={favoriteFoods.map((item) => item.identity)}
      favoritesEnabled={favoritesAvailable}
      initialSavedFoodId={savedParam ?? null}
      loadErrorMessage={
        catalogResult.error?.message ??
        foodsResult.error?.message ??
        recentResult.error?.message ??
        frequentResult.error?.message ??
        null
      }
    />
  );
}
