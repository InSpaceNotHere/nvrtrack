import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function SchemaMissingState() {
  return (
    <div>
      <PageHeader
        eyebrow="NVRTRACK"
        title="Today"
        subtitle="What needs my attention in the business?"
      />
      <EmptyState
        title="Workspace database is not ready"
        description="Command Center tables have not been applied to a safe Preview database yet. Nutrition Production was not changed."
      />
    </div>
  );
}
