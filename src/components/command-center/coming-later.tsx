import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function ComingLater({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title={title} subtitle={summary} />
      <EmptyState
        title="Coming later"
        description="This area is planned for a later phase. It does not open Nutrition, Training, or other archived fitness screens."
      />
    </div>
  );
}
