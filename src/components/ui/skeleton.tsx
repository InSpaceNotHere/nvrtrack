import { cn } from "@/components/ui/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-[var(--ds-radius-sm)] bg-white/8", className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <section className="rounded-[var(--ds-radius-xl)] border border-white/10 bg-[var(--ds-color-bg-surface)] p-4">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="mt-3 h-8 w-3/5" />
      <Skeleton className="mt-3 h-2 w-full" />
      <Skeleton className="mt-2 h-2 w-4/5" />
    </section>
  );
}

