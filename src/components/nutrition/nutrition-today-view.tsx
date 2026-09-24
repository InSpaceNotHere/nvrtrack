"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteFoodEntryAction,
  updateCatalogFoodEntryAction,
  updateFoodEntryAction,
} from "@/app/(protected)/actions/nutrition-actions";
import { FoodPortionSheet, type PortionTarget, type PortionUnit } from "@/components/nutrition/food-portion-sheet";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Toast } from "@/components/ui/toast";
import type { FoodEntryRow } from "@/lib/data/auth-context";
import {
  calculateDailyTotals,
  calculateEntryTotals,
  calculateMealTotals,
  roundNutritionValue,
} from "@/lib/nutrition/calculations";
import { addDaysToDateString } from "@/lib/nutrition/date";
import { getFoodEntryDisplayName } from "@/lib/nutrition/food-display-name";
import { MEAL_LABELS, MEAL_ORDER } from "@/lib/nutrition/meals";
import { removeFoodEntryById, replaceFoodEntry } from "@/lib/nutrition/optimistic-entries";
import type { MealType } from "@/lib/nutrition/types";
import { formatCalendarDate } from "@/lib/timezone";
import type { SupportedAmountUnit } from "@/lib/nutrition/serving";

interface NutritionTodayViewProps {
  selectedDate: string;
  todayDate: string;
  dateWasFallback: boolean;
  entries: FoodEntryRow[];
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbohydrateGoal: number | null;
  fatGoal: number | null;
  dataErrorMessage?: string | null;
}

function isAmountBasedEntry(entry: FoodEntryRow): boolean {
  return entry.source_status === "usda_catalog" || entry.source_status === "usda_live";
}

function amountLabel(entry: FoodEntryRow): string {
  if (isAmountBasedEntry(entry)) {
    return `${roundNutritionValue(entry.amount_value ?? entry.serving_size, 1)} ${entry.amount_unit ?? entry.serving_unit}`;
  }
  const servings = roundNutritionValue(entry.servings, 2);
  return `${roundNutritionValue(entry.serving_size, 1)} ${entry.serving_unit} × ${servings}`;
}

