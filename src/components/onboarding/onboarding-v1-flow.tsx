"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeOnboardingV1Action,
  saveOnboardingStepOneAction,
  saveOnboardingStepTwoAction,
  type SaveOnboardingStepResult,
} from "@/app/(protected)/actions/onboarding-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Toast } from "@/components/ui/toast";
import {
  DESIRED_TRAINING_DAYS_OPTIONS,
  DISCOVERY_SOURCE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  type HeightUnitCode,
} from "@/lib/onboarding/constants";

interface OnboardingInitialValues {
  primaryGoal: string;
  trainingExperience: string;
  desiredTrainingDaysChoice: string;
  trainingEnvironment: string;
  discoverySource: string;
  heightFeet: string;
  heightInches: string;
  heightCentimeters: string;
  heightUnit: HeightUnitCode;
}

interface OnboardingV1FlowProps {
  isExistingUser: boolean;
  initialStep: 1 | 2 | 3;
  initialValues: OnboardingInitialValues;
}

type OnboardingFieldError = Partial<
  Record<
    | "primaryGoal"
    | "trainingExperience"
    | "desiredTrainingDaysChoice"
    | "trainingEnvironment"
    | "discoverySource"
    | "heightFeet"
    | "heightInches"
    | "heightCentimeters",
    string
  >
