import { Skeleton } from "@/components/ui/skeleton";

export default function AddFoodLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading add food">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
