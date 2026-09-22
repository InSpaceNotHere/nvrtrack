"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeOnboardingV1Action,
  saveOnboardingExperienceAction,
  saveOnboardingGoalAction,
  saveOnboardingHeightAction,
  saveOnboardingTrainingDaysAction,
  saveOnboardingTrainingEnvironmentAction,
  type SaveOnboardingStepResult,
} from "@/app/(protected)/actions/onboarding-actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  DESIRED_TRAINING_DAYS_OPTIONS,
  DISCOVERY_SOURCE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  TRAINING_ENVIRONMENT_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  type HeightUnitCode,
} from "@/lib/onboarding/constants";

export type OnboardingQuestionScreen =
  | "goal"
  | "experience"
  | "days"
  | "environment"
  | "height"
  | "discovery";

export type OnboardingScreen = "welcome" | OnboardingQuestionScreen | "complete";

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
  initialScreen: OnboardingScreen;
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

const QUESTION_ORDER: OnboardingQuestionScreen[] = [
  "goal",
  "experience",
  "days",
  "environment",
  "height",
  "discovery",
];

const SCREEN_PATH_QUERY: Record<OnboardingScreen, string> = {
  welcome: "",
  goal: "goal",
  experience: "experience",
  days: "days",
  environment: "environment",
  height: "height",
  discovery: "discovery",
  complete: "complete",
};

function mapStepError<TField extends string>(
  result: SaveOnboardingStepResult<TField>,
): OnboardingFieldError {
  return (result.fieldErrors as OnboardingFieldError) ?? {};
}

