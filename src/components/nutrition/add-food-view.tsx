"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCatalogFoodEntryAction,
  createFoodEntryAction,
} from "@/app/(protected)/actions/nutrition-actions";
import { toggleNutritionFoodFavoriteAction } from "@/app/(protected)/actions/nutrition-favorites-actions";
import { FoodPortionSheet, type PortionTarget, type PortionUnit } from "@/components/nutrition/food-portion-sheet";
import { FoodResultRow } from "@/components/nutrition/food-result-row";
import { PersonalFoodRail } from "@/components/nutrition/personal-food-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import type { FoodCatalogRow, FoodRow } from "@/lib/data/auth-context";
import { formatVariantChipLabel, rankCatalogFoodGroups, type CatalogFoodGroup } from "@/lib/nutrition/catalog-groups";
import { normalizeCatalogSearchText } from "@/lib/nutrition/catalog-search";
import { getCatalogDisplayName, getEntryPresentationName, perHundredGramMacros } from "@/lib/nutrition/food-display-name";
import { getPersonalFoodIdentity, type LogicalFoodIdentity } from "@/lib/nutrition/food-identity";
import { sanitizeFavoritesUserMessage } from "@/lib/nutrition/user-facing-copy";
import { MEAL_LABELS } from "@/lib/nutrition/meals";
import { personalItemFromCatalog, personalItemFromSaved, type PersonalFoodItem } from "@/lib/nutrition/personal-foods";
import type { MealType } from "@/lib/nutrition/types";

type AddFoodTab = "common" | "mine" | "custom";

interface AddFoodViewProps {
  mealType: MealType;
  entryDate: string;
  catalogFoods: FoodCatalogRow[];
  foods: FoodRow[];
  recentFoods: PersonalFoodItem[];
  frequentFoods: PersonalFoodItem[];
  favoriteFoods: PersonalFoodItem[];
  favoriteIdentities: LogicalFoodIdentity[];
  favoritesEnabled?: boolean;
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

function identityPayload(identity: LogicalFoodIdentity) {
  return {
    identity_type: identity.type,
    catalog_food_id: identity.catalogFoodId,
    food_id: identity.foodId,
    snapshot_key: identity.snapshotKey,
  };
}

function CatalogGroupResult({
  group,
  selectedFoodId,
  favorited,
  onSelectVariant,
  onOpen,
  onToggleFavorite,
}: {
  group: CatalogFoodGroup;
  selectedFoodId: string | null;
  favorited: boolean;
  onSelectVariant: (foodId: string) => void;
  onOpen: (food: FoodCatalogRow) => void;
  onToggleFavorite?: (food: FoodCatalogRow) => void;
}) {
  const selected = group.variants.find((variant) => variant.food.id === selectedFoodId) ?? group.preferred;
  const macros = perHundredGramMacros(selected.food);
  const showVariants = group.variants.length > 1;
  const isSelected = selectedFoodId !== null && group.variants.some((variant) => variant.food.id === selectedFoodId);

  return (
    <FoodResultRow
      name={group.name}
      calories={macros.calories}
      protein_g={macros.protein_g}
      carbohydrate_g={macros.carbohydrate_g}
      fat_g={macros.fat_g}
      basis="100 g"
      selected={isSelected}
      favorited={favorited}
      onSelect={() => onOpen(selected.food)}
      onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(selected.food) : undefined}
      footer={
        showVariants ? (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">Other versions</span>
            {group.variants.map((variant) => {
              const active = variant.food.id === selected.food.id;
              return (
                <button
                  key={variant.food.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectVariant(variant.food.id)}
                  className={
                    active
                      ? "rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white"
                      : "rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/8 hover:text-zinc-200"
                  }
                >
                  {formatVariantChipLabel(variant.variantLabel)}
                </button>
              );
            })}
          </div>
        ) : null
      }
    />
  );
}

