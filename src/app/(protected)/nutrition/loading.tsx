import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function NutritionLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading nutrition">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-28" />
      </div>
      <SkeletonCard />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
