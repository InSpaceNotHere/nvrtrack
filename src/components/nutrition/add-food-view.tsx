"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCatalogFoodEntryAction,
  createFoodEntryAction,
} from "@/app/(protected)/actions/nutrition-actions";
import { FoodPortionSheet, type PortionTarget, type PortionUnit } from "@/components/nutrition/food-portion-sheet";
import { FoodResultRow } from "@/components/nutrition/food-result-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import type { FoodCatalogRow, FoodRow } from "@/lib/data/auth-context";
import { normalizeCatalogSearchText, rankCatalogSearchItems } from "@/lib/nutrition/catalog-search";
import { getCatalogDisplayName, perHundredGramMacros } from "@/lib/nutrition/food-display-name";
import { MEAL_LABELS } from "@/lib/nutrition/meals";
import type { MealType } from "@/lib/nutrition/types";

type AddFoodTab = "common" | "mine" | "custom";

interface AddFoodViewProps {
  mealType: MealType;
  entryDate: string;
  catalogFoods: FoodCatalogRow[];
  foods: FoodRow[];
  loadErrorMessage?: string | null;
}

function searchSavedFoods(foods: FoodRow[], query: string): FoodRow[] {
  const normalized = normalizeCatalogSearchText(query);
  if (!normalized) {
    return foods;
  }
  const terms = normalized.split(" ").filter(Boolean);
  return foods.filter((food) => {
    const haystack = normalizeCatalogSearchText(`${food.name} ${food.brand ?? ""}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function AddFoodView({ mealType, entryDate, catalogFoods, foods, loadErrorMessage }: AddFoodViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<AddFoodTab>("common");
  const [target, setTarget] = useState<PortionTarget | null>(null);
  const [amountValue, setAmountValue] = useState("100");
  const [amountUnit, setAmountUnit] = useState<PortionUnit>("g");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [customServingSize, setCustomServingSize] = useState("1");
  const [customServingUnit, setCustomServingUnit] = useState("serving");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  const mealLabel = MEAL_LABELS[mealType];
  const searching = query.trim().length > 0;

  const rankedCatalog = useMemo(() => {
    const ranked = rankCatalogSearchItems(
      catalogFoods.map((food) => ({
        id: food.id,
        fdc_id: food.fdc_id,
        normalized_name: food.normalized_name,
        description: food.description,
        aliases: food.aliases,
        display_name: getCatalogDisplayName(food),
      })),
      query,
      { limit: searching ? 40 : 167 },
    );
    const byId = new Map(catalogFoods.map((food) => [food.id, food]));
    return ranked
      .map((item) => byId.get(item.id))
      .filter((food): food is FoodCatalogRow => food !== undefined);
  }, [catalogFoods, query, searching]);

  const savedMatches = useMemo(() => searchSavedFoods(foods, query), [foods, query]);

  function openCatalog(food: FoodCatalogRow) {
    setErrorMessage(null);
    setTarget({ kind: "catalog", food, name: getCatalogDisplayName(food) });
    setAmountValue("100");
    setAmountUnit("g");
  }

  function openSaved(food: FoodRow) {
    setErrorMessage(null);
    setTarget({ kind: "saved", food, name: food.name });
    setAmountValue("1");
    setAmountUnit("servings");
  }

  function handleLogSelected() {
    if (!target) {
      return;
    }
    startTransition(async () => {
      if (target.kind === "catalog") {
        if (amountUnit === "servings") {
          setErrorMessage("Choose grams, ounces, or serving.");
          return;
        }
        const result = await createCatalogFoodEntryAction({
          catalog_food_id: target.food.id,
          amount_value: amountValue,
          amount_unit: amountUnit,
          entry_date: entryDate,
          meal_type: mealType,
        });
        if (result.status === "error") {
          setErrorMessage(result.message);
          return;
        }
        router.push(`/nutrition?date=${entryDate}`);
        router.refresh();
        return;
      }

      if (target.kind === "saved") {
        const result = await createFoodEntryAction({
          mode: "saved",
          food_id: target.food.id,
          entry_date: entryDate,
          meal_type: mealType,
          servings: amountValue,
        });
        if (result.status === "error") {
          setErrorMessage(result.message);
          return;
        }
        router.push(`/nutrition?date=${entryDate}`);
        router.refresh();
      }
    });
  }

  function handleLogCustom() {
    startTransition(async () => {
      const result = await createFoodEntryAction({
        mode: "custom",
        entry_date: entryDate,
        meal_type: mealType,
        servings: "1",
        food_name: customName,
        serving_size: customServingSize,
        serving_unit: customServingUnit,
        calories_per_serving: customCalories,
        protein_per_serving_g: customProtein,
        carbohydrate_per_serving_g: customCarbs,
        fat_per_serving_g: customFat,
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.push(`/nutrition?date=${entryDate}`);
      router.refresh();
    });
  }

  const tabOptions: Array<{ value: AddFoodTab; label: string }> = [
    { value: "common", label: "Common" },
    { value: "mine", label: "My Foods" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link
          href={`/nutrition?date=${entryDate}`}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl text-sm font-medium text-zinc-200 hover:bg-white/8"
        >
          Back
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">Add to {mealLabel}</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">Add Food</h1>
        </div>
      </header>

      {loadErrorMessage ? (
        <Toast tone="error" role="alert">
          {loadErrorMessage}
        </Toast>
      ) : null}

      <label className="block space-y-1 text-sm text-zinc-300">
        <span className="sr-only">Search foods</span>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (tab === "custom") {
              setTab("common");
            }
          }}
          placeholder="Search chicken, rice, oats…"
          aria-label="Search foods"
          className="h-12 rounded-2xl"
        />
      </label>

      {!searching ? (
        <Tabs value={tab} options={tabOptions} onChange={setTab} ariaLabel="Food source" />
      ) : null}

      {searching || tab === "common" ? (
        <section>
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {searching ? "Results" : "Common"}
            </h2>
          </div>
          <div className="divide-y divide-white/6 rounded-2xl bg-black/20">
            {(searching ? rankedCatalog : rankedCatalog.slice(0, 80)).map((food) => {
              const macros = perHundredGramMacros(food);
              return (
                <FoodResultRow
                  key={food.id}
                  name={getCatalogDisplayName(food)}
                  calories={macros.calories}
                  protein_g={macros.protein_g}
                  carbohydrate_g={macros.carbohydrate_g}
                  fat_g={macros.fat_g}
                  basis="100 g"
                  selected={target?.kind === "catalog" && target.food.id === food.id}
                  onSelect={() => openCatalog(food)}
                />
              );
            })}
            {rankedCatalog.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-500">No common foods match that search.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {searching ? (
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">My Foods</h2>
          <div className="divide-y divide-white/6 rounded-2xl bg-black/20">
            {savedMatches.map((food) => (
              <FoodResultRow
                key={food.id}
                name={food.name}
                calories={food.calories}
                protein_g={food.protein_g}
                carbohydrate_g={food.carbohydrate_g}
                fat_g={food.fat_g}
                basis={`${food.serving_size} ${food.serving_unit}`}
                selected={target?.kind === "saved" && target.food.id === food.id}
                onSelect={() => openSaved(food)}
              />
            ))}
            {savedMatches.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-500">No saved foods match.</p> : null}
          </div>
        </section>
      ) : null}

      {!searching && tab === "mine" ? (
        <section>
          <div className="divide-y divide-white/6 rounded-2xl bg-black/20">
            {foods.map((food) => (
              <FoodResultRow
                key={food.id}
                name={food.name}
                calories={food.calories}
                protein_g={food.protein_g}
                carbohydrate_g={food.carbohydrate_g}
                fat_g={food.fat_g}
                basis={`${food.serving_size} ${food.serving_unit}`}
                selected={target?.kind === "saved" && target.food.id === food.id}
                onSelect={() => openSaved(food)}
              />
            ))}
            {foods.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-500">No custom foods yet. Use Custom to add one while logging.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {!searching && tab === "custom" ? (
        <section className="space-y-3 rounded-2xl bg-black/20 p-3">
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Name</span>
            <Input value={customName} onChange={(event) => setCustomName(event.target.value)} aria-label="Food name" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Serving amount</span>
              <Input value={customServingSize} onChange={(event) => setCustomServingSize(event.target.value)} aria-label="Serving size" />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Unit</span>
              <Input value={customServingUnit} onChange={(event) => setCustomServingUnit(event.target.value)} aria-label="Serving unit" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Calories</span>
              <Input value={customCalories} onChange={(event) => setCustomCalories(event.target.value)} aria-label="Calories/serving" />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Protein</span>
              <Input value={customProtein} onChange={(event) => setCustomProtein(event.target.value)} aria-label="Protein g" />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Carbs</span>
              <Input value={customCarbs} onChange={(event) => setCustomCarbs(event.target.value)} aria-label="Carbohydrates g" />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Fat</span>
              <Input value={customFat} onChange={(event) => setCustomFat(event.target.value)} aria-label="Fat g" />
            </label>
          </div>
          <Button type="button" variant="primary" className="h-12 w-full rounded-2xl" disabled={isPending} onClick={handleLogCustom}>
            {isPending ? "Saving..." : `Add to ${mealLabel}`}
          </Button>
        </section>
      ) : null}

      {message ? (
        <Toast tone="error" role="alert">
          {message}
        </Toast>
      ) : null}

      <FoodPortionSheet
        open={target !== null}
        target={target}
        amountValue={amountValue}
        amountUnit={amountUnit}
        mealLabel={`Add to ${mealLabel}`}
        pending={isPending}
        errorMessage={errorMessage}
        submitLabel={`Add to ${mealLabel}`}
        onAmountChange={setAmountValue}
        onUnitChange={setAmountUnit}
        onSubmit={handleLogSelected}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
