"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createSavedFoodAction,
  updateSavedFoodAction,
  type SavedFoodFormErrors,
} from "@/app/(protected)/actions/nutrition-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";
import { normalizeSavedFoodInput } from "@/lib/nutrition/validation";

const UNIT_PRESETS = ["serving", "g", "oz"] as const;

interface CustomFoodFormProps {
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
  onSaved: (foodId: string) => void;
}

export function CustomFoodForm({ mode, foodId, initial, cancelHref, onSaved }: CustomFoodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand);
  const [servingSize, setServingSize] = useState(initial.serving_size);
  const [servingUnit, setServingUnit] = useState(initial.serving_unit || "serving");
  const [calories, setCalories] = useState(initial.calories);
  const [protein, setProtein] = useState(initial.protein_g);
  const [carbs, setCarbs] = useState(initial.carbohydrate_g);
  const [fat, setFat] = useState(initial.fat_g);
  const [errors, setErrors] = useState<SavedFoodFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const title = mode === "create" ? "Create Custom Food" : "Edit Custom Food";
  const submitLabel = mode === "create" ? "Save Food" : "Save Changes";

  function payload() {
    return {
      name,
      brand,
      serving_size: servingSize,
      serving_unit: servingUnit,
      calories,
      protein_g: protein,
      carbohydrate_g: carbs,
      fat_g: fat,
      fiber_g: initial.fiber_g || "",
    };
  }

  function handleSubmit() {
    const next = payload();
    const local = normalizeSavedFoodInput(next);
    if (!local.data) {
      setErrors(local.errors);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && foodId
          ? await updateSavedFoodAction(foodId, next)
          : await createSavedFoodAction(next);
      if (result.status === "error") {
        setErrors(result.errors);
        setFormError(result.message);
        return;
      }
      if (!result.food) {
        setFormError("Couldn't save this food.");
        return;
      }
      router.refresh();
      onSaved(result.food.id);
    });
  }

  return (
    <div className="flex h-[calc(100svh-5rem)] flex-col">
      <header className="flex items-center gap-3 pb-2">
        <Link
          href={cancelHref}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl text-sm font-medium text-zinc-200 hover:bg-white/8"
        >
          Back
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">From the label</p>
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Food</h2>
          <Field label="Name" error={errors.name}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Name"
              aria-invalid={Boolean(errors.name)}
              autoComplete="off"
              placeholder="Greek yogurt"
              className="h-11 rounded-2xl"
            />
          </Field>
          <Field label="Brand" optional error={errors.brand}>
            <Input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              aria-label="Brand"
              autoComplete="off"
              placeholder="Optional"
              className="h-11 rounded-2xl"
            />
          </Field>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Serving</h2>
          <div className="grid grid-cols-[1fr_1.1fr] gap-2">
            <Field label="Amount" error={errors.serving_size}>
              <Input
                value={servingSize}
                onChange={(event) => setServingSize(event.target.value)}
                aria-label="Serving amount"
                aria-invalid={Boolean(errors.serving_size)}
                inputMode="decimal"
                className="h-11 rounded-2xl"
              />
            </Field>
            <Field label="Unit" error={errors.serving_unit}>
              <Input
                value={servingUnit}
                onChange={(event) => setServingUnit(event.target.value)}
                aria-label="Serving unit"
                aria-invalid={Boolean(errors.serving_unit)}
                className="h-11 rounded-2xl"
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common units">
            {UNIT_PRESETS.map((unit) => {
              const active = servingUnit.trim().toLowerCase() === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setServingUnit(unit)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px]",
                    active ? "bg-white/12 text-white" : "bg-white/[0.04] text-zinc-400 hover:bg-white/8 hover:text-zinc-200",
                  )}
                >
                  {unit}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-600">Examples: 1 serving, 30 g, 1 oz</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Per serving</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Calories" error={errors.calories}>
              <Input
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                aria-label="Calories"
                aria-invalid={Boolean(errors.calories)}
                inputMode="decimal"
                className="h-11 rounded-2xl"
              />
            </Field>
            <Field label="Protein (g)" error={errors.protein_g}>
              <Input
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                aria-label="Protein"
                aria-invalid={Boolean(errors.protein_g)}
                inputMode="decimal"
                className="h-11 rounded-2xl"
              />
            </Field>
            <Field label="Carbs (g)" error={errors.carbohydrate_g}>
              <Input
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                aria-label="Carbs"
                aria-invalid={Boolean(errors.carbohydrate_g)}
                inputMode="decimal"
                className="h-11 rounded-2xl"
              />
            </Field>
            <Field label="Fat (g)" error={errors.fat_g}>
              <Input
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                aria-label="Fat"
                aria-invalid={Boolean(errors.fat_g)}
                inputMode="decimal"
                className="h-11 rounded-2xl"
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="border-t border-white/8 bg-[var(--ds-color-bg-base)] pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {formError ? (
          <p className="mb-2 text-sm text-rose-300" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          type="button"
          variant="primary"
          className="h-12 w-full rounded-2xl"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm text-zinc-300">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {optional ? <span className="text-[11px] text-zinc-600">Optional</span> : null}
      </span>
      {children}
      {error ? (
        <p className="text-xs text-rose-300" role="alert" data-custom-food-error="">
          {error}
        </p>
      ) : null}
    </label>
  );
}
