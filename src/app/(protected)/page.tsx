import { GoalProgressRow } from "@/components/dashboard/goal-progress-row";
import { MacroSummary } from "@/components/dashboard/macro-summary";
import { WeightSummary } from "@/components/dashboard/weight-summary";
import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Section } from "@/components/ui/section";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { getMyFoodEntriesForDate } from "@/lib/data/nutrition";
import { getMyProfile } from "@/lib/data/profile";
import { getWeightEntries } from "@/lib/data/weight";
import { calculateDailyTotals } from "@/lib/nutrition/calculations";
import { getTodayDateString } from "@/lib/nutrition/date";
import { MIN_ENTRIES_FOR_PERIOD_COMPARISON, formatDeltaLabel, computeWeightMetrics, shortDateLabel } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";
import { HOME_DATA, CLUB_TARGETS, MACRO_STATS } from "@/lib/sample-data";
import type { MacroStat } from "@/types/fitness";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function HomePage() {
  const todayDate = getTodayDateString();
  const [profileResult, weightEntriesResult, nutritionEntriesResult] = await Promise.all([
    getMyProfile(),
    getWeightEntries(),
    getMyFoodEntriesForDate(todayDate),
  ]);
  const profileLoadError = profileResult.error?.message ?? null;
  const weightLoadError = weightEntriesResult.error?.message ?? null;
  const nutritionLoadError = nutritionEntriesResult.error?.message ?? null;

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightEntries = weightEntriesResult.data ?? [];
  const weightMetrics = computeWeightMetrics(weightEntries, displayUnit);
  const displayName = profileResult.data?.display_name?.trim() || null;
  const nutritionTotals = calculateDailyTotals(nutritionEntriesResult.data ?? []);

  const calorieGoal = profileResult.data?.calorie_goal ?? null;
  const macroGoals: Record<MacroStat["name"], number | null> = {
    Protein: profileResult.data?.protein_goal ?? null,
    Carbohydrates: profileResult.data?.carbohydrate_goal ?? null,
    Fat: profileResult.data?.fat_goal ?? null,
  };
  const macroConsumed: Record<MacroStat["name"], number> = {
    Protein: nutritionTotals.protein_g,
    Carbohydrates: nutritionTotals.carbohydrate_g,
    Fat: nutritionTotals.fat_g,
  };
  const macroStats: MacroStat[] = MACRO_STATS.map((macro) => ({
    ...macro,
    consumed: macroConsumed[macro.name],
    goal: macroGoals[macro.name],
  }));

  const currentWeight = weightMetrics.latest?.weight ?? null;
  const currentChange = formatDeltaLabel(weightMetrics.previousEntryDelta, displayUnit);
  const sevenDayAverage = weightMetrics.currentSevenDayAverage?.value ?? null;
  const sevenDayAverageChange =
    weightMetrics.canCompareSevenDayPeriods && weightMetrics.sevenDayComparisonDelta !== null
      ? formatDeltaLabel(weightMetrics.sevenDayComparisonDelta, displayUnit)
      : `Comparison unavailable (need ${MIN_ENTRIES_FOR_PERIOD_COMPARISON} entries in each seven-day period)`;
  const trend = weightMetrics.trendChronological.slice(-7).map((entry) => ({
    label: shortDateLabel(entry.entryDate),
    value: entry.weight,
  }));
  const calorieRemaining = calorieGoal !== null ? Math.max(calorieGoal - nutritionTotals.calories, 0) : null;
  const proteinGoal = profileResult.data?.protein_goal ?? null;
  const proteinRemaining = proteinGoal !== null ? Math.max(proteinGoal - nutritionTotals.protein_g, 0) : null;

  return (
    <div className="space-y-4 md:space-y-5">
      <header className="rounded-[var(--ds-radius-xl)] border border-white/10 bg-[var(--ds-color-bg-surface)] px-3.5 py-3.5 sm:px-4 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-[var(--ds-font-size-heading-lg)] font-semibold tracking-tight text-white">
          {displayName ? `Today Overview, ${displayName}` : "Today Overview"}
        </h1>
        <p className="mt-1 text-xs text-zinc-400">High-signal daily status across nutrition, training, and bodyweight.</p>
      </header>

      {profileLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Profile data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{profileLoadError}</p>
        </Card>
      ) : null}
      {weightLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}
      {nutritionLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Nutrition totals are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{nutritionLoadError}</p>
        </Card>
      ) : null}

      <Section title="Today Status" subtitle="At-a-glance metrics for immediate decision making">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Calories Remaining">
            <p className="ds-metric text-white">{calorieRemaining !== null ? calorieRemaining.toLocaleString() : "--"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {calorieGoal !== null
                ? `${nutritionTotals.calories.toLocaleString()} consumed of ${calorieGoal.toLocaleString()}`
                : "Set a calorie goal in Profile to activate remaining calories."}
            </p>
          </Card>
          <Card title="Protein Remaining">
            <p className="ds-metric text-white">{proteinRemaining !== null ? Math.round(proteinRemaining).toLocaleString() : "--"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {proteinGoal !== null
                ? `${Math.round(nutritionTotals.protein_g).toLocaleString()}g consumed of ${proteinGoal.toLocaleString()}g`
                : "Set a protein goal in Profile to activate remaining protein."}
            </p>
          </Card>
          <Card title="Bodyweight">
            <p className="ds-metric text-white">
              {currentWeight !== null ? currentWeight.toFixed(1) : "--"}{" "}
              <span className="text-base text-zinc-400">{displayUnit}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{currentChange}</Chip>
              {sevenDayAverage !== null ? <Chip>{sevenDayAverage.toFixed(1)} {displayUnit} avg</Chip> : null}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Today&apos;s Workout" subtitle="Plan signal and quick execution">
        <WorkoutCard
          workoutName={HOME_DATA.workout.name}
          exercises={HOME_DATA.workout.exercises}
          totalSets={HOME_DATA.workout.totalSets}
          actionLabel="Continue Workout"
        />
      </Section>

      <Section title="Nutrition" subtitle="Daily intake and macro progress">
        <Card title="Calories" subtitle="Today">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
                {nutritionTotals.calories.toLocaleString()}
                <span className="text-xl text-zinc-400">
                  {" / "}
                  {calorieGoal !== null ? calorieGoal.toLocaleString() : "--"}
                </span>
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-zinc-500">
                Daily intake from nutrition log entries
              </p>
              {calorieGoal === null ? (
                <p className="mt-1 text-xs text-zinc-500">Set a calorie goal in Profile to activate progress.</p>
              ) : null}
            </div>
            {calorieGoal !== null ? (
              <CalorieRing consumed={nutritionTotals.calories} goal={calorieGoal} size={108} />
            ) : (
              <div className="flex h-[108px] w-[108px] items-center justify-center rounded-full border border-white/10 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                Goal not set
              </div>
            )}
          </div>
          <div className="mt-3">
            {calorieGoal !== null ? (
              <ProgressBar value={nutritionTotals.calories} max={calorieGoal} />
            ) : (
              <div className="h-2 w-full rounded-full bg-white/8" aria-hidden="true" />
            )}
          </div>
          <div className="mt-3 border-t border-white/8 pt-3">
            <MacroSummary macros={macroStats} />
          </div>
        </Card>
      </Section>

      <Section title="Progress" subtitle="Weight trend and strength progression">
        <div className="grid gap-3 md:grid-cols-2">
          <WeightSummary
            currentWeight={currentWeight}
            currentChange={currentChange}
            sevenDayAverage={sevenDayAverage}
            averageChange={sevenDayAverageChange}
            trend={trend}
            unit={displayUnit}
          />
          <Card title="1000 LB Club">
            <ul className="space-y-3">
              {CLUB_TARGETS.map((goal) => (
                <GoalProgressRow key={goal.lift} goal={goal} />
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Recent Activity" subtitle="Fast update workflow">
        <Card title="Quick Weight Entry" subtitle="Live body-weight logging">
          <WeightLogManager entries={weightMetrics.historyNewestFirst} displayUnit={displayUnit} showHistory={false} />
        </Card>
      </Section>
    </div>
  );
}