function OptionTile({
  label,
  selected,
  onClick,
  disabled,
  subtle,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border px-4 py-3 text-left text-[15px] font-medium transition-all duration-150 motion-reduce:transition-none ${
        selected
          ? "border-[#86a2ff] bg-[#1a2440] text-zinc-50 shadow-[0_0_0_1px_rgba(134,162,255,0.15)]"
          : subtle
            ? "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]"
            : "border-white/12 bg-black/25 text-zinc-100 hover:border-white/20 hover:bg-white/[0.07]"
      } disabled:cursor-not-allowed disabled:opacity-65`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function NumericDayTile({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-14 rounded-2xl border text-lg font-semibold transition-all duration-150 motion-reduce:transition-none ${
        selected
          ? "border-[#86a2ff] bg-[#1a2440] text-zinc-50 shadow-[0_0_0_1px_rgba(134,162,255,0.15)]"
          : "border-white/12 bg-black/25 text-zinc-100 hover:border-white/20 hover:bg-white/[0.07]"
      } disabled:cursor-not-allowed disabled:opacity-65`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export function OnboardingV1Flow({
  isExistingUser,
  initialScreen,
  initialValues,
}: OnboardingV1FlowProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<OnboardingScreen>(initialScreen);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<OnboardingFieldError>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();
  const lockRef = useRef(false);

  const currentQuestionIndex = useMemo(() => {
    if (!QUESTION_ORDER.includes(screen as OnboardingQuestionScreen)) return null;
    return QUESTION_ORDER.indexOf(screen as OnboardingQuestionScreen);
  }, [screen]);
  const currentQuestionNumber = currentQuestionIndex === null ? null : currentQuestionIndex + 1;
  const isBusy = isPending;

  function setField<Key extends keyof OnboardingInitialValues>(key: Key, value: OnboardingInitialValues[Key]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function clearFeedback() {
    setStatusMessage(null);
    setFieldErrors({});
  }

  function routeForScreen(nextScreen: OnboardingScreen): string {
    const query = SCREEN_PATH_QUERY[nextScreen];
    return query ? `/onboarding?q=${query}` : "/onboarding";
  }

  function transitionToScreen(nextScreen: OnboardingScreen) {
    if (nextScreen === screen) return;
    setScreen(nextScreen);
    router.replace(routeForScreen(nextScreen), { scroll: false });
  }

  function previousScreenFor(current: OnboardingScreen): OnboardingScreen {
    if (current === "goal") return "welcome";
    if (current === "experience") return "goal";
    if (current === "days") return "experience";
    if (current === "environment") return "days";
    if (current === "height") return "environment";
    if (current === "discovery") return "height";
    if (current === "complete") return "discovery";
    return "welcome";
  }

  function runSaveAndAdvance<TField extends string>(options: {
    save: () => Promise<SaveOnboardingStepResult<TField>>;
    nextScreen: OnboardingScreen;
    onSuccess?: () => void;
  }) {
    if (lockRef.current) return;
    lockRef.current = true;
    clearFeedback();
    startTransition(async () => {
      const result = await options.save();
      if (result.status === "error") {
        setFieldErrors(mapStepError(result));
        setStatusTone("error");
        setStatusMessage(result.message);
        lockRef.current = false;
        return;
      }
      options.onSuccess?.();
      transitionToScreen(options.nextScreen);
      lockRef.current = false;
    });
  }

  function handleGoalSelect(code: string) {
    setField("primaryGoal", code);
    runSaveAndAdvance({
      save: () => saveOnboardingGoalAction({ primaryGoal: code }),
      nextScreen: "experience",
    });
  }

  function handleExperienceSelect(code: string) {
    setField("trainingExperience", code);
    runSaveAndAdvance({
      save: () => saveOnboardingExperienceAction({ trainingExperience: code }),
      nextScreen: "days",
    });
  }

  function handleTrainingDaysSelect(code: string) {
    setField("desiredTrainingDaysChoice", code);
    runSaveAndAdvance({
      save: () => saveOnboardingTrainingDaysAction({ desiredTrainingDaysChoice: code }),
      nextScreen: "environment",
    });
  }

  function handleEnvironmentSelect(code: string) {
    setField("trainingEnvironment", code);
    runSaveAndAdvance({
      save: () => saveOnboardingTrainingEnvironmentAction({ trainingEnvironment: code }),
      nextScreen: "height",
    });
  }

  function handleHeightContinue() {
    runSaveAndAdvance({
      save: () =>
        saveOnboardingHeightAction({
          heightUnit: values.heightUnit,
          heightFeet: values.heightFeet,
          heightInches: values.heightInches,
          heightCentimeters: values.heightCentimeters,
        }),
      nextScreen: "discovery",
    });
  }

  function handleHeightSkip() {
    setField("heightFeet", "");
    setField("heightInches", "");
    setField("heightCentimeters", "");
    runSaveAndAdvance({
      save: () =>
        saveOnboardingHeightAction({
          heightUnit: values.heightUnit,
          heightFeet: "",
          heightInches: "",
          heightCentimeters: "",
        }),
      nextScreen: "discovery",
    });
  }

  function handleDiscoverySelect(code: string) {
    setField("discoverySource", code);
    runSaveAndAdvance({
      save: () =>
        completeOnboardingV1Action({
          discoverySource: code,
          heightUnit: values.heightUnit,
          heightFeet: values.heightFeet,
          heightInches: values.heightInches,
          heightCentimeters: values.heightCentimeters,
        }),
      nextScreen: "complete",
      onSuccess: () => {
        setStatusTone("success");
        setStatusMessage("You're all set.");
      },
    });
  }

  function handleBack() {
    if (isBusy) return;
    clearFeedback();
    transitionToScreen(previousScreenFor(screen));
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-xl flex-col pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between px-1 pb-3 pt-1">
        {screen === "welcome" ? (
          <span className="h-8 w-16" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={handleBack}
            disabled={isBusy}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 px-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
        )}
        <LogoutButton compact />
      </header>

      <div className="flex-1">
        {screen === "welcome" ? (
          <div className="flex h-full flex-col justify-center gap-8 px-1 pb-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">NVRTRACK</p>
              <h1 className="text-3xl font-semibold leading-tight text-zinc-100">
                {isExistingUser ? "Welcome back" : "Let’s build your setup."}
              </h1>
              <p className="max-w-[34ch] text-sm leading-relaxed text-zinc-400">
                {isExistingUser
                  ? "Let’s finish setting up NVRTRACK. Your workouts, progress, meals, and existing data are staying exactly where they are."
                  : "A few quick questions help NVRTRACK understand how you train."}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              className="h-12 w-full rounded-2xl text-base"
              onClick={() => transitionToScreen("goal")}
              disabled={isBusy}
            >
              {isExistingUser ? "Continue" : "Get Started"}
            </Button>
          </div>
        ) : null}

        {screen !== "welcome" && screen !== "complete" ? (
          <div className="flex h-full flex-col gap-5 px-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <p>{currentQuestionNumber} of 6</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-[var(--ds-color-accent)] transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${((currentQuestionNumber ?? 1) / 6) * 100}%` }}
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={6}
                  aria-valuenow={currentQuestionNumber ?? 1}
                />
              </div>
            </div>

            {screen === "goal" ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight text-zinc-100">What are you working toward?</h2>
                <div className="grid grid-cols-2 gap-2">
                  {PRIMARY_GOAL_OPTIONS.slice(0, 6).map((option) => (
                    <OptionTile
                      key={option.code}
                      label={option.label}
                      selected={values.primaryGoal === option.code}
                      onClick={() => handleGoalSelect(option.code)}
                      disabled={isBusy}
                    />
                  ))}
                  <div className="col-span-2">
                    <OptionTile
                      label={PRIMARY_GOAL_OPTIONS[6]?.label ?? "Prefer not to answer"}
                      selected={values.primaryGoal === (PRIMARY_GOAL_OPTIONS[6]?.code ?? "prefer_not_to_answer")}
                      onClick={() => handleGoalSelect(PRIMARY_GOAL_OPTIONS[6]?.code ?? "prefer_not_to_answer")}
                      disabled={isBusy}
                      subtle
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {screen === "experience" ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight text-zinc-100">How experienced are you with training?</h2>
                <div className="space-y-2">
                  {TRAINING_EXPERIENCE_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.code}
                      label={option.label}
                      selected={values.trainingExperience === option.code}
                      onClick={() => handleExperienceSelect(option.code)}
                      disabled={isBusy}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {screen === "days" ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight text-zinc-100">How many days per week would you like to train?</h2>
                <div className="grid grid-cols-3 gap-2">
                  {DESIRED_TRAINING_DAYS_OPTIONS.filter((option) => /^\d+$/.test(option.code)).map((option) => (
                    <NumericDayTile
                      key={option.code}
                      label={option.label}
                      selected={values.desiredTrainingDaysChoice === option.code}
                      onClick={() => handleTrainingDaysSelect(option.code)}
                      disabled={isBusy}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {DESIRED_TRAINING_DAYS_OPTIONS.filter((option) => !/^\d+$/.test(option.code)).map((option) => (
                    <OptionTile
                      key={option.code}
                      label={option.label}
                      selected={values.desiredTrainingDaysChoice === option.code}
                      onClick={() => handleTrainingDaysSelect(option.code)}
                      disabled={isBusy}
                      subtle
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {screen === "environment" ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight text-zinc-100">Where do you usually train?</h2>
                <div className="space-y-2">
                  {TRAINING_ENVIRONMENT_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.code}
                      label={option.label}
                      selected={values.trainingEnvironment === option.code}
                      onClick={() => handleEnvironmentSelect(option.code)}
                      disabled={isBusy}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {screen === "height" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold leading-tight text-zinc-100">How tall are you?</h2>
                  <p className="text-sm text-zinc-400">Optional. You can skip this and add it later.</p>
                </div>
                <div className="inline-flex rounded-xl border border-white/12 bg-black/35 p-1">
                  <button
                    type="button"
                    onClick={() => setField("heightUnit", "ft_in")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      values.heightUnit === "ft_in" ? "bg-[#87a3ff] text-black" : "text-zinc-300"
                    }`}
                  >
                    ft + in
                  </button>
                  <button
                    type="button"
                    onClick={() => setField("heightUnit", "cm")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      values.heightUnit === "cm" ? "bg-[#87a3ff] text-black" : "text-zinc-300"
                    }`}
                  >
                    cm
                  </button>
                </div>

                {values.heightUnit === "ft_in" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Feet</span>
                      <Input
                        value={values.heightFeet}
                        onChange={(event) => setField("heightFeet", event.target.value)}
                        inputMode="numeric"
                        placeholder="5"
                        className="app-input h-14 text-center text-xl font-semibold"
                      />
                      {fieldErrors.heightFeet ? <p className="text-xs text-rose-300">{fieldErrors.heightFeet}</p> : null}
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Inches</span>
                      <Input
                        value={values.heightInches}
                        onChange={(event) => setField("heightInches", event.target.value)}
                        inputMode="numeric"
                        placeholder="8"
                        className="app-input h-14 text-center text-xl font-semibold"
                      />
                      {fieldErrors.heightInches ? (
                        <p className="text-xs text-rose-300">{fieldErrors.heightInches}</p>
                      ) : null}
                    </label>
                  </div>
                ) : (
                  <label className="space-y-1.5">
                    <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Centimeters</span>
                    <Input
                      value={values.heightCentimeters}
                      onChange={(event) => setField("heightCentimeters", event.target.value)}
                      inputMode="numeric"
                      placeholder="173"
                      className="app-input h-14 text-center text-xl font-semibold"
                    />
                    {fieldErrors.heightCentimeters ? (
                      <p className="text-xs text-rose-300">{fieldErrors.heightCentimeters}</p>
                    ) : null}
                  </label>
                )}

                <div className="mt-auto space-y-2 pb-1">
                  <Button
                    type="button"
                    variant="primary"
                    className="h-12 w-full rounded-2xl text-base"
                    onClick={handleHeightContinue}
                    disabled={isBusy}
                  >
                    {isPending ? "Saving..." : "Continue"}
                  </Button>
                  <button
                    type="button"
                    onClick={handleHeightSkip}
                    disabled={isBusy}
                    className="w-full rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Prefer not to add this
                  </button>
                </div>
              </div>
            ) : null}

            {screen === "discovery" ? (
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold leading-tight text-zinc-100">How did you hear about NVRTRACK?</h2>
                <div className="grid grid-cols-2 gap-2">
                  {DISCOVERY_SOURCE_OPTIONS.map((option) => (
                    <OptionTile
                      key={option.code}
                      label={option.label}
                      selected={values.discoverySource === option.code}
                      onClick={() => handleDiscoverySelect(option.code)}
                      disabled={isBusy}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  Pick one option and we’ll finish setup right away.
                </p>
              </div>
            ) : null}

            {statusMessage ? (
              <Toast tone={statusTone === "error" ? "error" : "success"} role={statusTone === "error" ? "alert" : "status"}>
                {statusMessage}
              </Toast>
            ) : null}
          </div>
        ) : null}

        {screen === "complete" ? (
          <div className="flex h-full flex-col justify-center gap-8 px-1 pb-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold text-zinc-100">You’re all set.</h2>
              <p className="text-base text-zinc-400">NVRTRACK is ready.</p>
            </div>
            <Button
              type="button"
              variant="primary"
              className="h-12 w-full rounded-2xl text-base"
              onClick={() => {
                router.replace("/");
                router.refresh();
              }}
            >
              Go to Home
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

