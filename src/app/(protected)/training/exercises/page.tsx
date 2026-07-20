import Link from "next/link";

import { ExerciseCatalogBrowser } from "@/components/training/exercise-catalog-browser";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getExerciseCatalog, getFrequentCatalogExerciseIds, getRecentlyUsedCatalogExerciseIds } from "@/lib/data/exercise-catalog";

export default async function TrainingExercisesPage() {
  const [catalogResult, recentResult, frequentResult] = await Promise.all([
    getExerciseCatalog({ limit: 600 }),
    getRecentlyUsedCatalogExerciseIds(12),
    getFrequentCatalogExerciseIds(12),
  ]);
  const dataErrorMessage = catalogResult.error?.message ?? recentResult.error?.message ?? frequentResult.error?.message ?? null;

  return (
    <div className="space-y-4">
      <PageHeader title="Exercise Catalog" subtitle="Browse curated global exercises by muscle and equipment." />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/training"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          Back to Training
        </Link>
        <Link
          href="/training/start"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Start Workout
        </Link>
      </div>

      <Card title="Exercises">
        <ExerciseCatalogBrowser
          exercises={catalogResult.data ?? []}
          recentExerciseIds={recentResult.data ?? []}
          frequentExerciseIds={frequentResult.data ?? []}
          loadErrorMessage={dataErrorMessage}
        />
      </Card>
    </div>
  );
}
