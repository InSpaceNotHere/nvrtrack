"use server";

import { revalidatePath } from "next/cache";

import {
  addMyNutritionFoodFavorite,
  parseFavoriteIdentityInput,
  removeMyNutritionFoodFavorite,
} from "@/lib/data/nutrition-favorites";

export interface FavoriteIdentityInput {
  identity_type: "catalog" | "saved" | "snapshot";
  catalog_food_id?: string | null;
  food_id?: string | null;
  snapshot_key?: string | null;
}

export interface FavoriteActionResult {
  status: "success" | "error";
  message: string;
  favorited: boolean;
}

function revalidateFavoriteViews() {
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/add");
}

export async function toggleNutritionFoodFavoriteAction(
  input: FavoriteIdentityInput,
  nextFavorited: boolean,
): Promise<FavoriteActionResult> {
  const identity = parseFavoriteIdentityInput(input);
  if (!identity) {
    return {
      status: "error",
      message: "Couldn't update favorites.",
      favorited: !nextFavorited,
    };
  }

  const result = nextFavorited
    ? await addMyNutritionFoodFavorite(identity)
    : await removeMyNutritionFoodFavorite(identity);

  if (result.error) {
    return {
      status: "error",
      message: result.error.message,
      favorited: !nextFavorited,
    };
  }

  revalidateFavoriteViews();
  return {
    status: "success",
    message: nextFavorited ? "Added to favorites." : "Removed from favorites.",
    favorited: nextFavorited,
  };
}
