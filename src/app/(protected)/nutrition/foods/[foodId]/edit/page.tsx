import { notFound, redirect } from "next/navigation";

import { CustomFoodEditor } from "@/components/nutrition/custom-food-editor";
import { getMyFoodById } from "@/lib/data/foods";
import { addFoodHref, parseMealDateParams } from "@/lib/nutrition/custom-food-routes";
import { isValidDateString } from "@/lib/nutrition/date";
import { parseMealTypeParam } from "@/lib/nutrition/meals";

interface EditCustomFoodPageProps {
  params?: Promise<{ foodId: string }> | { foodId: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function EditCustomFoodPage({ params, searchParams }: EditCustomFoodPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const foodId = resolvedParams?.foodId;
  if (!foodId) {
    notFound();
  }

  const foodResult = await getMyFoodById(foodId);
  if (foodResult.error) {
    redirect("/nutrition/foods");
  }
  if (!foodResult.data) {
    notFound();
  }

  const food = foodResult.data;
  const resolved = (await Promise.resolve(searchParams)) ?? {};
  const { meal, date } = parseMealDateParams(resolved);
  const mealType = meal ? parseMealTypeParam(meal) : null;
  const entryDate = date && isValidDateString(date) ? date : null;
  const cancelHref = mealType && entryDate ? addFoodHref({ meal: mealType, date: entryDate }) : "/nutrition/foods";

  return (
    <CustomFoodEditor
      mode="edit"
      foodId={food.id}
      initial={{
        name: food.name,
        brand: food.brand ?? "",
        serving_size: String(food.serving_size),
        serving_unit: food.serving_unit,
        calories: String(food.calories),
        protein_g: String(food.protein_g),
        carbohydrate_g: String(food.carbohydrate_g),
        fat_g: String(food.fat_g),
        fiber_g: food.fiber_g === null ? "" : String(food.fiber_g),
      }}
      cancelHref={cancelHref}
      returnMeal={mealType}
      returnDate={entryDate}
    />
  );
}