export function NutritionTodayView({
  selectedDate,
  todayDate,
  dateWasFallback,
  entries,
  calorieGoal,
  proteinGoal,
  carbohydrateGoal,
  fatGoal,
  dataErrorMessage,
}: NutritionTodayViewProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [editingEntry, setEditingEntry] = useState<FoodEntryRow | null>(null);
  const [amountValue, setAmountValue] = useState("100");
  const [amountUnit, setAmountUnit] = useState<PortionUnit>("g");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [localEntries, setLocalEntries] = useState(entries);

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const previousDate = addDaysToDateString(selectedDate, -1);
  const nextDate = addDaysToDateString(selectedDate, 1);
  const dailyTotals = useMemo(() => calculateDailyTotals(localEntries), [localEntries]);
  const mealTotals = useMemo(() => calculateMealTotals(localEntries), [localEntries]);
  const groupedEntries = useMemo(() => {
    const map: Record<MealType, FoodEntryRow[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const entry of localEntries) {
      if (entry.meal_type === "breakfast" || entry.meal_type === "lunch" || entry.meal_type === "dinner" || entry.meal_type === "snack") {
        map[entry.meal_type].push(entry);
      }
    }
    return map;
  }, [localEntries]);

  const dateTitle = selectedDate === todayDate ? "Today" : formatCalendarDate(selectedDate);

  function startEdit(entry: FoodEntryRow) {
    setEditingEntry(entry);
    setErrorMessage(null);
    if (isAmountBasedEntry(entry)) {
      setAmountValue(String(entry.amount_value ?? entry.serving_size));
      setAmountUnit((entry.amount_unit as SupportedAmountUnit) || "g");
    } else {
      setAmountValue(String(entry.servings));
      setAmountUnit("servings");
    }
  }

  const editTarget: PortionTarget | null = editingEntry
    ? {
        kind: "entry",
        entry: editingEntry,
        name: getFoodEntryDisplayName(editingEntry),
        amountBased: isAmountBasedEntry(editingEntry),
      }
    : null;

  function handleSaveEdit() {
    if (!editingEntry) {
      return;
    }
    const current = editingEntry;
    setEditingEntry(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result =
        isAmountBasedEntry(current) && amountUnit !== "servings"
          ? await updateCatalogFoodEntryAction(current.id, {
              amount_value: amountValue,
              amount_unit: amountUnit,
              entry_date: current.entry_date,
              meal_type: current.meal_type,
              note: current.note ?? undefined,
            })
          : await updateFoodEntryAction(current.id, {
              entry_date: current.entry_date,
              meal_type: current.meal_type,
              servings: amountValue,
              note: current.note ?? undefined,
            });
      if (result.status === "error") {
        setEditingEntry(current);
        setErrorMessage(result.message);
        setMessageTone("error");
        setMessage(result.message);
        return;
      }
      if (result.entry) {
        setLocalEntries((rows) => replaceFoodEntry(rows, result.entry as FoodEntryRow));
      }
      setMessageTone("success");
      setMessage("Food entry updated.");
    });
  }

  function handleDelete(entryId: string) {
    const previous = localEntries;
    setLocalEntries((rows) => removeFoodEntryById(rows, entryId));
    setDeleteConfirmId(null);
    setEditingEntry(null);
    startTransition(async () => {
      const result = await deleteFoodEntryAction(entryId);
      if (result.status === "error") {
        setLocalEntries(previous);
        setMessageTone("error");
        setMessage(result.message);
        return;
      }
      setMessageTone("success");
      setMessage("Food entry deleted.");
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="sr-only">Nutrition</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Nutrition</p>
          <p className="text-2xl font-semibold tracking-tight text-white">{dateTitle}</p>
          {dateWasFallback ? <p className="mt-0.5 text-[11px] text-zinc-500">Invalid date reset to today.</p> : null}
        </div>
        <div className="flex gap-1">
          <Link
            href={`/nutrition?date=${previousDate}`}
            scroll={false}
            className="ds-press inline-flex h-10 min-w-10 items-center justify-center rounded-xl text-zinc-200 hover:bg-white/8"
            aria-label="Previous day"
          >
            ‹
          </Link>
          {selectedDate !== todayDate ? (
            <Link
              href={`/nutrition?date=${todayDate}`}
              scroll={false}
              className="ds-press inline-flex h-10 items-center justify-center rounded-xl px-2 text-xs font-medium text-zinc-200 hover:bg-white/8"
            >
              Today
            </Link>
          ) : null}
          <Link
            href={`/nutrition?date=${nextDate}`}
            scroll={false}
            className="ds-press inline-flex h-10 min-w-10 items-center justify-center rounded-xl text-zinc-200 hover:bg-white/8"
            aria-label="Next day"
          >
            ›
          </Link>
        </div>
      </header>

      {dataErrorMessage ? (
        <Toast tone="error" role="alert">
          {dataErrorMessage}
        </Toast>
      ) : null}

      <section className="rounded-3xl bg-gradient-to-b from-[#121a2c] to-[#0b0f18] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Calories</p>
        <p className="mt-1 text-[1.85rem] font-semibold leading-none tracking-tight text-white">
          {roundNutritionValue(dailyTotals.calories, 0).toLocaleString()}
          <span className="ml-1 text-sm font-medium text-zinc-500">
            / {calorieGoal !== null ? calorieGoal.toLocaleString() : "—"} kcal
          </span>
        </p>
        <div className="mt-2.5">
          {calorieGoal !== null && calorieGoal > 0 ? (
            <ProgressBar value={dailyTotals.calories} max={calorieGoal} compact />
          ) : (
            <div className="h-1.5 w-full rounded-full bg-white/8" />
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Protein", consumed: dailyTotals.protein_g, goal: proteinGoal },
            { label: "Carbs", consumed: dailyTotals.carbohydrate_g, goal: carbohydrateGoal },
            { label: "Fat", consumed: dailyTotals.fat_g, goal: fatGoal },
          ].map((macro) => (
            <div key={macro.label}>
              <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">{macro.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                {roundNutritionValue(macro.consumed, 0)}
                <span className="font-medium text-zinc-500"> / {macro.goal ?? "—"}g</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {MEAL_ORDER.map((meal) => {
          const mealEntries = groupedEntries[meal];
          const mealTotal = mealTotals[meal];
          return (
            <section key={meal}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-white">{MEAL_LABELS[meal]}</h2>
                <p className="text-xs text-zinc-500">{roundNutritionValue(mealTotal.calories, 0)} kcal</p>
              </div>
              <ul className="space-y-0.5">
                {mealEntries.map((entry) => {
                  const totals = calculateEntryTotals(entry);
                  const name = getFoodEntryDisplayName(entry);
                  return (
                    <li key={entry.id} className="rounded-xl px-1 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => startEdit(entry)} className="ds-press min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-white">{name}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {amountLabel(entry)}
                            <span className="text-zinc-700"> · </span>
                            {roundNutritionValue(totals.protein_g, 0)}P {roundNutritionValue(totals.carbohydrate_g, 0)}C{" "}
                            {roundNutritionValue(totals.fat_g, 0)}F
                          </p>
                        </button>
                        <p className="shrink-0 text-sm font-semibold text-zinc-100">
                          {roundNutritionValue(totals.calories, 0)}
                        </p>
                      </div>
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="text-[11px] text-zinc-600 hover:text-zinc-300"
                          aria-label={`Edit entry ${name}`}
                        >
                          Edit
                        </button>
                        {deleteConfirmId === entry.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              disabled={isPending}
                              className="text-[11px] text-rose-300 hover:text-rose-200"
                              aria-label={`Confirm delete ${name}`}
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[11px] text-zinc-600"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="text-[11px] text-zinc-700 hover:text-rose-200"
                            aria-label={`Delete entry ${name}`}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/nutrition/add?meal=${meal}&date=${selectedDate}`}
                className="ds-press mt-1 inline-flex h-10 items-center text-sm font-medium text-[#9db4ff]"
                aria-label={`Add Food to ${MEAL_LABELS[meal]}`}
              >
                + Add food
              </Link>
            </section>
          );
        })}
      </div>

      {!localEntries.length ? (
        <p className="text-sm text-zinc-500">No food entries logged for this date.</p>
      ) : null}

      <div className="pt-2">
        <Link href="/nutrition/foods" className="text-xs text-zinc-500 hover:text-zinc-300">
          Manage saved foods
        </Link>
      </div>

      {message ? <Toast tone={messageTone === "error" ? "error" : "success"}>{message}</Toast> : null}

      <FoodPortionSheet
        open={editTarget !== null}
        target={editTarget}
        amountValue={amountValue}
        amountUnit={amountUnit}
        mealLabel={editingEntry ? MEAL_LABELS[editingEntry.meal_type as MealType] ?? "Meal" : ""}
        pending={isPending}
        errorMessage={errorMessage}
        submitLabel="Save Entry"
        onAmountChange={setAmountValue}
        onUnitChange={setAmountUnit}
        onSubmit={handleSaveEdit}
        onClose={() => setEditingEntry(null)}
      />
    </div>
  );
}
