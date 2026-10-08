import { CreateWorkspaceForm } from "@/components/command-center/create-workspace-form";
import { OpportunityStatusForm } from "@/components/command-center/opportunity-status-form";
import { SchemaMissingState } from "@/components/command-center/schema-missing";
import { TodayCreateForms } from "@/components/command-center/today-create-forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolveFirstRunState } from "@/lib/command-center/first-run";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const result = await getCommandCenterToday();
  if (result.error) {
    return <EmptyState title="Opportunities could not load" description={result.error.message} />;
  }

  const firstRun = resolveFirstRunState(result.data);
  if (firstRun === "schema_missing") {
    return <SchemaMissingState />;
  }
  if (firstRun === "create_workspace" || !result.data.organization) {
    return <CreateWorkspaceForm />;
  }

  const { organization, opportunities } = result.data;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Opportunities" subtitle={`Discovered work for ${organization.name}.`} />
      <TodayCreateForms organizationId={organization.id} />
      <Card title="Pipeline" subtitle={`${opportunities.length} saved rows`}>
        {opportunities.length === 0 ? (
          <p className="text-sm text-zinc-400">No opportunities yet.</p>
        ) : (
          <ul className="space-y-3">
            {opportunities.map((opportunity) => (
              <li key={opportunity.id} className="rounded-[var(--ds-radius-md)] border border-white/8 p-3">
                <p className="text-sm font-semibold text-white">{opportunity.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {opportunity.department ?? "No department"} · {opportunity.priority} · {opportunity.status}
                </p>
                {opportunity.current_problem ? (
                  <p className="mt-2 text-sm text-zinc-300">{opportunity.current_problem}</p>
                ) : null}
                <div className="mt-3">
                  <OpportunityStatusForm opportunityId={opportunity.id} status={opportunity.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
