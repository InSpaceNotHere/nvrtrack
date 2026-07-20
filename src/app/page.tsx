import { GoalProgressRow } from "@/components/dashboard/goal-progress-row";
import { MacroSummary } from "@/components/dashboard/macro-summary";
import { WeightSummary } from "@/components/dashboard/weight-summary";
import { WorkoutCard } from "@/components/dashboard/workout-card";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import { HOME_DATA, CLUB_TARGETS, MACRO_STATS, WEIGHT_TREND } from "@/lib/sample-data";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <header className="mb-1">
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">Today Overview</h1>
      </header>

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
          actionLabel="Continue Workout"
        />
      </section>

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
