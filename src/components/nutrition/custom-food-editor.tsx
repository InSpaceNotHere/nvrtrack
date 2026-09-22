"use client";

import { useRouter } from "next/navigation";

import { CustomFoodForm } from "@/components/nutrition/custom-food-form";
import { addFoodHref } from "@/lib/nutrition/custom-food-routes";

interface CustomFoodEditorProps {
  mode: "create" | "edit";
  foodId?: string;
  initial: {
    name: string;
    brand: string;
    serving_size: string;
    serving_unit: string;
    calories: string;
    protein_g: string;
    carbohydrate_g: string;
    fat_g: string;
    fiber_g?: string;
  };
  cancelHref: string;
  returnMeal: string | null;
  returnDate: string | null;
}

export function CustomFoodEditor({
  mode,
  foodId,
  initial,
  cancelHref,
  returnMeal,
  returnDate,
}: CustomFoodEditorProps) {
  const router = useRouter();

  return (
    <CustomFoodForm
      mode={mode}
      foodId={foodId}
      initial={initial}
      cancelHref={cancelHref}
      onSaved={(savedId) => {
        if (returnMeal && returnDate) {
          router.push(addFoodHref({ meal: returnMeal, date: returnDate, saved: mode === "create" ? savedId : undefined }));
          return;
        }
        router.push("/nutrition/foods");
      }}
    />
  );
}
