import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PROFILE_DEFAULTS } from "@/lib/sample-data";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Personal targets and app preferences." />

      <form className="space-y-4" aria-label="Profile settings form">
        <Card title="Account">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Display name</span>
              <input
                type="text"
                name="displayName"
                defaultValue={PROFILE_DEFAULTS.displayName}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>

            <label className="space-y-2 text-sm text-zinc-300">
              <span>Height</span>
              <input
                type="text"
                name="height"
                defaultValue={PROFILE_DEFAULTS.height}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>
          </div>
        </Card>

        <Card title="Nutrition Goals">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Calorie goal</span>
              <input
                type="number"
                name="calorieGoal"
                defaultValue={PROFILE_DEFAULTS.calorieGoal}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Protein goal (g)</span>
              <input
                type="number"
                name="proteinGoal"
                defaultValue={PROFILE_DEFAULTS.proteinGoal}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Carbohydrate goal (g)</span>
              <input
                type="number"
                name="carbohydrateGoal"
                defaultValue={PROFILE_DEFAULTS.carbohydrateGoal}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Fat goal (g)</span>
              <input
                type="number"
                name="fatGoal"
                defaultValue={PROFILE_DEFAULTS.fatGoal}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              />
            </label>
          </div>
        </Card>

        <Card title="Preferences">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Preferred unit</span>
              <select
                name="unit"
                defaultValue={PROFILE_DEFAULTS.unit}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              >
                <option>Imperial (lb, in)</option>
                <option>Metric (kg, cm)</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-zinc-300">
              <span>Appearance</span>
              <select
                name="appearance"
                defaultValue={PROFILE_DEFAULTS.appearance}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 text-white outline-none ring-[#7ea0ff] transition focus:ring-2"
              >
                <option>Dark</option>
                <option>System</option>
              </select>
            </label>
          </div>
        </Card>

        <button
          type="button"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10 sm:w-auto"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
