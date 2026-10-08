import { CreateWorkspaceForm } from "@/components/command-center/create-workspace-form";
import { SchemaMissingState } from "@/components/command-center/schema-missing";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolveFirstRunState } from "@/lib/command-center/first-run";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const result = await getCommandCenterToday();
  if (result.error) {
    return <EmptyState title="Businesses could not load" description={result.error.message} />;
  }

  const firstRun = resolveFirstRunState(result.data);
  if (firstRun === "schema_missing") {
    return <SchemaMissingState />;
  }
  if (firstRun === "create_workspace" || !result.data.organization) {
    return <CreateWorkspaceForm />;
  }

  const { organization } = result.data;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Businesses" subtitle="Organizations you belong to." />
      <Card title={organization.name} subtitle={organization.slug}>
        <p className="text-sm text-zinc-400">
          Multi-business switching and client profiles come later. This workspace is the one Today uses.
        </p>
      </Card>
    </div>
  );
}
