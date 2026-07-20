import { GoalProgressRow } from "@/components/dashboard/goal-progress-row";
import { MacroSummary } from "@/components/dashboard/macro-summary";
import { WeightSummary } from "@/components/dashboard/weight-summary";
import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HOME_DATA, CLUB_TARGETS, MACRO_STATS, WEIGHT_TREND } from "@/lib/sample-data";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="mb-1">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Today Overview</h1>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          title="Calories"
          value={`${HOME_DATA.calories.consumed.toLocaleString()} / ${HOME_DATA.calories.goal.toLocaleString()}`}
          detail="Today"
        >
          <ProgressBar value={HOME_DATA.calories.consumed} max={HOME_DATA.calories.goal} />
        </MetricCard>

        <Card title="Macro Progress" subtitle="Protein, carbs, and fat">
          <MacroSummary macros={MACRO_STATS} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <WeightSummary
          currentWeight={HOME_DATA.currentWeight.value}
          currentChange={HOME_DATA.currentWeight.changeLabel}
          sevenDayAverage={HOME_DATA.sevenDayAverage.value}
          averageChange={HOME_DATA.sevenDayAverage.changeLabel}
          trend={WEIGHT_TREND}
        />
        <WorkoutCard
          workoutName={HOME_DATA.workout.name}
          exercises={HOME_DATA.workout.exercises}
          totalSets={HOME_DATA.workout.totalSets}
        />
      </section>

      <Card title="Current Goal" subtitle="1000 LB Club">
        <ul className="space-y-3">
          {CLUB_TARGETS.map((goal) => (
            <GoalProgressRow key={goal.lift} goal={goal} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
