import { CompleteTaskButton } from "@/components/command-center/complete-task-button";
import { TodayCreateForms } from "@/components/command-center/today-create-forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import {
  buildAttentionItems,
  buildBusinessSnapshot,
  buildImpactSnapshot,
  buildRecommendedActions,
  isOpenTask,
} from "@/lib/command-center/attention";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

function formatHours(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value}`;
}

function formatMoney(cents: number | null): string {
  if (cents === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

export default async function CommandCenterTodayPage() {
  const result = await getCommandCenterToday();
  const now = new Date();

  if (result.error) {
    return (
      <div>
        <PageHeader
          eyebrow="Command Center"
          title="Today"
          subtitle="What needs attention in the business."
        />
        <EmptyState
          title="Command Center is not ready"
          description={
            result.error.code === "NOT_CONFIGURED"
              ? "Supabase is not configured in this environment."
              : result.error.message
          }
        />
      </div>
    );
  }

  const { organization, tasks, opportunities, activity } = result.data;
  const attention = buildAttentionItems({ tasks, opportunities, now });
  const snapshot = buildBusinessSnapshot({ tasks, opportunities, now });
  const impact = buildImpactSnapshot(opportunities);
  const recommended = buildRecommendedActions({ tasks, opportunities, now });
  const openTasks = tasks.filter(isOpenTask);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Command Center"
        title="Today"
        subtitle={`What needs attention in ${organization.name}.`}
      />

      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <EmptyState
            title="Nothing needs attention"
            description="Overdue tasks, high-priority work, and open opportunities will show up here."
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
                      <StateChip state={item.kind === "open_opportunity" ? "planned" : "warning"} />
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
          <MetricCard title="Open opportunities" value={String(snapshot.openOpportunityCount)} />
          <MetricCard title="Open tasks" value={String(snapshot.openTaskCount)} />
          <MetricCard title="Overdue tasks" value={String(snapshot.overdueTaskCount)} />
          <MetricCard
            title="Est. hours / month"
            value={formatHours(snapshot.estimatedHoursPerMonth)}
            detail="From stored opportunity estimates only."
          />
        </div>
      </section>

      <section aria-labelledby="impact-heading" className="space-y-3">
        <h2 id="impact-heading" className="text-sm font-semibold uppercase tracking-[0.09em] text-zinc-200">
          AI impact
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title="Hours / month"
            value={formatHours(impact.estimatedHoursPerMonth)}
            detail="Measured: not recorded"
          >
            <StateChip state="estimated" label="Estimated" />
          </MetricCard>
          <MetricCard
            title="Revenue influenced"
            value={formatMoney(impact.estimatedRevenueCents)}
            detail="Measured: not recorded"
          >
            <StateChip state="estimated" label="Estimated" />
          </MetricCard>
        </div>
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

      <TodayCreateForms organizationId={organization.id} />

      <section aria-labelledby="open-work-heading" className="grid gap-4 lg:grid-cols-2">
        <Card title="Open tasks" subtitle={`${openTasks.length} active`}>
          {openTasks.length === 0 ? (
            <p className="text-sm text-zinc-400">No open tasks yet.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-md)] border border-white/8 px-3 py-2">
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
        <Card title="Activity" subtitle="Append-only events for this organization">
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
