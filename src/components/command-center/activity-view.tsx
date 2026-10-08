"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";

export function ActivityView() {
  const { ready, workspace } = useWorkspace();
  const [filter, setFilter] = useState("all");
  if (!ready || !workspace) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }

  const events = [...workspace.activity]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((event) => {
      if (filter === "task") return event.entityType === "task";
      if (filter === "opportunity") return event.entityType === "opportunity";
      return true;
    });

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={workspace.business.name} title="Activity" subtitle="Newest changes in this browser workspace." />
      <label className="block max-w-xs text-sm text-zinc-300">
        Show
        <Select className="mt-1" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Activity filter">
          <option value="all">All</option>
          <option value="task">Tasks</option>
          <option value="opportunity">Opportunities</option>
        </Select>
      </label>
      <Card>
        <ol className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
              <p className="text-base font-medium text-white">{event.title}</p>
              {event.description ? <p className="mt-1 text-sm text-zinc-400">{event.description}</p> : null}
              <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                {event.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
