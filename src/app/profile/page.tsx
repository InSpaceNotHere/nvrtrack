import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PROFILE_DEFAULTS } from "@/lib/sample-data";

export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Profile" />

      <form className="mx-auto max-w-xl space-y-3.5" aria-label="Profile settings form">
        <Card title="Account">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Display name</span>
              <input
                type="text"
                name="displayName"
                defaultValue={PROFILE_DEFAULTS.displayName}
                className="app-input"
              />
            </label>

            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Height</span>
              <input
                type="text"
                name="height"
                defaultValue={PROFILE_DEFAULTS.height}
                className="app-input"
              />
            </label>
          </div>
        </Card>

        <Card title="Nutrition Goals">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Calorie goal</span>
              <input
                type="number"
                name="calorieGoal"
                defaultValue={PROFILE_DEFAULTS.calorieGoal}
                className="app-input"
              />
            </label>
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Protein goal (g)</span>
              <input
                type="number"
                name="proteinGoal"
                defaultValue={PROFILE_DEFAULTS.proteinGoal}
                className="app-input"
              />
            </label>
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Carbohydrate goal (g)</span>
              <input
                type="number"
                name="carbohydrateGoal"
                defaultValue={PROFILE_DEFAULTS.carbohydrateGoal}
                className="app-input"
              />
            </label>
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Fat goal (g)</span>
              <input
                type="number"
                name="fatGoal"
                defaultValue={PROFILE_DEFAULTS.fatGoal}
                className="app-input"
              />
            </label>
          </div>
        </Card>

        <Card title="Preferences">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Preferred unit</span>
              <select
                name="unit"
                defaultValue={PROFILE_DEFAULTS.unit}
                className="app-input"
              >
                <option>Imperial (lb, in)</option>
                <option>Metric (kg, cm)</option>
              </select>
            </label>

            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Appearance</span>
              <select
                name="appearance"
                defaultValue={PROFILE_DEFAULTS.appearance}
                className="app-input"
              >
                <option>Dark</option>
                <option>System</option>
              </select>
            </label>
          </div>
        </Card>

        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
