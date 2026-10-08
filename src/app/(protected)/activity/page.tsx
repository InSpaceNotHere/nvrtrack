import { CreateWorkspaceForm } from "@/components/command-center/create-workspace-form";
import { SchemaMissingState } from "@/components/command-center/schema-missing";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolveFirstRunState } from "@/lib/command-center/first-run";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const result = await getCommandCenterToday();
  if (result.error) {
    return <EmptyState title="Activity could not load" description={result.error.message} />;
  }

  const firstRun = resolveFirstRunState(result.data);
  if (firstRun === "schema_missing") {
    return <SchemaMissingState />;
  }
  if (firstRun === "create_workspace" || !result.data.organization) {
    return <CreateWorkspaceForm />;
  }

  const { organization, activity } = result.data;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Activity" subtitle={`Append-only timeline for ${organization.name}.`} />
      <Card title="Events" subtitle={`${activity.length} stored rows`}>
        {activity.length === 0 ? (
          <p className="text-sm text-zinc-400">No activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((event) => (
              <li key={event.id} className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                <p className="text-sm text-white">{event.summary}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                  {event.event_type} · {event.occurred_at.slice(0, 16).replace("T", " ")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
