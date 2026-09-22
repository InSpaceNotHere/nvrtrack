"use client";

import { useState, useTransition } from "react";

import {
  saveTrainingPreferencesAction,
  type SaveTrainingPreferencesInput,
} from "@/app/(protected)/actions/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import {
  DESIRED_TRAINING_DAYS_OPTIONS,
  DISCOVERY_SOURCE_OPTIONS,
  HEIGHT_UNIT_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  type HeightUnitCode,
} from "@/lib/onboarding/constants";

interface TrainingPreferencesFormProps {
  initialValues: SaveTrainingPreferencesInput;
}

type FieldErrors = Partial<Record<keyof SaveTrainingPreferencesInput, string>>;

export function TrainingPreferencesForm({ initialValues }: TrainingPreferencesFormProps) {
  const [values, setValues] = useState<SaveTrainingPreferencesInput>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  function setField<Key extends keyof SaveTrainingPreferencesInput>(
    key: Key,
    value: SaveTrainingPreferencesInput[Key],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveTrainingPreferencesAction(values);
      if (result.status === "error") {
        setFieldErrors((result.fieldErrors as FieldErrors) ?? {});
        setMessage(result.message);
        setMessageTone("error");
        return;
      }
      setMessage(result.message);
      setMessageTone("success");
      setFieldErrors({});
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-3">
      <Card title="Training Preferences" subtitle="Edit your onboarding answers anytime.">
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Main goal</span>
            <Select
              value={values.primaryGoal}
              onChange={(event) => setField("primaryGoal", event.target.value)}
              className="app-input"
            >
              <option value="">Select one</option>
              {PRIMARY_GOAL_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.primaryGoal ? <p className="text-xs text-rose-300">{fieldErrors.primaryGoal}</p> : null}
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Training experience</span>
            <Select
              value={values.trainingExperience}
              onChange={(event) => setField("trainingExperience", event.target.value)}
              className="app-input"
            >
              <option value="">Select one</option>
              {TRAINING_EXPERIENCE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.trainingExperience ? (
              <p className="text-xs text-rose-300">{fieldErrors.trainingExperience}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Ideal training days per week</span>
            <Select
              value={values.desiredTrainingDaysChoice}
              onChange={(event) => setField("desiredTrainingDaysChoice", event.target.value)}
              className="app-input"
            >
              <option value="">Select one</option>
              {DESIRED_TRAINING_DAYS_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.desiredTrainingDaysChoice ? (
              <p className="text-xs text-rose-300">{fieldErrors.desiredTrainingDaysChoice}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">Training environment</span>
            <Select
              value={values.trainingEnvironment}
              onChange={(event) => setField("trainingEnvironment", event.target.value)}
              className="app-input"
            >
              <option value="">Select one</option>
              {TRAINING_ENVIRONMENT_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.trainingEnvironment ? (
              <p className="text-xs text-rose-300">{fieldErrors.trainingEnvironment}</p>
            ) : null}
          </label>

          <div className="space-y-1 text-sm">
            <span className="text-zinc-300">Height (optional)</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/35 p-1">
              {HEIGHT_UNIT_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setField("heightUnit", option.code as HeightUnitCode)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    values.heightUnit === option.code ? "bg-[#87a3ff] text-black" : "text-zinc-400"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {values.heightUnit === "ft_in" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-zinc-500">Feet</span>
                  <Input
                    className="app-input"
                    inputMode="numeric"
                    value={values.heightFeet}
                    onChange={(event) => setField("heightFeet", event.target.value)}
                    placeholder="5"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-zinc-500">Inches</span>
                  <Input
                    className="app-input"
                    inputMode="numeric"
                    value={values.heightInches}
                    onChange={(event) => setField("heightInches", event.target.value)}
                    placeholder="8"
                  />
                </label>
              </div>
            ) : (
              <label className="space-y-1">
                <span className="text-xs text-zinc-500">Centimeters</span>
                <Input
                  className="app-input"
                  inputMode="numeric"
                  value={values.heightCentimeters}
                  onChange={(event) => setField("heightCentimeters", event.target.value)}
                  placeholder="173"
                />
              </label>
            )}
            {fieldErrors.heightFeet ? <p className="text-xs text-rose-300">{fieldErrors.heightFeet}</p> : null}
            {fieldErrors.heightInches ? <p className="text-xs text-rose-300">{fieldErrors.heightInches}</p> : null}
            {fieldErrors.heightCentimeters ? (
              <p className="text-xs text-rose-300">{fieldErrors.heightCentimeters}</p>
            ) : null}
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-300">How did you hear about NVRTRACK?</span>
            <Select
              value={values.discoverySource}
              onChange={(event) => setField("discoverySource", event.target.value)}
              className="app-input"
            >
              <option value="">Select one</option>
              {DISCOVERY_SOURCE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            {fieldErrors.discoverySource ? (
              <p className="text-xs text-rose-300">{fieldErrors.discoverySource}</p>
            ) : null}
          </label>
        </div>
      </Card>

      {message ? <Toast tone={messageTone === "error" ? "error" : "success"}>{message}</Toast> : null}

      <Button type="submit" variant="primary" className="h-10 w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}

