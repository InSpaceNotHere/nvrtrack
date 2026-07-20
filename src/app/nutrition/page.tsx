import { MacroSummary } from "@/components/dashboard/macro-summary";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RECENT_MEALS, HOME_DATA, MACRO_STATS } from "@/lib/sample-data";

export default function NutritionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nutrition" subtitle="Fast daily macro tracking with recent meals." />

      <Card title="Today&apos;s Calories" subtitle="Static sample data">
        <p className="text-3xl font-semibold tracking-tight text-white">
          {HOME_DATA.calories.consumed.toLocaleString()} / {HOME_DATA.calories.goal.toLocaleString()}
        </p>
        <div className="mt-5">
          <MacroSummary macros={MACRO_STATS} />
        </div>
      </Card>

      <Card title="Recent Meals" subtitle="Three example entries">
        <ul className="space-y-3">
          {RECENT_MEALS.map((meal) => (
            <li key={meal.id} className="rounded-xl border border-white/10 bg-black/20 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{meal.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{meal.time}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-200">{meal.calories} kcal</p>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                P {meal.protein}g • C {meal.carbs}g • F {meal.fat}g
              </p>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10 sm:w-auto"
        >
          Add Meal
        </button>
      </Card>
    </div>
  );
}
