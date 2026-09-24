import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function WorkoutLoggerLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading workout">
      <Skeleton className="h-8 w-48" />
      <SkeletonCard />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
