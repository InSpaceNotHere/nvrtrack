"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCatalogFoodEntryAction,
  createFoodEntryAction,
  deleteFoodEntryAction,
  searchCatalogFoodsAction,
  updateCatalogFoodEntryAction,
  type CatalogFoodEntryActionInput,
  type CatalogFoodEntryFormErrors,
  type FoodEntryActionInput,
  type FoodEntryFormErrors,
  updateFoodEntryAction,
} from "@/app/(protected)/actions/nutrition-actions";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "@/lib/data/auth-context";
import {
  calculateDailyTotals,
  calculateEntryTotals,
  calculateMealTotals,
  roundNutritionValue,
} from "@/lib/nutrition/calculations";
import { calculateCatalogEntrySnapshot } from "@/lib/nutrition/catalog-entry";
import { addDaysToDateString } from "@/lib/nutrition/date";
import type { MealType } from "@/lib/nutrition/types";
import type { SupportedAmountUnit } from "@/lib/nutrition/serving";

interface NutritionLogViewProps {
  selectedDate: string;
  todayDate: string;
  dateWasFallback: boolean;
  foods: FoodRow[];
  catalogFoods: FoodCatalogRow[];
  recentFoods: FoodRow[];
  recentEntries: FoodEntryRow[];
  entries: FoodEntryRow[];
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbohydrateGoal: number | null;
  fatGoal: number | null;
  dataErrorMessage?: string | null;
}

type ComposerMode = "common" | "saved" | "custom";

interface CustomEntryFormState {
  food_name: string;
  brand_name: string;
  serving_size: string;
  serving_unit: string;
  calories_per_serving: string;
  protein_per_serving_g: string;
  carbohydrate_per_serving_g: string;
  fat_per_serving_g: string;
  fiber_per_serving_g: string;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

function defaultCustomEntryState(): CustomEntryFormState {
  return {
    food_name: "",
    brand_name: "",
    serving_size: "",
    serving_unit: "",
    calories_per_serving: "",
    protein_per_serving_g: "",
    carbohydrate_per_serving_g: "",
    fat_per_serving_g: "",
    fiber_per_serving_g: "",
  };
}

function formatDateForDisplay(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function nutritionLine(entry: FoodEntryRow): string {
  const totals = calculateEntryTotals(entry);
  return `P ${roundNutritionValue(totals.protein_g, 1)} • C ${roundNutritionValue(totals.carbohydrate_g, 1)} • F ${roundNutritionValue(totals.fat_g, 1)}`;
}

export function NutritionLogView({
  selectedDate,
  todayDate,
  dateWasFallback,
  foods,
  catalogFoods,
  recentFoods,
  recentEntries,
  entries,
  calorieGoal,
  proteinGoal,
  carbohydrateGoal,
  fatGoal,
  dataErrorMessage,
}: NutritionLogViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("common");
  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogFoodId, setSelectedCatalogFoodId] = useState<string | null>(catalogFoods[0]?.id ?? null);
  const [catalogAmountValue, setCatalogAmountValue] = useState("100");
  const [catalogAmountUnit, setCatalogAmountUnit] = useState<SupportedAmountUnit>("g");
  const [catalogSearchResults, setCatalogSearchResults] = useState<FoodCatalogRow[]>(catalogFoods);
  const [catalogSearchBusy, setCatalogSearchBusy] = useState(false);
  const [catalogSearchError, setCatalogSearchError] = useState<string | null>(null);
  const catalogSearchRequestRef = useRef(0);
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState<string | null>(recentFoods[0]?.id ?? foods[0]?.id ?? null);
  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [entryDate, setEntryDate] = useState(selectedDate);
  const [entryNote, setEntryNote] = useState("");
  const [entryErrors, setEntryErrors] = useState<FoodEntryFormErrors>({});
  const [catalogErrors, setCatalogErrors] = useState<CatalogFoodEntryFormErrors>({});

  const [customEntry, setCustomEntry] = useState<CustomEntryFormState>(defaultCustomEntryState);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryDate, setEditingEntryDate] = useState("");
  const [editingMealType, setEditingMealType] = useState<MealType>("breakfast");
  const [editingServings, setEditingServings] = useState("1");
  const [editingAmountValue, setEditingAmountValue] = useState("1");
  const [editingAmountUnit, setEditingAmountUnit] = useState<SupportedAmountUnit>("g");
  const [editingNote, setEditingNote] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const groupedEntries = useMemo(() => {
    const map: Record<MealType, FoodEntryRow[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    for (const entry of entries) {
      if (entry.meal_type === "breakfast" || entry.meal_type === "lunch" || entry.meal_type === "dinner" || entry.meal_type === "snack") {
        map[entry.meal_type].push(entry);
      }
    }

    return map;
  }, [entries]);

  const dailyTotals = useMemo(() => calculateDailyTotals(entries), [entries]);
  const mealTotals = useMemo(() => calculateMealTotals(entries), [entries]);

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return foods;
    }

