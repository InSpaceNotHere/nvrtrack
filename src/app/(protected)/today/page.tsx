import { CompleteTaskButton } from "@/components/command-center/complete-task-button";
import { CreateWorkspaceForm } from "@/components/command-center/create-workspace-form";
import { SchemaMissingState } from "@/components/command-center/schema-missing";
import { TodayCreateForms } from "@/components/command-center/today-create-forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import {
  buildAttentionItems,
  buildBusinessSnapshot,
  buildRecommendedActions,
  isOpenTask,
} from "@/lib/command-center/attention";
import { resolveFirstRunState } from "@/lib/command-center/first-run";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

export default async function CommandCenterTodayPage() {
  const result = await getCommandCenterToday();
  const now = new Date();

  if (result.error) {
    return (
      <div>
        <PageHeader eyebrow="NVRTRACK" title="Today" subtitle="What needs my attention in the business?" />
        <EmptyState title="Today could not load" description={result.error.message} />
      </div>
    );
  }

  const firstRun = resolveFirstRunState({
    schemaReady: result.data.schemaReady,
    organization: result.data.organization,
  });

  if (firstRun === "schema_missing") {
    return <SchemaMissingState />;
  }

  if (firstRun === "create_workspace") {
    return <CreateWorkspaceForm />;
  }

  const { organization, tasks, opportunities, activity } = result.data;
  const attention = buildAttentionItems({ tasks, opportunities, now });
  const snapshot = buildBusinessSnapshot({ tasks, opportunities, now });
  const recommended = buildRecommendedActions({ tasks, opportunities, now });
  const openTasks = tasks.filter(isOpenTask);
  const storedEstimatedHours = opportunities
    .map((item) => item.estimated_hours_per_month)
    .filter((value): value is number => value !== null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Command Center"
        title="Today"
        subtitle={`What needs my attention in ${organization?.name}?`}
      />

      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <EmptyState
            title="Nothing needs attention"
            description="Overdue tasks, high-priority work, and open opportunities will show up here from saved rows."
          />
        ) : (
          <ul className="space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <Card variant="primary">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
                    </div>
                    {item.kind === "overdue_task" || item.kind === "high_priority_task" ? (
                      <CompleteTaskButton taskId={item.entityId} />
                    ) : (
                      <StateChip state="planned" />
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="snapshot-heading" className="space-y-3">
        <h2 id="snapshot-heading" className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">
          Business snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Open tasks" value={String(snapshot.openTaskCount)} detail="From business_tasks" />
          <MetricCard title="Overdue tasks" value={String(snapshot.overdueTaskCount)} detail="Open tasks past due_at" />
          <MetricCard
            title="Active opportunities"
            value={String(snapshot.openOpportunityCount)}
            detail="identified through testing"
          />
          <MetricCard
            title="High-priority opportunities"
            value={String(snapshot.highPriorityOpportunityCount)}
            detail="high or urgent and still active"
          />
        </div>
        {storedEstimatedHours.length > 0 ? (
          <MetricCard
            title="Estimated hours / month"
            value={String(storedEstimatedHours.reduce((total, value) => total + value, 0))}
            detail="Stored opportunity estimates only. Measured hours are not recorded."
          >
            <StateChip state="estimated" label="Estimated" />
          </MetricCard>
        ) : null}
      </section>

      <section aria-labelledby="actions-heading" className="space-y-3">
        <h2 id="actions-heading" className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">
          Recommended actions
        </h2>
        {recommended.length === 0 ? (
          <EmptyState title="No recommendations" description="Recommendations are derived from saved tasks and opportunities." />
        ) : (
          <ul className="space-y-2">
            {recommended.map((action) => (
              <li key={action.id}>
                <Card>
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">{action.detail}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {organization ? <TodayCreateForms organizationId={organization.id} /> : null}

      <section aria-labelledby="open-work-heading" className="grid gap-4 lg:grid-cols-2">
        <Card title="Open tasks" subtitle={`${openTasks.length} from this workspace`}>
          {openTasks.length === 0 ? (
            <p className="text-sm text-zinc-400">No open tasks yet.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-md)] border border-white/8 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500">
                      {item.priority} · {item.due_at ? item.due_at.slice(0, 10) : "no due date"}
                    </p>
                  </div>
                  <CompleteTaskButton taskId={item.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity" subtitle="Append-only events from this workspace">
          {activity.length === 0 ? (
            <p className="text-sm text-zinc-400">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {activity.map((event) => (
                <li key={event.id} className="border-b border-white/8 pb-2 last:border-b-0 last:pb-0">
                  <p className="text-sm text-white">{event.summary}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                    {event.event_type} · {event.occurred_at.slice(0, 16).replace("T", " ")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}
