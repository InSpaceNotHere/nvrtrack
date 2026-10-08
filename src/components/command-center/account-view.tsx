"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";

export function AccountView() {
  const { ready, resetWorkspace, exportWorkspace, importWorkspace } = useWorkspace();
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!ready) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="NVRTRACK"
        title="Account"
        subtitle="This demo stays in the browser. Accounts and shared cloud data come later."
      />
      <Card title="Local workspace" subtitle="Each browser keeps its own copy. Clearing site data removes your changes.">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const snapshot = exportWorkspace();
              if (!snapshot) return;
              const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "nvrtrack-workspace.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export workspace JSON
          </Button>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  const parsed = JSON.parse(await file.text()) as unknown;
                  const error = importWorkspace(parsed);
                  setMessage(error ?? "Workspace imported.");
                } catch {
                  setMessage("Workspace file is not valid JSON.");
                }
              }}
            />
            <span className="inline-flex h-10 items-center rounded-[var(--ds-radius-md)] border border-white/15 px-4 text-sm font-semibold text-zinc-100">
              Import workspace JSON
            </span>
          </label>
        </div>
        {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}
      </Card>
      <Card title="Demo settings" subtitle="Restores Juniper & Co. Events and removes tasks or opportunities you added.">
        <Button type="button" variant="danger" onClick={() => setConfirmReset(true)}>
          Reset demo workspace
        </Button>
      </Card>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo workspace">
        <p className="text-sm text-zinc-300">This replaces the current browser workspace with the original Juniper seed.</p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              resetWorkspace();
              setConfirmReset(false);
              setMessage("Demo workspace restored.");
            }}
          >
            Confirm reset
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
