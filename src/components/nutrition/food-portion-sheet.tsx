"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

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
  favorited?: boolean;
  onToggleFavorite?: () => void;
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
  pending = false,
  errorMessage,
  submitLabel,
  onAmountChange,
  onUnitChange,
  onSubmit,
  onClose,
  onDelete,
  deletePending = false,
  favorited = false,
  onToggleFavorite,
}: FoodPortionSheetProps) {
  const units = availableUnits(target);
  const preview = useMemo(
    () => (target ? previewFromTarget(target, amountValue, amountUnit) : null),
    [amountUnit, amountValue, target],
  );
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouch = body.style.touchAction;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const viewport = window.visualViewport;
    const syncKeyboard = () => {
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }
      const inset = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardInset(Math.max(0, inset));
    };
    syncKeyboard();
    viewport?.addEventListener("resize", syncKeyboard);
    viewport?.addEventListener("scroll", syncKeyboard);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouch;
      window.removeEventListener("keydown", onKeyDown);
      viewport?.removeEventListener("resize", syncKeyboard);
      viewport?.removeEventListener("scroll", syncKeyboard);
    };
  }, [open, onClose]);

  if (!open || !target) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close portion"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={target.name}
        className="relative flex max-h-[100svh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-white/12 bg-[#10151f] shadow-[0_-18px_50px_rgba(0,0,0,0.55)] sm:rounded-3xl"
        style={{ marginBottom: keyboardInset }}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-white/35" aria-hidden="true" />
        </div>
        <div className="flex items-start justify-between gap-3 px-4 pt-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">{target.name}</h2>
          <div className="flex items-center">
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={favorited ? `Remove ${target.name} from favorites` : `Add ${target.name} to favorites`}
                aria-pressed={favorited}
                className="flex h-10 min-w-10 items-center justify-center text-zinc-500 hover:text-zinc-200"
              >
                <Star className={cn("h-4 w-4", favorited ? "fill-amber-300 text-amber-300" : "fill-none")} aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="h-10 min-w-10 text-sm text-zinc-400 hover:text-white" aria-label="Close">
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="space-y-1 text-sm text-zinc-300">
              <span>Amount</span>
              <Input
                inputMode="decimal"
                value={amountValue}
                onChange={(event) => onAmountChange(event.target.value)}
                className="h-12 text-lg"
              />
            </label>
            <div role="radiogroup" aria-label="Unit" className="flex gap-1 rounded-xl bg-black/50 p-1">
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

          <div className="mt-4 rounded-2xl bg-black/35 px-3 py-3">
            {preview ? (
              <>
                <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
                  {roundNutritionValue(preview.calories, 0)}{" "}
                  <span className="text-base font-medium text-zinc-400">kcal</span>
                </p>
                <p className="mt-2 text-sm text-zinc-400">
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
        </div>

        <div className="sticky bottom-0 border-t border-white/8 bg-[#10151f] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="primary" className="h-12 w-full rounded-2xl text-sm" disabled={pending} onClick={onSubmit}>
            {pending ? "Saving..." : submitLabel}
          </Button>
          {onDelete ? (
            <Button type="button" variant="danger" className="mt-2 h-11 w-full rounded-2xl text-sm" disabled={deletePending} onClick={onDelete}>
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