export function AddFoodView({
  mealType,
  entryDate,
  catalogFoods,
  foods,
  recentFoods,
  frequentFoods,
  favoriteFoods,
  favoriteIdentities,
  favoritesEnabled = false,
  loadErrorMessage,
}: AddFoodViewProps) {
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
  const [variantByGroup, setVariantByGroup] = useState<Record<string, string>>({});
  const [favoriteKeys, setFavoriteKeys] = useState(() => new Set(favoriteIdentities.map((identity) => identity.key)));
  const [favoriteItems, setFavoriteItems] = useState(favoriteFoods);

  const mealLabel = MEAL_LABELS[mealType];
  const searching = query.trim().length > 0;

  const rankedGroups = useMemo(
    () => rankCatalogFoodGroups(catalogFoods, query, { limit: searching ? 40 : 80 }),
    [catalogFoods, query, searching],
  );

  const savedMatches = useMemo(() => searchSavedFoods(foods, query), [foods, query]);

  function openCatalog(food: FoodCatalogRow) {
    setErrorMessage(null);
    setTarget({
      kind: "catalog",
      food,
      name: getEntryPresentationName(getCatalogDisplayName(food)),
    });
    setAmountValue("100");
    setAmountUnit("g");
  }

  function openSaved(food: FoodRow) {
    setErrorMessage(null);
    setTarget({ kind: "saved", food, name: food.name });
    setAmountValue("1");
    setAmountUnit("servings");
  }

  function openPersonal(item: PersonalFoodItem) {
    if (item.catalogFood) {
      openCatalog(item.catalogFood);
      return;
    }
    if (item.savedFood) {
      openSaved(item.savedFood);
      return;
    }
    if (item.snapshotEntry) {
      setErrorMessage(null);
      setTarget({
        kind: "entry",
        entry: item.snapshotEntry,
        name: item.name,
        amountBased: false,
      });
      setAmountValue("1");
      setAmountUnit("servings");
    }
  }

  function targetIdentity(): LogicalFoodIdentity | null {
    if (!target) {
      return null;
    }
    if (target.kind === "catalog") {
      return getPersonalFoodIdentity({ catalog_food_id: target.food.id, fdc_id: target.food.fdc_id });
    }
    if (target.kind === "saved") {
      return getPersonalFoodIdentity({ food_id: target.food.id });
    }
    return getPersonalFoodIdentity(target.entry);
  }

  function toggleFavorite(identity: LogicalFoodIdentity, item?: PersonalFoodItem) {
    if (!favoritesEnabled) {
      return;
    }
    const nextFavorited = !favoriteKeys.has(identity.key);
    setFavoriteKeys((current) => {
      const next = new Set(current);
      if (nextFavorited) {
        next.add(identity.key);
      } else {
        next.delete(identity.key);
      }
      return next;
    });
    if (item) {
      setFavoriteItems((current) => {
        if (nextFavorited) {
          if (current.some((existing) => existing.identity.key === identity.key)) {
            return current;
          }
          return [item, ...current];
        }
        return current.filter((existing) => existing.identity.key !== identity.key);
      });
    } else if (!nextFavorited) {
      setFavoriteItems((current) => current.filter((existing) => existing.identity.key !== identity.key));
    }
    startTransition(async () => {
      const result = await toggleNutritionFoodFavoriteAction(identityPayload(identity), nextFavorited);
      if (result.status === "error") {
        setFavoriteKeys((current) => {
          const next = new Set(current);
          if (nextFavorited) {
            next.delete(identity.key);
          } else {
            next.add(identity.key);
          }
          return next;
        });
        if (item || !nextFavorited) {
          setFavoriteItems((current) => {
            if (nextFavorited) {
              return current.filter((existing) => existing.identity.key !== identity.key);
            }
            if (item && !current.some((existing) => existing.identity.key === identity.key)) {
              return [item, ...current];
            }
            return current;
          });
        }
        setMessage(sanitizeFavoritesUserMessage(result.message));
      }
    });
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
        return;
      }

      const result = await createFoodEntryAction({
        mode: "custom",
        entry_date: entryDate,
        meal_type: mealType,
        servings: amountValue,
        food_name: target.entry.food_name,
        brand_name: target.entry.brand_name ?? undefined,
        serving_size: String(target.entry.serving_size),
        serving_unit: target.entry.serving_unit,
        calories_per_serving: String(target.entry.calories_per_serving),
        protein_per_serving_g: String(target.entry.protein_per_serving_g),
        carbohydrate_per_serving_g: String(target.entry.carbohydrate_per_serving_g),
        fat_per_serving_g: String(target.entry.fat_per_serving_g),
      });
      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }
      router.push(`/nutrition?date=${entryDate}`);
      router.refresh();
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

  const currentTargetIdentity = targetIdentity();

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
        <>
          <PersonalFoodRail
            title="Recent"
            items={recentFoods}
            favoriteKeys={favoriteKeys}
            favoritesEnabled={favoritesEnabled}
            onSelect={openPersonal}
            onToggleFavorite={(item) => toggleFavorite(item.identity, item)}
          />
          <PersonalFoodRail
            title="Frequent"
            items={frequentFoods}
            favoriteKeys={favoriteKeys}
            favoritesEnabled={favoritesEnabled}
            onSelect={openPersonal}
            onToggleFavorite={(item) => toggleFavorite(item.identity, item)}
          />
          {favoritesEnabled ? (
            <PersonalFoodRail
              title="Favorites"
              items={favoriteItems.filter((item) => favoriteKeys.has(item.identity.key))}
              favoriteKeys={favoriteKeys}
              favoritesEnabled={favoritesEnabled}
              onSelect={openPersonal}
              onToggleFavorite={(item) => toggleFavorite(item.identity, item)}
            />
          ) : null}
          <Tabs value={tab} options={tabOptions} onChange={setTab} ariaLabel="Food source" />
        </>
      ) : null}

      {searching || tab === "common" ? (
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {searching ? "Results" : "Common"}
          </h2>
          <div>
            {rankedGroups.map((group) => {
              const selectedId = variantByGroup[group.key] ?? group.preferred.food.id;
              const selectedFood = group.variants.find((variant) => variant.food.id === selectedId)?.food ?? group.preferred.food;
              const identity = getPersonalFoodIdentity({ catalog_food_id: selectedFood.id, fdc_id: selectedFood.fdc_id });
              return (
                <CatalogGroupResult
                  key={group.key}
                  group={group}
                  selectedFoodId={variantByGroup[group.key] ?? (target?.kind === "catalog" ? target.food.id : null)}
                  favorited={favoriteKeys.has(identity.key)}
                  onSelectVariant={(foodId) => setVariantByGroup((current) => ({ ...current, [group.key]: foodId }))}
                  onOpen={openCatalog}
                  onToggleFavorite={
                    favoritesEnabled
                      ? (food) =>
                          toggleFavorite(
                            getPersonalFoodIdentity({ catalog_food_id: food.id, fdc_id: food.fdc_id }),
                            personalItemFromCatalog(food),
                          )
                      : undefined
                  }
                />
              );
            })}
            {rankedGroups.length === 0 ? <p className="px-1 py-4 text-sm text-zinc-500">No common foods match that search.</p> : null}
          </div>
        </section>
      ) : null}

      {searching ? (
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">My Foods</h2>
          <div>
            {savedMatches.map((food) => {
              const identity = getPersonalFoodIdentity({ food_id: food.id });
              return (
                <FoodResultRow
                  key={food.id}
                  name={food.name}
                  calories={food.calories}
                  protein_g={food.protein_g}
                  carbohydrate_g={food.carbohydrate_g}
                  fat_g={food.fat_g}
                  basis={`${food.serving_size} ${food.serving_unit}`}
                  selected={target?.kind === "saved" && target.food.id === food.id}
                  favorited={favoriteKeys.has(identity.key)}
                  onSelect={() => openSaved(food)}
                  onToggleFavorite={
                    favoritesEnabled ? () => toggleFavorite(identity, personalItemFromSaved(food)) : undefined
                  }
                />
              );
            })}
            {savedMatches.length === 0 ? <p className="px-1 py-4 text-sm text-zinc-500">No saved foods match.</p> : null}
          </div>
        </section>
      ) : null}

      {!searching && tab === "mine" ? (
        <section>
          <div>
            {foods.map((food) => {
              const identity = getPersonalFoodIdentity({ food_id: food.id });
              return (
                <FoodResultRow
                  key={food.id}
                  name={food.name}
                  calories={food.calories}
                  protein_g={food.protein_g}
                  carbohydrate_g={food.carbohydrate_g}
                  fat_g={food.fat_g}
                  basis={`${food.serving_size} ${food.serving_unit}`}
                  selected={target?.kind === "saved" && target.food.id === food.id}
                  favorited={favoriteKeys.has(identity.key)}
                  onSelect={() => openSaved(food)}
                  onToggleFavorite={
                    favoritesEnabled ? () => toggleFavorite(identity, personalItemFromSaved(food)) : undefined
                  }
                />
              );
            })}
            {foods.length === 0 ? (
              <p className="px-1 py-4 text-sm text-zinc-500">No custom foods yet. Use Custom to add one while logging.</p>
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
        favorited={currentTargetIdentity ? favoriteKeys.has(currentTargetIdentity.key) : false}
        onToggleFavorite={
          favoritesEnabled && currentTargetIdentity
            ? () => {
                if (target?.kind === "catalog") {
                  toggleFavorite(currentTargetIdentity, personalItemFromCatalog(target.food));
                  return;
                }
                if (target?.kind === "saved") {
                  toggleFavorite(currentTargetIdentity, personalItemFromSaved(target.food));
                  return;
                }
                toggleFavorite(currentTargetIdentity);
              }
            : undefined
        }
        onAmountChange={setAmountValue}
        onUnitChange={setAmountUnit}
        onSubmit={handleLogSelected}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
