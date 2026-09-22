"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/input";
import { roundNutritionValue } from "@/lib/nutrition/calculations";
import {
  calculateCatalogEntrySnapshot,
  getCatalogSourceServingDefinition,
  recalculateCatalogEntryFromSnapshot,
} from "@/lib/nutrition/catalog-entry";
import type { FoodCatalogRow, FoodEntryRow, FoodRow } from "@/lib/data/auth-context";
import type { SupportedAmountUnit } from "@/lib/nutrition/serving";

export type PortionUnit = SupportedAmountUnit | "servings";

export type PortionTarget =
  | { kind: "catalog"; food: FoodCatalogRow; name: string }
  | { kind: "saved"; food: FoodRow; name: string }
  | { kind: "entry"; entry: FoodEntryRow; name: string; amountBased: boolean };

interface FoodPortionSheetProps {
  open: boolean;
  target: PortionTarget | null;
  amountValue: string;
  amountUnit: PortionUnit;
  mealLabel: string;
  pending?: boolean;
  errorMessage?: string | null;
  submitLabel: string;
  onAmountChange: (value: string) => void;
  onUnitChange: (unit: PortionUnit) => void;
  onSubmit: () => void;
  onClose: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
}

function previewFromTarget(
  target: PortionTarget,
  amountValue: string,
  amountUnit: PortionUnit,
): { calories: number; protein_g: number; carbohydrate_g: number; fat_g: number } | null {
  const parsed = Number(amountValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  if (target.kind === "catalog" && amountUnit !== "servings") {
    try {
      const snapshot = calculateCatalogEntrySnapshot(target.food, {
        amountValue: parsed,
        amountUnit,
      });
      return {
        calories: snapshot.calories_per_serving,
        protein_g: snapshot.protein_per_serving_g,
        carbohydrate_g: snapshot.carbohydrate_per_serving_g,
        fat_g: snapshot.fat_per_serving_g,
      };
    } catch {
      return null;
    }
  }

  if (target.kind === "saved") {
    return {
      calories: target.food.calories * parsed,
      protein_g: target.food.protein_g * parsed,
      carbohydrate_g: target.food.carbohydrate_g * parsed,
      fat_g: target.food.fat_g * parsed,
    };
  }

  if (target.kind === "entry" && target.amountBased && amountUnit !== "servings") {
    try {
      const snapshot = recalculateCatalogEntryFromSnapshot(target.entry, {
        amountValue: parsed,
        amountUnit,
      });
      return {
        calories: snapshot.calories_per_serving,
        protein_g: snapshot.protein_per_serving_g,
        carbohydrate_g: snapshot.carbohydrate_per_serving_g,
        fat_g: snapshot.fat_per_serving_g,
      };
    } catch {
      return null;
    }
  }

  if (target.kind === "entry") {
    return {
      calories: target.entry.calories_per_serving * parsed,
      protein_g: target.entry.protein_per_serving_g * parsed,
      carbohydrate_g: target.entry.carbohydrate_per_serving_g * parsed,
      fat_g: target.entry.fat_per_serving_g * parsed,
    };
  }

  return null;
}

function availableUnits(target: PortionTarget | null): Array<{ value: PortionUnit; label: string }> {
  if (!target) {
    return [{ value: "g", label: "g" }];
  }
  if (target.kind === "catalog") {
    const units: Array<{ value: PortionUnit; label: string }> = [
      { value: "g", label: "g" },
      { value: "oz", label: "oz" },
    ];
    if (getCatalogSourceServingDefinition(target.food)) {
      units.push({ value: "source_serving", label: "serving" });
    }
    return units;
  }
  if (target.kind === "entry" && target.amountBased) {
    const units: Array<{ value: PortionUnit; label: string }> = [
      { value: "g", label: "g" },
      { value: "oz", label: "oz" },
    ];
    if (target.entry.source_serving_weight_grams && target.entry.source_serving_weight_grams > 0) {
      units.push({ value: "source_serving", label: "serving" });
    }
    return units;
  }
  if (target.kind === "saved") {
    return [{ value: "servings", label: target.food.serving_unit || "serving" }];
  }
  return [{ value: "servings", label: target.entry.serving_unit || "serving" }];
}

export function FoodPortionSheet({
  open,
  target,
  amountValue,
  amountUnit,
  mealLabel,
  pending = false,
  errorMessage,
  submitLabel,
  onAmountChange,
  onUnitChange,
  onSubmit,
  onClose,
  onDelete,
  deletePending = false,
}: FoodPortionSheetProps) {
  const units = availableUnits(target);
  const preview = useMemo(
    () => (target ? previewFromTarget(target, amountValue, amountUnit) : null),
    [amountUnit, amountValue, target],
  );

  if (!open || !target) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close portion" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={target.name}
        className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0c1018] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--ds-shadow-lg)] sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">{target.name}</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white" aria-label="Close">
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Amount</span>
            <Input
              inputMode="decimal"
              value={amountValue}
              onChange={(event) => onAmountChange(event.target.value)}
              className="h-12 text-lg"
            />
          </label>
          <div role="radiogroup" aria-label="Unit" className="flex gap-1 rounded-xl bg-black/40 p-1">
            {units.map((unit) => (
              <button
                key={unit.value}
                type="button"
                role="radio"
                aria-checked={amountUnit === unit.value}
                onClick={() => onUnitChange(unit.value)}
                className={cn(
                  "min-h-10 rounded-lg px-3 text-sm font-medium",
                  amountUnit === unit.value ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10",
                )}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-black/30 px-3 py-3">
          {preview ? (
            <>
              <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
                {roundNutritionValue(preview.calories, 0)}{" "}
                <span className="text-base font-medium text-zinc-400">kcal</span>
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {roundNutritionValue(preview.protein_g, 1)}g Protein
                <span className="text-zinc-600"> · </span>
                {roundNutritionValue(preview.carbohydrate_g, 1)}g Carbs
                <span className="text-zinc-600"> · </span>
                {roundNutritionValue(preview.fat_g, 1)}g Fat
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Enter an amount to see calories and macros.</p>
          )}
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}

        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="primary" className="h-12 w-full rounded-2xl text-sm" disabled={pending} onClick={onSubmit}>
            {pending ? "Saving..." : submitLabel}
          </Button>
          {onDelete ? (
            <Button type="button" variant="danger" className="h-11 w-full rounded-2xl text-sm" disabled={deletePending} onClick={onDelete}>
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
