import { getMuscleLabel, type MuscleId } from "@/lib/training/muscles";
import type { WorkoutMuscleAggregation } from "@/lib/training/muscle-aggregation";
import type { ReactElement } from "react";

interface MuscleMapProps {
  aggregation: WorkoutMuscleAggregation;
  className?: string;
  testId?: string;
}

type EmphasisLevel = "primary" | "secondary" | "neutral";

interface MuscleRegion {
  id: string;
  muscle: MuscleId;
  side: "front" | "back";
  d: string;
}

const REGION_FILL: Record<EmphasisLevel, string> = {
  primary: "#2563eb",
  secondary: "#60a5fa",
  neutral: "#27272a",
};

const REGIONS: MuscleRegion[] = [
  { id: "front-chest", muscle: "chest", side: "front", d: "M50 78 L80 78 L92 102 L38 102 Z" },
  { id: "front-front-delts-left", muscle: "front_delts", side: "front", d: "M35 73 L48 82 L42 95 L29 87 Z" },
  { id: "front-front-delts-right", muscle: "front_delts", side: "front", d: "M95 73 L82 82 L88 95 L101 87 Z" },
  { id: "front-side-delts-left", muscle: "side_delts", side: "front", d: "M29 87 L42 95 L38 110 L26 103 Z" },
  { id: "front-side-delts-right", muscle: "side_delts", side: "front", d: "M101 87 L88 95 L92 110 L104 103 Z" },
  { id: "front-biceps-left", muscle: "biceps", side: "front", d: "M23 104 L35 112 L31 142 L19 136 Z" },
  { id: "front-biceps-right", muscle: "biceps", side: "front", d: "M107 104 L95 112 L99 142 L111 136 Z" },
  { id: "front-forearms-left", muscle: "forearms", side: "front", d: "M19 136 L31 142 L27 172 L15 166 Z" },
  { id: "front-forearms-right", muscle: "forearms", side: "front", d: "M111 136 L99 142 L103 172 L115 166 Z" },
  { id: "front-abs", muscle: "abs", side: "front", d: "M53 104 L77 104 L80 136 L50 136 Z" },
  { id: "front-obliques-left", muscle: "obliques", side: "front", d: "M40 104 L52 104 L49 136 L37 130 Z" },
  { id: "front-obliques-right", muscle: "obliques", side: "front", d: "M78 104 L90 104 L93 130 L81 136 Z" },
  { id: "front-hip-flexors-left", muscle: "hip_flexors", side: "front", d: "M49 136 L62 136 L58 151 L46 149 Z" },
  { id: "front-hip-flexors-right", muscle: "hip_flexors", side: "front", d: "M68 136 L81 136 L84 149 L72 151 Z" },
  { id: "front-quads-left", muscle: "quads", side: "front", d: "M46 149 L61 149 L58 196 L42 196 Z" },
  { id: "front-quads-right", muscle: "quads", side: "front", d: "M69 149 L84 149 L88 196 L72 196 Z" },
  { id: "front-adductors-left", muscle: "adductors", side: "front", d: "M58 149 L67 149 L64 196 L57 196 Z" },
  { id: "front-adductors-right", muscle: "adductors", side: "front", d: "M64 149 L73 149 L76 196 L69 196 Z" },
  { id: "front-calves-left", muscle: "calves", side: "front", d: "M45 196 L58 196 L56 234 L43 234 Z" },
  { id: "front-calves-right", muscle: "calves", side: "front", d: "M73 196 L86 196 L89 234 L76 234 Z" },
  { id: "back-rear-delts-left", muscle: "rear_delts", side: "back", d: "M33 73 L48 82 L44 94 L30 88 Z" },
  { id: "back-rear-delts-right", muscle: "rear_delts", side: "back", d: "M97 73 L82 82 L86 94 L100 88 Z" },
  { id: "back-traps", muscle: "traps", side: "back", d: "M51 76 L79 76 L86 95 L44 95 Z" },
  { id: "back-upper-back", muscle: "upper_back", side: "back", d: "M44 95 L86 95 L89 116 L41 116 Z" },
  { id: "back-lats-left", muscle: "lats", side: "back", d: "M33 96 L46 96 L44 136 L30 130 Z" },
  { id: "back-lats-right", muscle: "lats", side: "back", d: "M97 96 L84 96 L86 136 L100 130 Z" },
  { id: "back-triceps-left", muscle: "triceps", side: "back", d: "M23 104 L35 112 L32 142 L19 137 Z" },
  { id: "back-triceps-right", muscle: "triceps", side: "back", d: "M107 104 L95 112 L98 142 L111 137 Z" },
  { id: "back-forearms-left", muscle: "forearms", side: "back", d: "M19 137 L32 142 L27 172 L15 166 Z" },
  { id: "back-forearms-right", muscle: "forearms", side: "back", d: "M111 137 L98 142 L103 172 L115 166 Z" },
  { id: "back-lower-back", muscle: "lower_back", side: "back", d: "M50 116 L80 116 L83 146 L47 146 Z" },
  { id: "back-glutes-left", muscle: "glutes", side: "back", d: "M47 146 L64 146 L62 168 L46 168 Z" },
  { id: "back-glutes-right", muscle: "glutes", side: "back", d: "M66 146 L83 146 L86 168 L70 168 Z" },
  { id: "back-hamstrings-left", muscle: "hamstrings", side: "back", d: "M46 168 L62 168 L59 206 L43 206 Z" },
  { id: "back-hamstrings-right", muscle: "hamstrings", side: "back", d: "M70 168 L86 168 L90 206 L74 206 Z" },
  { id: "back-calves-left", muscle: "calves", side: "back", d: "M44 206 L58 206 L56 234 L42 234 Z" },
  { id: "back-calves-right", muscle: "calves", side: "back", d: "M74 206 L88 206 L91 234 L77 234 Z" },
];

