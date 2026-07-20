"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { saveProfileAction } from "@/app/(protected)/actions/profile-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card } from "@/components/ui/card";
import {
  formatHeightFeetInches,
  normalizeProfileInput,
  type FieldErrors,
  type ProfileFormField,
  type ProfileFormValues,
} from "@/lib/profile/validation";

interface ProfileSettingsFormProps {
  initialValues: ProfileFormValues;
}

export function ProfileSettingsForm({ initialValues }: ProfileSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [savedValues, setSavedValues] = useState<ProfileFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const hasUnsavedChanges = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [savedValues, values]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasUnsavedChanges]);

  const parsedHeight = Number(values.heightInches);
  const heightHelper =
    values.preferredWeightUnit === "lb" && Number.isInteger(parsedHeight) && parsedHeight > 0
      ? formatHeightFeetInches(parsedHeight)
      : null;

  function updateField(field: ProfileFormField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const localValidation = normalizeProfileInput(values);
    if (!localValidation.data) {
      setFieldErrors(localValidation.fieldErrors);
      setMessage("Please fix the highlighted fields.");
      setMessageTone("error");
      return;
    }

    startTransition(async () => {
      const result = await saveProfileAction(values);
      setFieldErrors(result.fieldErrors);
      setMessage(result.message);
      setMessageTone(result.status === "success" ? "success" : "error");

      if (result.status === "success") {
        setValues(result.values);
        setSavedValues(result.values);
      }
    });
  }

  return (
    <form className="mx-auto max-w-xl space-y-3.5" aria-label="Profile settings form" onSubmit={handleSubmit}>
      <Card title="Account">
        <div className="space-y-3">
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Display name</span>
            <input
              type="text"
              name="displayName"
              value={values.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
              className="app-input"
              autoComplete="name"
              maxLength={60}
            />
            {fieldErrors.displayName ? <p className="text-xs text-rose-300">{fieldErrors.displayName}</p> : null}
          </label>
        </div>

        <div className="mt-4 border-t border-white/8 pt-3">
          <p className="mb-2 text-xs uppercase tracking-[0.08em] text-zinc-500">Session</p>
          <LogoutButton />
        </div>
      </Card>

      <Card title="Body Information">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Height (total inches)</span>
            <input
              type="number"
              name="heightInches"
              value={values.heightInches}
              onChange={(event) => updateField("heightInches", event.target.value)}
              className="app-input"
              min={36}
              max={96}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
            {heightHelper ? <p className="text-xs text-zinc-500">{heightHelper}</p> : null}
            {fieldErrors.heightInches ? <p className="text-xs text-rose-300">{fieldErrors.heightInches}</p> : null}
          </label>

          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Preferred weight unit</span>
            <select
              name="preferredWeightUnit"
              value={values.preferredWeightUnit}
              onChange={(event) => updateField("preferredWeightUnit", event.target.value)}
              className="app-input"
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
            {fieldErrors.preferredWeightUnit ? (
              <p className="text-xs text-rose-300">{fieldErrors.preferredWeightUnit}</p>
            ) : null}
          </label>
        </div>
      </Card>

      <Card title="Nutrition Goals">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Calorie goal</span>
            <input
              type="number"
              name="calorieGoal"
              value={values.calorieGoal}
              onChange={(event) => updateField("calorieGoal", event.target.value)}
              className="app-input"
              min={0}
              max={10000}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
            {fieldErrors.calorieGoal ? <p className="text-xs text-rose-300">{fieldErrors.calorieGoal}</p> : null}
          </label>
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Protein goal (g)</span>
            <input
              type="number"
              name="proteinGoal"
              value={values.proteinGoal}
              onChange={(event) => updateField("proteinGoal", event.target.value)}
              className="app-input"
              min={0}
              max={1000}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
            {fieldErrors.proteinGoal ? <p className="text-xs text-rose-300">{fieldErrors.proteinGoal}</p> : null}
          </label>
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Carbohydrate goal (g)</span>
            <input
              type="number"
              name="carbohydrateGoal"
              value={values.carbohydrateGoal}
              onChange={(event) => updateField("carbohydrateGoal", event.target.value)}
              className="app-input"
              min={0}
              max={1000}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
            {fieldErrors.carbohydrateGoal ? (
              <p className="text-xs text-rose-300">{fieldErrors.carbohydrateGoal}</p>
            ) : null}
          </label>
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Fat goal (g)</span>
            <input
              type="number"
              name="fatGoal"
              value={values.fatGoal}
              onChange={(event) => updateField("fatGoal", event.target.value)}
              className="app-input"
              min={0}
              max={1000}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
            {fieldErrors.fatGoal ? <p className="text-xs text-rose-300">{fieldErrors.fatGoal}</p> : null}
          </label>
        </div>
      </Card>

      {hasUnsavedChanges ? <p className="text-xs text-zinc-500">You have unsaved changes.</p> : null}

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

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
