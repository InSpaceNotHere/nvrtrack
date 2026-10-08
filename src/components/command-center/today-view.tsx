"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { buildAttentionItems, buildBusinessSnapshot, buildRecommendedActions } from "@/lib/command-center/attention";
import { useWorkspace } from "@/components/command-center/workspace-provider";

export function TodayView() {
  const { ready, workspace, welcomeVisible, dismissWelcome } = useWorkspace();
  if (!ready || !workspace) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }

  const now = new Date();
  const attention = buildAttentionItems({ tasks: workspace.tasks, opportunities: workspace.opportunities, now });
  const snapshot = buildBusinessSnapshot({ tasks: workspace.tasks, opportunities: workspace.opportunities, now });
  const actions = buildRecommendedActions({ tasks: workspace.tasks, opportunities: workspace.opportunities, now });
  const activity = [...workspace.activity].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={workspace.business.name}
        title="What needs my attention?"
        subtitle="Today is built from the tasks and opportunities saved in this browser."
      />
      {welcomeVisible ? (
        <Card variant="primary" title="NVRTRACK Command Center" subtitle="Here’s what needs attention today.">
          <Button type="button" variant="primary" onClick={dismissWelcome}>
            Continue
          </Button>
        </Card>
      ) : null}

      <section className="space-y-3" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-lg font-semibold text-white">
          Needs attention
        </h2>
        <ul className="space-y-2">
          {attention.map((item) => (
            <li key={item.id}>
              <Card variant="primary">
                <p className="text-base font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-lg font-semibold text-white">
          Recommended actions
        </h2>
        <ul className="space-y-2">
          {actions.map((action) => (
            <li key={action.id}>
              <Card>
                <p className="text-base font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{action.detail}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="snapshot-heading">
        <h2 id="snapshot-heading" className="text-lg font-semibold text-white">
          Business snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Open tasks" value={String(snapshot.openTaskCount)} />
          <MetricCard title="Overdue tasks" value={String(snapshot.overdueTaskCount)} />
          <MetricCard title="Active opportunities" value={String(snapshot.activeOpportunityCount)} />
          <MetricCard title="High-priority opportunities" value={String(snapshot.highPriorityOpportunityCount)} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-lg font-semibold text-white">
          Recent activity
        </h2>
        <Card>
          <ol className="space-y-3">
            {activity.map((event) => (
              <li key={event.id}>
                <p className="text-sm font-medium text-white">{event.title}</p>
                <p className="text-sm text-zinc-400">{event.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}
