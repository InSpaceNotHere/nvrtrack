"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveProfileAction } from "@/app/(protected)/actions/profile-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
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
  const browserTimeZone = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC";
  const hydratedInitialValues: ProfileFormValues = {
    ...initialValues,
    timezone: initialValues.timezone || browserTimeZone,
  };
  const [values, setValues] = useState<ProfileFormValues>(hydratedInitialValues);
  const [savedValues, setSavedValues] = useState<ProfileFormValues>(hydratedInitialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const autoTimezoneSyncAttemptedRef = useRef(false);

  const hasUnsavedChanges = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [savedValues, values]);

  useEffect(() => {
    if (autoTimezoneSyncAttemptedRef.current) {
      return;
    }
    const currentBrowserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    autoTimezoneSyncAttemptedRef.current = true;
    if (savedValues.timezone === browserTimeZone) {
      return;
    }
    if (savedValues.timezone && savedValues.timezone !== "UTC") {
      return;
    }

    startTransition(async () => {
      const result = await saveProfileAction({
        ...savedValues,
        timezone: currentBrowserTimeZone,
      });
      if (result.status === "success") {
        setValues(result.values);
        setSavedValues(result.values);
      }
    });
  }, [savedValues, startTransition, browserTimeZone]);

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
            <Input
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
            <Input
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
            <Select
              name="preferredWeightUnit"
              value={values.preferredWeightUnit}
              onChange={(event) => updateField("preferredWeightUnit", event.target.value)}
              className="app-input"
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </Select>
            {fieldErrors.preferredWeightUnit ? (
              <p className="text-xs text-rose-300">{fieldErrors.preferredWeightUnit}</p>
            ) : null}
          </label>
          <label className="space-y-1.5 text-sm text-zinc-300 sm:col-span-2">
            <span>Timezone</span>
            <div className="flex gap-2">
              <Input
                type="text"
                name="timezone"
                value={values.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                className="app-input"
                autoComplete="off"
                placeholder="UTC"
              />
              <Button
                type="button"
                onClick={() => updateField("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}
                variant="secondary"
                className="h-10 rounded-xl px-3 text-xs"
              >
                Use Browser Timezone
              </Button>
            </div>
            {fieldErrors.timezone ? <p className="text-xs text-rose-300">{fieldErrors.timezone}</p> : null}
          </label>
        </div>
      </Card>

      <Card title="Nutrition Goals">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Calorie goal</span>
            <Input
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
            <Input
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
            <Input
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
            <Input
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

      {message ? <Toast tone={messageTone === "error" ? "error" : "success"} role={messageTone === "error" ? "alert" : "status"}>{message}</Toast> : null}

      <Button
        type="submit"
        disabled={isPending}
        variant="primary"
        className="h-10 w-full rounded-xl px-4 text-sm"
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
