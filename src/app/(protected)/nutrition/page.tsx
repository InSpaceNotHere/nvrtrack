import { ChevronRight } from "lucide-react";

import { MacroSummary } from "@/components/dashboard/macro-summary";
import { Card } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProfile } from "@/lib/data/profile";
import { RECENT_MEALS, HOME_DATA, MACRO_STATS } from "@/lib/sample-data";
import type { MacroStat } from "@/types/fitness";

export default async function NutritionPage() {
  const profileResult = await getMyProfile();
  const profile = profileResult.data;
  const calorieGoal = profile?.calorie_goal ?? null;
  const macroGoals: Record<MacroStat["name"], number | null> = {
    Protein: profile?.protein_goal ?? null,
    Carbohydrates: profile?.carbohydrate_goal ?? null,
    Fat: profile?.fat_goal ?? null,
  };
  const macroStats: MacroStat[] = MACRO_STATS.map((macro) => ({
    ...macro,
    goal: macroGoals[macro.name],
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Nutrition" />
      {profileResult.error ? (
        <Card>
          <p className="text-sm text-rose-200">Nutrition goals are temporarily unavailable.</p>
          <p className="mt-1 text-xs text-zinc-500">{profileResult.error.message}</p>
        </Card>
      ) : null}

      <Card title="Today&apos;s Calories">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.2rem]">
              {HOME_DATA.calories.consumed.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              of {calorieGoal !== null ? calorieGoal.toLocaleString() : "--"} kcal
            </p>
            <p className="mt-1 text-xs text-zinc-500">Consumed totals remain static until nutrition logging is built.</p>
          </div>
          {calorieGoal !== null ? (
            <CalorieRing consumed={HOME_DATA.calories.consumed} goal={calorieGoal} size={96} />
          ) : (
            <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border border-white/10 text-[10px] uppercase tracking-[0.08em] text-zinc-500">
              Goal not set
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-white/8 pt-3">
          <MacroSummary macros={macroStats} />
        </div>
      </Card>

      <Card title="Recent Meals">
        <ul className="space-y-2">
          {RECENT_MEALS.map((meal) => (
            <li
              key={meal.id}
              className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{meal.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{meal.time}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-100">{meal.calories} kcal</p>
                    <p className="text-[11px] text-zinc-400">
                      P {meal.protein} • C {meal.carbs} • F {meal.fat}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Add Meal
        </button>
      </Card>
    </div>
  );
}
