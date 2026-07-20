"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ExerciseCatalogRow } from "@/lib/data/exercise-catalog";
import { buildCatalogFacets, filterCatalogExercises } from "@/lib/training/catalog";

interface ExerciseCatalogBrowserProps {
  exercises: ExerciseCatalogRow[];
  recentExerciseIds: string[];
  frequentExerciseIds: string[];
  loadErrorMessage?: string | null;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function ExerciseCatalogBrowser({
  exercises,
  recentExerciseIds,
  frequentExerciseIds,
  loadErrorMessage,
}: ExerciseCatalogBrowserProps) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const facets = useMemo(() => buildCatalogFacets(exercises), [exercises]);
  const filteredExercises = useMemo(
    () =>
      filterCatalogExercises(exercises, {
        query: search,
        muscle: muscleFilter,
        equipment: equipmentFilter,
      }),
    [equipmentFilter, exercises, muscleFilter, search],
  );
  const byId = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);
  const recent = useMemo(
    () => recentExerciseIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseCatalogRow[],
    [byId, recentExerciseIds],
  );
  const frequent = useMemo(
    () => frequentExerciseIds.map((id) => byId.get(id)).filter(Boolean) as ExerciseCatalogRow[],
    [byId, frequentExerciseIds],
  );

  return (
    <div className="space-y-4">
      {loadErrorMessage ? (
        <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {loadErrorMessage}
        </p>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-white">Search Exercise Catalog</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Primary workflow: find a curated catalog exercise and add it directly in workout logger.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-zinc-300 sm:col-span-3">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="app-input"
              placeholder="bench, rdl, side raise, pulldown..."
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Muscle</span>
            <select value={muscleFilter} onChange={(event) => setMuscleFilter(event.target.value)} className="app-input">
              <option value="">All muscles</option>
              {facets.muscles.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {titleCase(muscle)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-zinc-300">
            <span>Equipment</span>
            <select value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)} className="app-input">
              <option value="">All equipment</option>
              {facets.equipment.map((equipment) => (
                <option key={equipment} value={equipment}>
                  {titleCase(equipment)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Link
              href="/training/start"
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Start Workout
            </Link>
          </div>
        </div>
      </section>

      {recent.length ? (
        <section className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h3 className="text-sm font-semibold text-white">Recently Used</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {recent.slice(0, 10).map((exercise) => (
              <li key={exercise.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {titleCase(exercise.primary_muscle_group)} • {titleCase(exercise.equipment)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {frequent.length ? (
        <section className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h3 className="text-sm font-semibold text-white">Frequently Used</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {frequent.slice(0, 10).map((exercise) => (
              <li key={exercise.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {titleCase(exercise.primary_muscle_group)} • {titleCase(exercise.equipment)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-white">Catalog Results</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{filteredExercises.length} matches</p>
        <ul className="mt-2 max-h-[32rem] space-y-2 overflow-y-auto">
          {filteredExercises.length ? (
            filteredExercises.map((exercise) => (
              <li key={exercise.id} className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {titleCase(exercise.primary_muscle_group)} • {titleCase(exercise.equipment)} •{" "}
                  {titleCase(exercise.movement_pattern)}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2 text-xs text-zinc-500">
              No matching catalog exercises.
            </li>
          )}
        </ul>
      </section>

      <p className="text-xs text-zinc-500">
        Can&apos;t find it? Add a custom exercise from the workout logger fallback flow.
      </p>
    </div>
  );
}
