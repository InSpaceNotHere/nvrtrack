"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createSavedFoodAction,
  deleteSavedFoodAction,
  updateSavedFoodAction,
  type SavedFoodActionInput,
  type SavedFoodFormErrors,
} from "@/app/(protected)/actions/nutrition-actions";
import { Card } from "@/components/ui/card";
import type { FoodRow } from "@/lib/data/auth-context";
import { roundNutritionValue } from "@/lib/nutrition/calculations";

interface SavedFoodManagerProps {
  foods: FoodRow[];
  loadErrorMessage?: string | null;
}

interface FoodDraft {
  name: string;
  brand: string;
  serving_size: string;
  serving_unit: string;
  calories: string;
  protein_g: string;
  carbohydrate_g: string;
  fat_g: string;
  fiber_g: string;
}

function emptyDraft(): FoodDraft {
  return {
    name: "",
    brand: "",
    serving_size: "",
    serving_unit: "",
    calories: "",
    protein_g: "",
    carbohydrate_g: "",
    fat_g: "",
    fiber_g: "",
  };
}

function rowToDraft(food: FoodRow): FoodDraft {
  return {
    name: food.name,
    brand: food.brand ?? "",
    serving_size: String(food.serving_size),
    serving_unit: food.serving_unit,
    calories: String(food.calories),
    protein_g: String(food.protein_g),
    carbohydrate_g: String(food.carbohydrate_g),
    fat_g: String(food.fat_g),
    fiber_g: food.fiber_g === null ? "" : String(food.fiber_g),
  };
}

function sourceStatusLabel(status: string | null): string | null {
  if (status === "usda_live") {
    return "USDA Live";
  }
  if (status === "usda_modified") {
    return "USDA Modified";
  }
  if (status === "usda_catalog") {
    return "USDA Catalog";
  }
  if (status === "manual") {
    return "Manual";
  }
  return null;
}

