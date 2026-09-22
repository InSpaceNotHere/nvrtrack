import Link from "next/link";

import { SavedFoodManager } from "@/components/nutrition/saved-food-manager";
import { getMyFoods } from "@/lib/data/foods";

export default async function NutritionFoodsPage() {
  const foodsResult = await getMyFoods();

  return (
    <div className="space-y-4">
      <header>
        <Link href="/nutrition" className="text-sm text-zinc-400 hover:text-zinc-200">
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">My Foods</h1>
        <p className="mt-1 text-sm text-zinc-500">Your custom foods from nutrition labels.</p>
      </header>
      <SavedFoodManager foods={foodsResult.data ?? []} loadErrorMessage={foodsResult.error?.message ?? null} />
    </div>
  );
}