>;

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? "border-[#87a3ff]/70 bg-[#19243f] text-white"
          : "border-white/10 bg-black/25 text-zinc-200 hover:border-white/20 hover:bg-white/5"
      }`}
      aria-pressed={selected}
    >
      <span>{label}</span>
      <span
        className={`h-4 w-4 rounded-full border ${
          selected ? "border-[#87a3ff] bg-[#87a3ff]" : "border-zinc-500"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function mapStepError<TField extends string>(
  result: SaveOnboardingStepResult<TField>,
): OnboardingFieldError {
  return (result.fieldErrors as OnboardingFieldError) ?? {};
}

export function OnboardingV1Flow({
  isExistingUser,
  initialStep,
  initialValues,
}: OnboardingV1FlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<OnboardingFieldError>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  const stepTitle = useMemo(() => {
    if (step === 1) return "Goals";
    if (step === 2) return "Your Routine";
    return "About You";
  }, [step]);

  function setField<Key extends keyof OnboardingInitialValues>(key: Key, value: OnboardingInitialValues[Key]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function clearStepErrors() {
    setFieldErrors({});
    setMessage(null);
  }

  function handleContinueStepOne() {
    startTransition(async () => {
      clearStepErrors();
      const result = await saveOnboardingStepOneAction({
        primaryGoal: values.primaryGoal,
        trainingExperience: values.trainingExperience,
      });
      if (result.status === "error") {
        setFieldErrors(mapStepError(result));
        setMessage(result.message);
        setMessageTone("error");
        return;
      }
      setStep(2);
    });
  }

  function handleContinueStepTwo() {
    startTransition(async () => {
      clearStepErrors();
      const result = await saveOnboardingStepTwoAction({
        desiredTrainingDaysChoice: values.desiredTrainingDaysChoice,
        trainingEnvironment: values.trainingEnvironment,
      });
      if (result.status === "error") {
        setFieldErrors(mapStepError(result));
        setMessage(result.message);
        setMessageTone("error");
        return;
      }
      setStep(3);
    });
  }

  function handleFinish() {
    startTransition(async () => {
      clearStepErrors();
      const result = await completeOnboardingV1Action({
        discoverySource: values.discoverySource,
        heightUnit: values.heightUnit,
        heightFeet: values.heightFeet,
        heightInches: values.heightInches,
        heightCentimeters: values.heightCentimeters,
      });
      if (result.status === "error") {
        setFieldErrors(mapStepError(result));
        setMessage(result.message);
        setMessageTone("error");
        return;
      }
      setMessageTone("success");
      setMessage("Setup complete.");
      router.replace(result.redirectTo ?? "/");
      router.refresh();
    });
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-3">
      <header className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Step {step} of 3
            </p>
            <h1 className="text-lg font-semibold text-zinc-100">
              {isExistingUser ? "Welcome back" : "Let's set up NVRTRACK"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {isExistingUser
                ? "Answer a few quick questions so NVRTRACK can better understand how you train. Your existing workouts and progress won't change."
                : "A few quick questions will help us understand how you train."}
            </p>
          </div>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
        <ProgressBar value={step} max={3} compact />
      </header>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{stepTitle}</h2>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">What are you working toward?</p>
              <div className="space-y-1.5">
                {PRIMARY_GOAL_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.code}
                    label={option.label}
                    selected={values.primaryGoal === option.code}
                    onClick={() => setField("primaryGoal", option.code)}
                  />
                ))}
              </div>
              {fieldErrors.primaryGoal ? <p className="text-xs text-rose-300">{fieldErrors.primaryGoal}</p> : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">How experienced are you with training?</p>
              <div className="space-y-1.5">
                {TRAINING_EXPERIENCE_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.code}
                    label={option.label}
                    selected={values.trainingExperience === option.code}
                    onClick={() => setField("trainingExperience", option.code)}
                  />
                ))}
              </div>
              {fieldErrors.trainingExperience ? (
                <p className="text-xs text-rose-300">{fieldErrors.trainingExperience}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">
                How many days per week would you ideally like to train?
              </p>
              <div className="space-y-1.5">
                {DESIRED_TRAINING_DAYS_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.code}
                    label={option.label}
                    selected={values.desiredTrainingDaysChoice === option.code}
                    onClick={() => setField("desiredTrainingDaysChoice", option.code)}
                  />
                ))}
              </div>
              {fieldErrors.desiredTrainingDaysChoice ? (
                <p className="text-xs text-rose-300">{fieldErrors.desiredTrainingDaysChoice}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">Where do you usually train?</p>
              <div className="space-y-1.5">
                {TRAINING_ENVIRONMENT_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.code}
                    label={option.label}
                    selected={values.trainingEnvironment === option.code}
                    onClick={() => setField("trainingEnvironment", option.code)}
                  />
                ))}
              </div>
              {fieldErrors.trainingEnvironment ? (
                <p className="text-xs text-rose-300">{fieldErrors.trainingEnvironment}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">How tall are you?</p>
              <p className="text-xs text-zinc-500">Optional. You can leave this blank.</p>

              <div className="inline-flex rounded-lg border border-white/10 bg-black/35 p-1">
                <button
                  type="button"
                  onClick={() => setField("heightUnit", "ft_in")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    values.heightUnit === "ft_in" ? "bg-[#87a3ff] text-black" : "text-zinc-400"
                  }`}
                >
                  ft + in
                </button>
                <button
                  type="button"
                  onClick={() => setField("heightUnit", "cm")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    values.heightUnit === "cm" ? "bg-[#87a3ff] text-black" : "text-zinc-400"
                  }`}
                >
                  cm
                </button>
              </div>

              {values.heightUnit === "ft_in" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs text-zinc-400">Feet</span>
                    <Input
                      value={values.heightFeet}
                      onChange={(event) => setField("heightFeet", event.target.value)}
                      inputMode="numeric"
                      placeholder="5"
                      className="app-input"
                    />
                    {fieldErrors.heightFeet ? <p className="text-xs text-rose-300">{fieldErrors.heightFeet}</p> : null}
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-zinc-400">Inches</span>
                    <Input
                      value={values.heightInches}
                      onChange={(event) => setField("heightInches", event.target.value)}
                      inputMode="numeric"
                      placeholder="8"
                      className="app-input"
                    />
                    {fieldErrors.heightInches ? (
                      <p className="text-xs text-rose-300">{fieldErrors.heightInches}</p>
                    ) : null}
                  </label>
                </div>
              ) : (
                <label className="space-y-1">
                  <span className="text-xs text-zinc-400">Centimeters</span>
                  <Input
                    value={values.heightCentimeters}
                    onChange={(event) => setField("heightCentimeters", event.target.value)}
                    inputMode="numeric"
                    placeholder="173"
                    className="app-input"
                  />
                  {fieldErrors.heightCentimeters ? (
                    <p className="text-xs text-rose-300">{fieldErrors.heightCentimeters}</p>
                  ) : null}
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-100">How did you hear about NVRTRACK?</p>
              <div className="space-y-1.5">
                {DISCOVERY_SOURCE_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.code}
                    label={option.label}
                    selected={values.discoverySource === option.code}
                    onClick={() => setField("discoverySource", option.code)}
                  />
                ))}
              </div>
              {fieldErrors.discoverySource ? (
                <p className="text-xs text-rose-300">{fieldErrors.discoverySource}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {message ? <Toast tone={messageTone === "error" ? "error" : "success"}>{message}</Toast> : null}

        <div className="flex items-center gap-2 pt-1">
          {step > 1 ? (
            <Button type="button" variant="secondary" className="h-10 min-w-[92px]" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              className="h-10 flex-1"
              onClick={step === 1 ? handleContinueStepOne : handleContinueStepTwo}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Continue"}
            </Button>
          ) : (
            <Button type="button" variant="primary" className="h-10 flex-1" onClick={handleFinish} disabled={isPending}>
              {isPending ? "Finishing..." : "Finish"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

