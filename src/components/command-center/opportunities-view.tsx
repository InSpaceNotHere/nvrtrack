"use client";

import { useState } from "react";

import { OpportunityEditor } from "@/components/command-center/record-editor";
import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateChip } from "@/components/ui/state-chip";
import type { LocalOpportunity } from "@/lib/command-center/domain";

export function OpportunitiesView() {
  const { ready, workspace, createOpportunity, updateOpportunity } = useWorkspace();
  const [editing, setEditing] = useState<LocalOpportunity | "new" | null>(null);
  if (!ready || !workspace) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={workspace.business.name}
        title="Opportunities"
        subtitle="Discovered work. Impact numbers stay estimated until a later phase records measurements."
      />
      <Button type="button" variant="primary" onClick={() => setEditing("new")}>
        New opportunity
      </Button>
      {editing ? (
        <Card title={editing === "new" ? "New opportunity" : "Edit opportunity"}>
          <OpportunityEditor
            key={editing === "new" ? "new" : editing.id}
            opportunity={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={(input) => {
              if (editing === "new") createOpportunity(input);
              else updateOpportunity(editing.id, input);
              setEditing(null);
            }}
          />
        </Card>
      ) : null}
      <ul className="space-y-2">
        {workspace.opportunities.map((opportunity) => (
          <li key={opportunity.id}>
            <button type="button" className="w-full text-left" onClick={() => setEditing(opportunity)}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{opportunity.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {opportunity.department ?? "No department"} · {opportunity.priority} · {opportunity.status}
                    </p>
                    {opportunity.problem ? <p className="mt-2 text-sm text-zinc-300">{opportunity.problem}</p> : null}
                  </div>
                  {opportunity.estimatedHoursSavedMonthly !== null || opportunity.estimatedValueMonthly !== null ? (
                    <StateChip state="estimated" label="Estimated" />
                  ) : null}
                </div>
              </Card>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