function getMuscleEmphasis(
  muscle: MuscleId,
  primaryTargetedMuscles: MuscleId[],
  secondaryTargetedMuscles: MuscleId[],
): EmphasisLevel {
  if (primaryTargetedMuscles.includes(muscle)) {
    return "primary";
  }
  if (secondaryTargetedMuscles.includes(muscle)) {
    return "secondary";
  }
  return "neutral";
}

function BodySvg({
  side,
  aggregation,
}: {
  side: "front" | "back";
  aggregation: WorkoutMuscleAggregation;
}): ReactElement {
  return (
    <svg viewBox="0 0 130 260" role="img" aria-label={`${side} body muscle targeting map`} className="h-64 w-40">
      <title>{side === "front" ? "Front body muscle map" : "Back body muscle map"}</title>
      <circle cx="65" cy="30" r="18" fill="#111827" stroke="#3f3f46" strokeWidth="2" />
      <path d="M47 50 L83 50 L98 88 L90 168 L89 238 L73 238 L70 170 L60 170 L57 238 L41 238 L40 168 L32 88 Z" fill="#111827" stroke="#3f3f46" strokeWidth="2" />

      {REGIONS.filter((region) => region.side === side).map((region) => {
        const emphasis = getMuscleEmphasis(
          region.muscle,
          aggregation.primary_targeted_muscles,
          aggregation.secondary_targeted_muscles,
        );
        const label = `${getMuscleLabel(region.muscle)} (${emphasis})`;
        return (
          <path
            key={region.id}
            d={region.d}
            fill={REGION_FILL[emphasis]}
            stroke="#0a0a0a"
            strokeWidth="0.9"
            data-muscle={region.muscle}
            data-emphasis={emphasis}
          >
            <title>{label}</title>
          </path>
        );
      })}
    </svg>
  );
}

function TargetingSummary({ aggregation }: { aggregation: WorkoutMuscleAggregation }): ReactElement {
  if (aggregation.ranked_muscles.length === 0) {
    return <p className="text-xs text-zinc-400">Muscle targeting unavailable for this workout.</p>;
  }

  const topMuscles = aggregation.ranked_muscles
    .slice(0, 4)
    .map((muscle) => getMuscleLabel(muscle.muscle))
    .join(", ");

  return (
    <p className="text-xs text-zinc-400">
      Top targeted muscles: {topMuscles}. Coverage: {aggregation.exercises_with_metadata}/{aggregation.exercise_count} exercises.
    </p>
  );
}

export function MuscleMap({ aggregation, className, testId }: MuscleMapProps): ReactElement {
  return (
    <div className={className} data-testid={testId}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Front</p>
          <BodySvg side="front" aggregation={aggregation} />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Back</p>
          <BodySvg side="back" aggregation={aggregation} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_FILL.primary }} />
          Primary emphasis
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_FILL.secondary }} />
          Secondary emphasis
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_FILL.neutral }} />
          Not targeted
        </span>
      </div>

      <div className="mt-2">
        <TargetingSummary aggregation={aggregation} />
      </div>
    </div>
  );
}
