import { CustomFoodEditor } from "@/components/nutrition/custom-food-editor";
import { addFoodHref, parseMealDateParams } from "@/lib/nutrition/custom-food-routes";
import { isValidDateString } from "@/lib/nutrition/date";
import { parseMealTypeParam } from "@/lib/nutrition/meals";

interface NewCustomFoodPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function NewCustomFoodPage({ searchParams }: NewCustomFoodPageProps) {
  const resolved = (await Promise.resolve(searchParams)) ?? {};
  const { meal, date } = parseMealDateParams(resolved);
  const mealType = meal ? parseMealTypeParam(meal) : null;
  const entryDate = date && isValidDateString(date) ? date : null;
  const cancelHref = mealType && entryDate ? addFoodHref({ meal: mealType, date: entryDate }) : "/nutrition/foods";

  return (
    <CustomFoodEditor
      mode="create"
      initial={{
        name: "",
        brand: "",
        serving_size: "1",
        serving_unit: "serving",
        calories: "",
        protein_g: "",
        carbohydrate_g: "",
        fat_g: "",
      }}
      cancelHref={cancelHref}
      returnMeal={mealType}
      returnDate={entryDate}
    />
  );
}
