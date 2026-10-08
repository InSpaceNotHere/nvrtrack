"use client";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { isOpenTask } from "@/lib/command-center/attention";

export function BusinessesView() {
  const { ready, workspace } = useWorkspace();
  if (!ready || !workspace) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }
  const openTasks = workspace.tasks.filter(isOpenTask).length;
  const recent = [...workspace.activity].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Businesses" subtitle="One local workspace for now." />
      <Card title={workspace.business.name} subtitle={workspace.business.industry ?? "Business"}>
        <p className="text-sm text-zinc-400">Switching organizations and inviting members waits for the cloud phase.</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Open tasks" value={String(openTasks)} />
        <MetricCard title="Opportunities" value={String(workspace.opportunities.length)} />
        <MetricCard title="Recent activity" value={recent ? recent.title : "None"} />
      </div>
    </div>
  );
}
