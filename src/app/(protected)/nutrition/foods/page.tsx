import Link from "next/link";

import { SavedFoodManager } from "@/components/nutrition/saved-food-manager";
import { PageHeader } from "@/components/ui/page-header";
import { getMyFoods } from "@/lib/data/foods";

export default async function NutritionFoodsPage() {
  const foodsResult = await getMyFoods();

  return (
    <div className="space-y-4">
      <PageHeader title="Saved Foods" />
      <div>
        <Link
          href="/nutrition"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          Back to Nutrition
        </Link>
      </div>
      <SavedFoodManager foods={foodsResult.data ?? []} loadErrorMessage={foodsResult.error?.message ?? null} />
    </div>
  );
}
