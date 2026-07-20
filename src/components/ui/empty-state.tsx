import { CircleSlash2 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-white/20 bg-[#0f1114] p-8 text-center">
      <CircleSlash2 className="mx-auto mb-3 h-7 w-7 text-zinc-500" aria-hidden="true" />
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </section>
  );
}