    return foods.filter((food) => {
      const haystack = `${food.name} ${food.brand ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [foods, search]);

  useEffect(() => {
    const normalizedQuery = catalogSearch.trim();
    const requestId = catalogSearchRequestRef.current + 1;
    catalogSearchRequestRef.current = requestId;

    if (!normalizedQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCatalogSearchBusy(true);
      setCatalogSearchError(null);
      void searchCatalogFoodsAction(normalizedQuery, 40).then((result) => {
        if (requestId !== catalogSearchRequestRef.current) {
          return;
        }
        if (result.status === "success") {
          setCatalogSearchResults(result.foods);
          setCatalogSearchError(null);
        } else {
          setCatalogSearchResults([]);
          setCatalogSearchError(result.message);
        }
        setCatalogSearchBusy(false);
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [catalogSearch]);

  const displayedCatalogFoods = useMemo(() => {
    return catalogSearch.trim() ? catalogSearchResults : catalogFoods;
  }, [catalogFoods, catalogSearch, catalogSearchResults]);

  const effectiveSelectedCatalogFoodId = useMemo(() => {
    if (displayedCatalogFoods.length === 0) {
      return null;
    }
    if (selectedCatalogFoodId && displayedCatalogFoods.some((food) => food.id === selectedCatalogFoodId)) {
      return selectedCatalogFoodId;
    }
    return displayedCatalogFoods[0].id;
  }, [displayedCatalogFoods, selectedCatalogFoodId]);

  const selectedCatalogFood = useMemo(
    () => displayedCatalogFoods.find((food) => food.id === effectiveSelectedCatalogFoodId) ?? null,
    [displayedCatalogFoods, effectiveSelectedCatalogFoodId],
  );

  const selectedCatalogSourceServing = useMemo(() => {
    if (!selectedCatalogFood || selectedCatalogFood.serving_weight_grams === null || selectedCatalogFood.serving_weight_grams <= 0) {
      return null;
    }
    return {
      quantity:
        selectedCatalogFood.serving_size !== null && selectedCatalogFood.serving_size > 0
          ? selectedCatalogFood.serving_size
          : 1,
      unit: selectedCatalogFood.serving_unit?.trim() || "source serving",
      weightGrams: selectedCatalogFood.serving_weight_grams,
    };
  }, [selectedCatalogFood]);

  const catalogAmountPreview = useMemo(() => {
    if (!selectedCatalogFood) {
      return null;
    }
    const amountValue = Number(catalogAmountValue);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return null;
    }
    try {
      return calculateCatalogEntrySnapshot(selectedCatalogFood, {
        amountValue,
        amountUnit: catalogAmountUnit,
      });
    } catch {
      return null;
    }
  }, [selectedCatalogFood, catalogAmountValue, catalogAmountUnit]);

  const recentLoggedDistinct = useMemo(() => {
    const seen = new Set<string>();
    const distinct: FoodEntryRow[] = [];

    for (const entry of recentEntries) {
      const key = `${entry.food_name}::${entry.brand_name ?? ""}::${entry.calories_per_serving}::${entry.serving_size}::${entry.serving_unit}`;
      if (!seen.has(key)) {
        seen.add(key);
        distinct.push(entry);
      }
      if (distinct.length >= 6) {
        break;
      }
    }

    return distinct;
  }, [recentEntries]);

  const previousDate = addDaysToDateString(selectedDate, -1);
  const nextDate = addDaysToDateString(selectedDate, 1);

  function setSuccessMessage(text: string) {
    setMessage(text);
    setMessageTone("success");
  }

  function setErrorMessage(text: string) {
    setMessage(text);
    setMessageTone("error");
  }

  function openComposer(defaultMeal: MealType) {
    setComposerOpen(true);
    setComposerMode("common");
    setMealType(defaultMeal);
    setEntryDate(selectedDate);
  }

  function resetEntryState() {
    setServings("1");
    setCatalogAmountValue("100");
    setCatalogAmountUnit("g");
    setCatalogSearch("");
    setEntryNote("");
    setEntryErrors({});
    setCatalogErrors({});
    setCustomEntry(defaultCustomEntryState());
  }

  function handleCreateEntry(mode: "saved" | "custom") {
    setEntryErrors({});
    setCatalogErrors({});
    setMessage(null);

    const payload: FoodEntryActionInput = {
      mode: mode === "saved" ? "saved" : "custom",
      food_id: selectedSavedFoodId,
      entry_date: entryDate,
      meal_type: mealType,
      servings,
      note: entryNote,
      ...customEntry,
    };

    startTransition(async () => {
      const result = await createFoodEntryAction(payload);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        resetEntryState();
        setComposerOpen(false);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
      setEntryErrors(result.errors);
    });
  }

  function handleCreateCatalogEntry() {
    setCatalogErrors({});
    setMessage(null);
    const payload: CatalogFoodEntryActionInput = {
      catalog_food_id: effectiveSelectedCatalogFoodId ?? "",
      amount_value: catalogAmountValue,
      amount_unit: catalogAmountUnit,
      entry_date: entryDate,
      meal_type: mealType,
      note: entryNote,
    };

    startTransition(async () => {
      const result = await createCatalogFoodEntryAction(payload);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        resetEntryState();
        setComposerOpen(false);
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
      setCatalogErrors(result.errors);
    });
  }

  function startEntryEdit(entry: FoodEntryRow) {
    setEntryErrors({});
    setCatalogErrors({});
    setMessage(null);
    setEditingEntryId(entry.id);
    setEditingEntryDate(entry.entry_date);
    setEditingMealType((entry.meal_type as MealType) || "breakfast");
    setEditingServings(String(entry.servings));
    setEditingAmountValue(String(entry.amount_value ?? entry.serving_size));
    setEditingAmountUnit(
      entry.amount_unit === "oz" || entry.amount_unit === "source_serving" ? entry.amount_unit : "g",
    );
    setEditingNote(entry.note ?? "");
  }

  function handleEntryUpdate() {
    if (!editingEntryId) {
      return;
    }

    setMessage(null);
    setEntryErrors({});
    const targetEntryId = editingEntryId;

    startTransition(async () => {
      const result = await updateFoodEntryAction(targetEntryId, {
        entry_date: editingEntryDate,
        meal_type: editingMealType,
        servings: editingServings,
        note: editingNote,
      });

      if (result.status === "success") {
        setSuccessMessage(result.message);
        setEditingEntryId(null);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
      setEntryErrors(result.errors);
    });
  }

  function handleCatalogEntryUpdate() {
    if (!editingEntryId) {
      return;
    }
    setCatalogErrors({});
    setMessage(null);
    const targetEntryId = editingEntryId;
    startTransition(async () => {
      const result = await updateCatalogFoodEntryAction(targetEntryId, {
        amount_value: editingAmountValue,
        amount_unit: editingAmountUnit,
        entry_date: editingEntryDate,
        meal_type: editingMealType,
        note: editingNote,
      });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setEditingEntryId(null);
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
      setCatalogErrors(result.errors);
    });
  }

  function handleDeleteEntry(entryId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteFoodEntryAction(entryId);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setDeleteConfirmId(null);
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
    });
  }

  function isCatalogEntry(entry: FoodEntryRow): boolean {
    return entry.source_status === "usda_catalog" && entry.catalog_food_id !== null;
  }

  return (
    <div className="space-y-4">
      <Card title="Date">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-white">{formatDateForDisplay(selectedDate)}</p>
            {dateWasFallback ? <p className="text-xs text-zinc-500">Invalid date query reset to today.</p> : null}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/nutrition?date=${previousDate}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              Previous
            </Link>
            <Link
              href={`/nutrition?date=${todayDate}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              Today
            </Link>
            <Link
              href={`/nutrition?date=${nextDate}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              Next
            </Link>
          </div>
        </div>
      </Card>

      {dataErrorMessage ? (
        <Card>
          <p className="text-sm text-rose-200">Nutrition data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{dataErrorMessage}</p>
        </Card>
      ) : null}

      <Card title="Daily Calories">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
              {roundNutritionValue(dailyTotals.calories, 1).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              of {calorieGoal !== null ? calorieGoal.toLocaleString() : "--"} kcal
            </p>
          </div>
          {calorieGoal !== null && calorieGoal > 0 ? (
            <CalorieRing consumed={dailyTotals.calories} goal={calorieGoal} size={96} />
          ) : (
            <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border border-white/10 text-[10px] uppercase tracking-[0.08em] text-zinc-500">
              Goal not set
            </div>
          )}
        </div>
        <div className="mt-3 border-t border-white/8 pt-3">
          <ul className="space-y-3">
            {[
              { label: "Protein", consumed: dailyTotals.protein_g, goal: proteinGoal },
              {
                label: "Carbohydrates",
                consumed: dailyTotals.carbohydrate_g,
                goal: carbohydrateGoal,
              },
              { label: "Fat", consumed: dailyTotals.fat_g, goal: fatGoal },
            ].map((macro) => (
              <li key={macro.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{macro.label}</span>
                  <span className="font-medium text-zinc-100">
                    {roundNutritionValue(macro.consumed, 1)}g / {macro.goal ?? "--"}g
                  </span>
                </div>
                {macro.goal !== null && macro.goal > 0 ? (
                  <ProgressBar value={macro.consumed} max={macro.goal} compact />
                ) : (
                  <div className="h-1.5 rounded-full bg-white/8" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">Fiber: {roundNutritionValue(dailyTotals.fiber_g, 1)}g</p>
        </div>
      </Card>

      <Card title="Food Log" subtitle="Grouped by meal">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">Daily totals are calculated from logged entries and servings.</p>
          <button
            type="button"
            onClick={() => openComposer("breakfast")}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Add Food
          </button>
        </div>

        {composerOpen ? (
          <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex flex-wrap gap-2">
              {([
                ["common", "Common"],
                ["saved", "My Foods"],
                ["custom", "Manual Label"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setComposerMode(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    composerMode === value ? "bg-white text-black" : "border border-white/15 text-zinc-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            {composerMode === "common" ? (
              <div className="space-y-3">
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Search Common foods</span>
                  <input
                    value={catalogSearch}
                    onChange={(event) => setCatalogSearch(event.target.value)}
                    className="app-input"
                    placeholder="Try: chicken breast cooked, white rice cooked, oats"
                  />
                </label>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-white/8 bg-black/25 p-2">
                  {catalogSearchBusy && catalogSearch.trim() ? (
                    <p className="px-2 py-1 text-xs text-zinc-500">Searching common foods…</p>
                  ) : catalogSearch.trim() && catalogSearchError ? (
                    <p className="px-2 py-1 text-xs text-rose-300">{catalogSearchError}</p>
                  ) : displayedCatalogFoods.length ? (
                    displayedCatalogFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => setSelectedCatalogFoodId(food.id)}
                        className={`w-full rounded-md border p-2 text-left text-xs ${
                          effectiveSelectedCatalogFoodId === food.id
                            ? "border-white bg-white/10 text-white"
                            : "border-white/10 text-zinc-200 hover:bg-white/10"
                        }`}
                      >
                        <p className="font-medium">{food.description}</p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          {food.data_type} • {food.food_category ?? "General"} • {roundNutritionValue(food.calories_per_100g ?? 0, 1)} kcal / 100 g
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          P {roundNutritionValue(food.protein_g_per_100g ?? 0, 1)} • C {roundNutritionValue(food.carbohydrate_g_per_100g ?? 0, 1)} • F{" "}
                          {roundNutritionValue(food.fat_g_per_100g ?? 0, 1)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1 text-xs text-zinc-500">No common foods match your search.</p>
                  )}
                </div>
                {catalogErrors.catalog_food_id ? <p className="text-xs text-rose-300">{catalogErrors.catalog_food_id}</p> : null}

                {selectedCatalogFood ? (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
                    <p className="text-sm font-medium text-white">{selectedCatalogFood.description}</p>
                    <p className="text-xs text-zinc-400">
                      Source: USDA {selectedCatalogFood.data_type} • FDC ID {selectedCatalogFood.fdc_id}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-sm text-zinc-300">
                        <span>Amount</span>
                        <input
                          value={catalogAmountValue}
                          onChange={(event) => setCatalogAmountValue(event.target.value)}
                          className="app-input"
                        />
                        {catalogErrors.amount_value ? <p className="text-xs text-rose-300">{catalogErrors.amount_value}</p> : null}
                      </label>
                      <label className="space-y-1 text-sm text-zinc-300">
                        <span>Unit</span>
                        <select
                          value={catalogAmountUnit}
                          onChange={(event) => setCatalogAmountUnit(event.target.value as SupportedAmountUnit)}
                          className="app-input"
                        >
                          <option value="g">grams (g)</option>
                          <option value="oz">ounces (oz)</option>
                          {selectedCatalogSourceServing ? (
                            <option value="source_serving">
                              source serving ({selectedCatalogSourceServing.quantity} {selectedCatalogSourceServing.unit} ={" "}
                              {roundNutritionValue(selectedCatalogSourceServing.weightGrams, 1)} g)
                            </option>
                          ) : null}
                        </select>
                        {catalogErrors.amount_unit ? <p className="text-xs text-rose-300">{catalogErrors.amount_unit}</p> : null}
                      </label>
                    </div>
                    {catalogAmountPreview ? (
                      <div className="rounded-lg border border-white/10 bg-black/35 p-2 text-xs text-zinc-300">
                        <p>{roundNutritionValue(catalogAmountPreview.amount_grams, 2)} g total</p>
                        <p>Calories: {roundNutritionValue(catalogAmountPreview.calories_per_serving, 1)} kcal</p>
                        <p>
                          P {roundNutritionValue(catalogAmountPreview.protein_per_serving_g, 1)} • C{" "}
                          {roundNutritionValue(catalogAmountPreview.carbohydrate_per_serving_g, 1)} • F{" "}
                          {roundNutritionValue(catalogAmountPreview.fat_per_serving_g, 1)}
                        </p>
                        {catalogAmountPreview.fiber_per_serving_g !== null ? (
                          <p>Fiber: {roundNutritionValue(catalogAmountPreview.fiber_per_serving_g, 1)} g</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Enter a valid amount to preview nutrition.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {composerMode === "saved" ? (
              <div className="space-y-3">
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Search My Foods</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="app-input"
                    placeholder="Search by name or brand"
                  />
                </label>
                {recentFoods.length ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.08em] text-zinc-500">Recent foods</p>
                    <div className="flex flex-wrap gap-2">
                      {recentFoods.slice(0, 6).map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => setSelectedSavedFoodId(food.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs ${
                            selectedSavedFoodId === food.id
                              ? "border-white bg-white text-black"
                              : "border-white/15 text-zinc-200 hover:bg-white/10"
                          }`}
                        >
                          {food.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recentLoggedDistinct.length ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.08em] text-zinc-500">Recently logged</p>
                    <div className="flex flex-wrap gap-2">
                      {recentLoggedDistinct.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setComposerMode("custom");
                            setCustomEntry({
                              food_name: entry.food_name,
                              brand_name: entry.brand_name ?? "",
                              serving_size: String(entry.serving_size),
                              serving_unit: entry.serving_unit,
                              calories_per_serving: String(entry.calories_per_serving),
                              protein_per_serving_g: String(entry.protein_per_serving_g),
                              carbohydrate_per_serving_g: String(entry.carbohydrate_per_serving_g),
                              fat_per_serving_g: String(entry.fat_per_serving_g),
                              fiber_per_serving_g: entry.fiber_per_serving_g === null ? "" : String(entry.fiber_per_serving_g),
                            });
                          }}
                          className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
                        >
                          {entry.food_name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/8 bg-black/25 p-2">
                  {filteredFoods.length ? (
                    filteredFoods.slice(0, 40).map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => setSelectedSavedFoodId(food.id)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                          selectedSavedFoodId === food.id ? "bg-white text-black" : "text-zinc-200 hover:bg-white/10"
                        }`}
                      >
                        <span>
                          {food.name}
                          {food.brand ? <span className="text-xs opacity-70"> • {food.brand}</span> : null}
                        </span>
                        <span className="text-xs">{roundNutritionValue(food.calories, 1)} kcal</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1 text-xs text-zinc-500">No matching saved foods.</p>
                  )}
                </div>
                {entryErrors.food_id ? <p className="text-xs text-rose-300">{entryErrors.food_id}</p> : null}
                <Link
                  href="/nutrition/foods"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 px-3 text-xs font-medium text-zinc-200 hover:bg-white/10"
                >
                  Manage My Foods
                </Link>
              </div>
            ) : null}

            {composerMode === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-zinc-300 sm:col-span-2">
                  <span>Food name</span>
                  <input
                    value={customEntry.food_name}
                    onChange={(event) => setCustomEntry((state) => ({ ...state, food_name: event.target.value }))}
                    className="app-input"
                  />
                  {entryErrors.food_name ? <p className="text-xs text-rose-300">{entryErrors.food_name}</p> : null}
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Brand (optional)</span>
                  <input
                    value={customEntry.brand_name}
                    onChange={(event) => setCustomEntry((state) => ({ ...state, brand_name: event.target.value }))}
                    className="app-input"
                  />
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Serving size</span>
                  <input
                    value={customEntry.serving_size}
                    onChange={(event) => setCustomEntry((state) => ({ ...state, serving_size: event.target.value }))}
                    className="app-input"
                  />
                  {entryErrors.serving_size ? <p className="text-xs text-rose-300">{entryErrors.serving_size}</p> : null}
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Serving unit</span>
                  <input
                    value={customEntry.serving_unit}
                    onChange={(event) => setCustomEntry((state) => ({ ...state, serving_unit: event.target.value }))}
                    className="app-input"
                  />
                  {entryErrors.serving_unit ? <p className="text-xs text-rose-300">{entryErrors.serving_unit}</p> : null}
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Calories/serving</span>
                  <input
                    value={customEntry.calories_per_serving}
                    onChange={(event) =>
                      setCustomEntry((state) => ({ ...state, calories_per_serving: event.target.value }))
                    }
                    className="app-input"
                  />
                  {entryErrors.calories_per_serving ? (
                    <p className="text-xs text-rose-300">{entryErrors.calories_per_serving}</p>
                  ) : null}
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Protein g</span>
                  <input
                    value={customEntry.protein_per_serving_g}
                    onChange={(event) =>
                      setCustomEntry((state) => ({ ...state, protein_per_serving_g: event.target.value }))
                    }
                    className="app-input"
                  />
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Carbohydrates g</span>
                  <input
                    value={customEntry.carbohydrate_per_serving_g}
                    onChange={(event) =>
                      setCustomEntry((state) => ({ ...state, carbohydrate_per_serving_g: event.target.value }))
                    }
                    className="app-input"
                  />
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Fat g</span>
                  <input
                    value={customEntry.fat_per_serving_g}
                    onChange={(event) => setCustomEntry((state) => ({ ...state, fat_per_serving_g: event.target.value }))}
                    className="app-input"
                  />
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Fiber g (optional)</span>
                  <input
                    value={customEntry.fiber_per_serving_g}
                    onChange={(event) =>
                      setCustomEntry((state) => ({ ...state, fiber_per_serving_g: event.target.value }))
                    }
                    className="app-input"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {composerMode !== "common" ? (
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Servings</span>
                  <input value={servings} onChange={(event) => setServings(event.target.value)} className="app-input" />
                  {entryErrors.servings ? <p className="text-xs text-rose-300">{entryErrors.servings}</p> : null}
                </label>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Meal type</span>
                  <select
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value as MealType)}
                    className="app-input"
                  >
                    {MEAL_ORDER.map((meal) => (
                      <option key={meal} value={meal}>
                        {MEAL_LABELS[meal]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm text-zinc-300">
                  <span>Date</span>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(event) => setEntryDate(event.target.value)}
                    className="app-input"
                  />
                  {composerMode === "common" ? (
                    catalogErrors.entry_date ? <p className="text-xs text-rose-300">{catalogErrors.entry_date}</p> : null
                  ) : entryErrors.entry_date ? (
                    <p className="text-xs text-rose-300">{entryErrors.entry_date}</p>
                  ) : null}
                </label>
              </div>
              <label className="space-y-1 text-sm text-zinc-300">
                <span>Note (optional)</span>
                <input
                  value={entryNote}
                  onChange={(event) => setEntryNote(event.target.value)}
                  className="app-input"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {composerMode === "common" ? (
                <button
                  type="button"
                  onClick={handleCreateCatalogEntry}
                  disabled={isPending || !selectedCatalogFood}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPending ? "Saving..." : "Log Common Food"}
                </button>
              ) : null}
              {composerMode === "saved" ? (
                <button
                  type="button"
                  onClick={() => handleCreateEntry("saved")}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPending ? "Saving..." : "Log Saved Food"}
                </button>
              ) : null}
              {composerMode === "custom" ? (
                <button
                  type="button"
                  onClick={() => handleCreateEntry("custom")}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPending ? "Saving..." : "Log Custom Entry"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!entries.length ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
            <p className="text-sm font-medium text-zinc-200">No food entries logged for this date.</p>
            <p className="mt-1 text-sm text-zinc-500">Use Add Food to log your first meal on this day.</p>
            <button
              type="button"
              onClick={() => openComposer("breakfast")}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-zinc-200"
            >
              Add Food
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {MEAL_ORDER.map((meal) => {
            const mealEntries = groupedEntries[meal];
            const mealTotal = mealTotals[meal];

            return (
              <section key={meal} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{MEAL_LABELS[meal]}</p>
                    <p className="text-xs text-zinc-500">{roundNutritionValue(mealTotal.calories, 1)} kcal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openComposer(meal)}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-white/10"
                  >
                    Add
                  </button>
                </div>

                {mealEntries.length ? (
                  <ul className="space-y-2">
                    {mealEntries.map((entry) => {
                      const entryTotals = calculateEntryTotals(entry);
                      const isEditing = editingEntryId === entry.id;
                      const entryIsCatalog = isCatalogEntry(entry);

                      return (
                        <li key={entry.id} className="rounded-lg border border-white/8 bg-black/25 p-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{entry.food_name}</p>
                              {entry.brand_name ? <p className="text-xs text-zinc-500">{entry.brand_name}</p> : null}
                              <p className="mt-0.5 text-[11px] text-zinc-500">
                                {entryIsCatalog ? (
                                  <>
                                    {roundNutritionValue(entry.amount_value ?? entry.serving_size, 2)}{" "}
                                    {entry.amount_unit ?? entry.serving_unit}
                                  </>
                                ) : (
                                  <>
                                    {roundNutritionValue(entry.serving_size, 1)} {entry.serving_unit} ×{" "}
                                    {roundNutritionValue(entry.servings, 2)} servings
                                  </>
                                )}
                              </p>
                              <p className="text-[11px] text-zinc-500">{nutritionLine(entry)}</p>
                              {entry.note ? <p className="mt-1 text-[11px] text-zinc-500">{entry.note}</p> : null}
                              {entryIsCatalog ? (
                                <p className="mt-1 text-[11px] text-zinc-500">
                                  USDA {entry.source_data_type ?? "catalog"} snapshot • FDC {entry.fdc_id}
                                </p>
                              ) : entry.food_id === null ? (
                                <p className="mt-1 text-[11px] text-zinc-500">Historical/manual snapshot entry</p>
                              ) : (
                                <p className="mt-1 text-[11px] text-zinc-500">My Food snapshot entry</p>
                              )}
                              {entry.source_description ? (
                                <p className="mt-1 text-[11px] text-zinc-500">{entry.source_description}</p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-zinc-100">
                                {roundNutritionValue(entryTotals.calories, 1)} kcal
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500">{formatDateForDisplay(entry.entry_date)}</p>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {entryIsCatalog ? (
                                <>
                                  <label className="space-y-1 text-xs text-zinc-300">
                                    <span>Amount</span>
                                    <input
                                      value={editingAmountValue}
                                      onChange={(event) => setEditingAmountValue(event.target.value)}
                                      className="app-input"
                                    />
                                    {catalogErrors.amount_value ? (
                                      <p className="text-xs text-rose-300">{catalogErrors.amount_value}</p>
                                    ) : null}
                                  </label>
                                  <label className="space-y-1 text-xs text-zinc-300">
                                    <span>Unit</span>
                                    <select
                                      value={editingAmountUnit}
                                      onChange={(event) => setEditingAmountUnit(event.target.value as SupportedAmountUnit)}
                                      className="app-input"
                                    >
                                      <option value="g">grams (g)</option>
                                      <option value="oz">ounces (oz)</option>
                                      {entry.source_serving_weight_grams !== null && entry.source_serving_weight_grams > 0 ? (
                                        <option value="source_serving">
                                          source serving ({roundNutritionValue(entry.source_serving_weight_grams, 2)} g)
                                        </option>
                                      ) : null}
                                    </select>
                                    {catalogErrors.amount_unit ? (
                                      <p className="text-xs text-rose-300">{catalogErrors.amount_unit}</p>
                                    ) : null}
                                  </label>
                                </>
                              ) : (
                                <label className="space-y-1 text-xs text-zinc-300">
                                  <span>Servings</span>
                                  <input
                                    value={editingServings}
                                    onChange={(event) => setEditingServings(event.target.value)}
                                    className="app-input"
                                  />
                                </label>
                              )}
                              <label className="space-y-1 text-xs text-zinc-300">
                                <span>Meal type</span>
                                <select
                                  value={editingMealType}
                                  onChange={(event) => setEditingMealType(event.target.value as MealType)}
                                  className="app-input"
                                >
                                  {MEAL_ORDER.map((option) => (
                                    <option key={option} value={option}>
                                      {MEAL_LABELS[option]}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1 text-xs text-zinc-300">
                                <span>Date</span>
                                <input
                                  type="date"
                                  value={editingEntryDate}
                                  onChange={(event) => setEditingEntryDate(event.target.value)}
                                  className="app-input"
                                />
                                {entryIsCatalog ? (
                                  catalogErrors.entry_date ? (
                                    <p className="text-xs text-rose-300">{catalogErrors.entry_date}</p>
                                  ) : null
                                ) : entryErrors.entry_date ? (
                                  <p className="text-xs text-rose-300">{entryErrors.entry_date}</p>
                                ) : null}
                              </label>
                              <label className="space-y-1 text-xs text-zinc-300">
                                <span>Note</span>
                                <input
                                  value={editingNote}
                                  onChange={(event) => setEditingNote(event.target.value)}
                                  className="app-input"
                                />
                              </label>
                              <div className="sm:col-span-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={entryIsCatalog ? handleCatalogEntryUpdate : handleEntryUpdate}
                                  disabled={isPending}
                                  className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-70"
                                >
                                  {isPending ? "Saving..." : "Save Entry"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(null)}
                                  className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/10"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEntryEdit(entry)}
                                className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-white/10"
                                aria-label={`Edit entry ${entry.food_name}`}
                              >
                                Edit
                              </button>
                              {deleteConfirmId === entry.id ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={isPending}
                                    className="rounded-md border border-rose-400/40 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                                    aria-label={`Confirm delete ${entry.food_name}`}
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
                                  onClick={() => setDeleteConfirmId(entry.id)}
                                  className="rounded-md border border-rose-400/40 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/15"
                                  aria-label={`Delete entry ${entry.food_name}`}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">No entries in this meal.</p>
                )}
              </section>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Link
          href="/nutrition/foods"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10"
        >
          Manage Saved Foods
        </Link>
      </div>

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
