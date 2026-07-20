import { GoalProgressRow } from "@/components/dashboard/goal-progress-row";
import { MacroSummary } from "@/components/dashboard/macro-summary";
import { WeightSummary } from "@/components/dashboard/weight-summary";
import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import { WeightLogManager } from "@/components/weight/weight-log-manager";
import { getMyProfile } from "@/lib/data/profile";
import { getWeightEntries } from "@/lib/data/weight";
import { MIN_ENTRIES_FOR_PERIOD_COMPARISON, formatDeltaLabel, computeWeightMetrics, shortDateLabel } from "@/lib/weight/metrics";
import type { WeightUnit } from "@/lib/weight/conversions";
import { HOME_DATA, CLUB_TARGETS, MACRO_STATS } from "@/lib/sample-data";

function getDisplayUnit(preferredWeightUnit: string | null | undefined): WeightUnit {
  return preferredWeightUnit === "kg" ? "kg" : "lb";
}

export default async function HomePage() {
  const [profileResult, weightEntriesResult] = await Promise.all([getMyProfile(), getWeightEntries()]);
  const weightLoadError = weightEntriesResult.error?.message ?? profileResult.error?.message ?? null;

  const displayUnit = getDisplayUnit(profileResult.data?.preferred_weight_unit);
  const weightEntries = weightEntriesResult.data ?? [];
  const weightMetrics = computeWeightMetrics(weightEntries, displayUnit);

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

  return (
    <div className="space-y-4">
      <header className="mb-1">
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">Today Overview</h1>
      </header>

      {weightLoadError ? (
        <Card>
          <p className="text-sm text-rose-200">Weight data is temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{weightLoadError}</p>
        </Card>
      ) : null}

      <Card title="Calories" subtitle="Today">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
              {HOME_DATA.calories.consumed.toLocaleString()}
              <span className="text-xl text-zinc-400"> / {HOME_DATA.calories.goal.toLocaleString()}</span>
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-zinc-500">Daily intake</p>
          </div>
          <CalorieRing consumed={HOME_DATA.calories.consumed} goal={HOME_DATA.calories.goal} size={108} />
        </div>
        <div className="mt-3">
          <ProgressBar value={HOME_DATA.calories.consumed} max={HOME_DATA.calories.goal} />
        </div>
        <div className="mt-3 border-t border-white/8 pt-3">
          <MacroSummary macros={MACRO_STATS} />
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <WeightSummary
          currentWeight={currentWeight}
          currentChange={currentChange}
          sevenDayAverage={sevenDayAverage}
          averageChange={sevenDayAverageChange}
          trend={trend}
          unit={displayUnit}
        />
        <WorkoutCard
          workoutName={HOME_DATA.workout.name}
          exercises={HOME_DATA.workout.exercises}
          totalSets={HOME_DATA.workout.totalSets}
          actionLabel="Continue Workout"
        />
      </section>

      <Card title="Quick Weight Entry" subtitle="Live body-weight logging">
        <WeightLogManager entries={weightMetrics.historyNewestFirst} displayUnit={displayUnit} showHistory={false} />
      </Card>

      <Card title="1000 LB Club">
        <ul className="space-y-3">
          {CLUB_TARGETS.map((goal) => (
            <GoalProgressRow key={goal.lift} goal={goal} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