export function SavedFoodManager({ foods, loadErrorMessage }: SavedFoodManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [createDraft, setCreateDraft] = useState<FoodDraft>(emptyDraft);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FoodDraft>(emptyDraft);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<SavedFoodFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return foods;
    }
    return foods.filter((food) => `${food.name} ${food.brand ?? ""}`.toLowerCase().includes(q));
  }, [foods, query]);

  function asActionPayload(draft: FoodDraft): SavedFoodActionInput {
    return {
      name: draft.name,
      brand: draft.brand,
      serving_size: draft.serving_size,
      serving_unit: draft.serving_unit,
      calories: draft.calories,
      protein_g: draft.protein_g,
      carbohydrate_g: draft.carbohydrate_g,
      fat_g: draft.fat_g,
      fiber_g: draft.fiber_g,
    };
  }

  function showSuccess(text: string) {
    setMessage(text);
    setMessageTone("success");
  }

  function showError(text: string) {
    setMessage(text);
    setMessageTone("error");
  }

  function handleCreateFood() {
    setErrors({});
    setMessage(null);

    startTransition(async () => {
      const result = await createSavedFoodAction(asActionPayload(createDraft));
      if (result.status === "success") {
        showSuccess(result.message);
        setCreateDraft(emptyDraft());
        router.refresh();
        return;
      }

      setErrors(result.errors);
      showError(result.message);
    });
  }

  function startEdit(food: FoodRow) {
    setEditingFoodId(food.id);
    setEditDraft(rowToDraft(food));
    setErrors({});
    setMessage(null);
  }

  function handleSaveEdit(foodId: string) {
    setErrors({});
    setMessage(null);

    startTransition(async () => {
      const result = await updateSavedFoodAction(foodId, asActionPayload(editDraft));
      if (result.status === "success") {
        showSuccess(result.message);
        setEditingFoodId(null);
        router.refresh();
        return;
      }

      setErrors(result.errors);
      showError(result.message);
    });
  }

  function handleDelete(foodId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteSavedFoodAction(foodId);
      if (result.status === "success") {
        showSuccess(
          "Saved food deleted. Historical entries remain and retain their snapshot nutrition values.",
        );
        setDeleteConfirmId(null);
        router.refresh();
        return;
      }

      showError(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {loadErrorMessage ? (
        <Card>
          <p className="text-sm text-rose-200">Saved foods are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{loadErrorMessage}</p>
        </Card>
      ) : null}

      <Card title="Create Saved Food">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-zinc-300 sm:col-span-2">
            <span>Food name</span>
            <input
              value={createDraft.name}
              onChange={(event) => setCreateDraft((state) => ({ ...state, name: event.target.value }))}
              className="app-input"
            />
            {errors.name ? <p className="text-xs text-rose-300">{errors.name}</p> : null}
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Brand (optional)</span>
            <input
              value={createDraft.brand}
              onChange={(event) => setCreateDraft((state) => ({ ...state, brand: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Serving size</span>
            <input
              value={createDraft.serving_size}
              onChange={(event) => setCreateDraft((state) => ({ ...state, serving_size: event.target.value }))}
              className="app-input"
            />
            {errors.serving_size ? <p className="text-xs text-rose-300">{errors.serving_size}</p> : null}
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Serving unit</span>
            <input
              value={createDraft.serving_unit}
              onChange={(event) => setCreateDraft((state) => ({ ...state, serving_unit: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Calories/serving</span>
            <input
              value={createDraft.calories}
              onChange={(event) => setCreateDraft((state) => ({ ...state, calories: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Protein g</span>
            <input
              value={createDraft.protein_g}
              onChange={(event) => setCreateDraft((state) => ({ ...state, protein_g: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Carbohydrates g</span>
            <input
              value={createDraft.carbohydrate_g}
              onChange={(event) => setCreateDraft((state) => ({ ...state, carbohydrate_g: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Fat g</span>
            <input
              value={createDraft.fat_g}
              onChange={(event) => setCreateDraft((state) => ({ ...state, fat_g: event.target.value }))}
              className="app-input"
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Fiber g (optional)</span>
            <input
              value={createDraft.fiber_g}
              onChange={(event) => setCreateDraft((state) => ({ ...state, fiber_g: event.target.value }))}
              className="app-input"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleCreateFood}
          disabled={isPending}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "Saving..." : "Create Food"}
        </button>
      </Card>

      <Card title="Saved Foods">
        <label className="mb-3 block space-y-1 text-sm text-zinc-300">
          <span>Search your foods</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="app-input"
            placeholder="Search by name or brand"
          />
        </label>

        {filteredFoods.length ? (
          <ul className="space-y-2">
            {filteredFoods.map((food) => (
              <li key={food.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                {editingFoodId === food.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-zinc-300 sm:col-span-2">
                      <span>Food name</span>
                      <input
                        value={editDraft.name}
                        onChange={(event) => setEditDraft((state) => ({ ...state, name: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Brand</span>
                      <input
                        value={editDraft.brand}
                        onChange={(event) => setEditDraft((state) => ({ ...state, brand: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Serving size</span>
                      <input
                        value={editDraft.serving_size}
                        onChange={(event) => setEditDraft((state) => ({ ...state, serving_size: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Serving unit</span>
                      <input
                        value={editDraft.serving_unit}
                        onChange={(event) => setEditDraft((state) => ({ ...state, serving_unit: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Calories</span>
                      <input
                        value={editDraft.calories}
                        onChange={(event) => setEditDraft((state) => ({ ...state, calories: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Protein</span>
                      <input
                        value={editDraft.protein_g}
                        onChange={(event) => setEditDraft((state) => ({ ...state, protein_g: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Carbohydrates</span>
                      <input
                        value={editDraft.carbohydrate_g}
                        onChange={(event) => setEditDraft((state) => ({ ...state, carbohydrate_g: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Fat</span>
                      <input
                        value={editDraft.fat_g}
                        onChange={(event) => setEditDraft((state) => ({ ...state, fat_g: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-300">
                      <span>Fiber</span>
                      <input
                        value={editDraft.fiber_g}
                        onChange={(event) => setEditDraft((state) => ({ ...state, fiber_g: event.target.value }))}
                        className="app-input"
                      />
                    </label>
                    <div className="sm:col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(food.id)}
                        disabled={isPending}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                      >
                        {isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFoodId(null)}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{food.name}</p>
                        {food.brand ? <p className="text-xs text-zinc-500">{food.brand}</p> : null}
                        {sourceStatusLabel(food.source_status) ? (
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {sourceStatusLabel(food.source_status)}
                            {food.fdc_id ? ` • FDC ${food.fdc_id}` : ""}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-zinc-500">
                          {roundNutritionValue(food.serving_size, 2)} {food.serving_unit}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {roundNutritionValue(food.calories, 1)} kcal • P {roundNutritionValue(food.protein_g, 1)} • C{" "}
                          {roundNutritionValue(food.carbohydrate_g, 1)} • F {roundNutritionValue(food.fat_g, 1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(food)}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-white/10"
                        aria-label={`Edit saved food ${food.name}`}
                      >
                        Edit
                      </button>
                      {deleteConfirmId === food.id ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(food.id)}
                            disabled={isPending}
                            className="rounded-md border border-rose-400/40 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                            aria-label={`Confirm delete saved food ${food.name}`}
                          >
                            {isPending ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(food.id)}
                          className="rounded-md border border-rose-400/40 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                          aria-label={`Delete saved food ${food.name}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
            <p className="text-sm font-medium text-zinc-200">No saved foods yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Create your first food to speed up future meal logging.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-xs text-zinc-500">
          Deleting a saved food does not erase historical entries. Existing log rows keep their nutrition snapshots and
          become detached from the saved-food library.
        </p>
      </Card>

      {message ? (
        <p
          role={messageTone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-lg px-3 py-2 text-sm ${
            messageTone === "error"
              ? "border border-rose-400/35 bg-rose-500/10 text-rose-200"
              : "border border-accent/40 bg-accent/10 text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
