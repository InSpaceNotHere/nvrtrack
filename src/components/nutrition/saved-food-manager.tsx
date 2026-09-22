"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteSavedFoodAction } from "@/app/(protected)/actions/nutrition-actions";
import { formatMacroSummary } from "@/lib/nutrition/food-display-name";
import { customFoodCreateHref, customFoodEditHref } from "@/lib/nutrition/custom-food-routes";
import type { FoodRow } from "@/lib/data/auth-context";

interface SavedFoodManagerProps {
  foods: FoodRow[];
  loadErrorMessage?: string | null;
}

export function SavedFoodManager({ foods, loadErrorMessage }: SavedFoodManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleDelete(foodId: string) {
    startTransition(async () => {
      const result = await deleteSavedFoodAction(foodId);
      if (result.status === "success") {
        setDeleteConfirmId(null);
        setMessage("Food removed. Logged meals stay as they were.");
        router.refresh();
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{foods.length ? `${foods.length} custom foods` : "No custom foods yet"}</p>
        <Link
          href={customFoodCreateHref()}
          className="inline-flex h-9 items-center rounded-full bg-white px-3 text-xs font-semibold text-black"
        >
          Create
        </Link>
      </div>

      {loadErrorMessage ? (
        <p className="text-sm text-rose-300" role="alert">
          Custom foods are temporarily unavailable.
        </p>
      ) : null}

      <div>
        {foods.map((food) => (
          <div key={food.id} className="border-b border-white/6 py-3 last:border-b-0">
            <p className="truncate text-[15px] font-medium text-white">{food.name}</p>
            {food.brand ? <p className="truncate text-[11px] text-zinc-500">{food.brand}</p> : null}
            <p className="mt-0.5 text-[12px] text-zinc-400">
              {formatMacroSummary({
                calories: food.calories,
                protein_g: food.protein_g,
                carbohydrate_g: food.carbohydrate_g,
                fat_g: food.fat_g,
              })}
            </p>
            <p className="text-[11px] text-zinc-600">
              {food.serving_size} {food.serving_unit}
            </p>
            <div className="mt-2 flex gap-3 text-[12px]">
              <Link href={customFoodEditHref(food.id)} className="text-zinc-300 hover:text-white" aria-label={`Edit ${food.name}`}>
                Edit
              </Link>
              {deleteConfirmId === food.id ? (
                <>
                  <button
                    type="button"
                    className="text-rose-300"
                    disabled={isPending}
                    aria-label={`Confirm delete ${food.name}`}
                    onClick={() => handleDelete(food.id)}
                  >
                    Confirm delete
                  </button>
                  <button type="button" className="text-zinc-500" onClick={() => setDeleteConfirmId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-300"
                  aria-label={`Delete ${food.name}`}
                  onClick={() => setDeleteConfirmId(food.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {foods.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-400">Save a food from a nutrition label.</p>
            <Link href={customFoodCreateHref()} className="mt-3 inline-flex text-sm text-zinc-200 underline">
              Create custom food
            </Link>
          </div>
        ) : null}
      </div>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
