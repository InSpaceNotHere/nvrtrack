"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function AccountView() {
  const { ready, resetWorkspace, exportWorkspace, importWorkspace } = useWorkspace();
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!ready) return <p className="text-[17px] text-[#65706B]">Opening account…</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">Account</h1>
        <p className="mt-2 max-w-xl text-[17px] leading-7 text-[#65706B]">This preview saves data on this device.</p>
      </header>
      <section className="space-y-4 rounded-[28px] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
        <h2 className="text-[22px] font-semibold">Saved on this device</h2>
        <p className="text-[16px] leading-7 text-[#65706B]">
          Changes stay with this browser. Another phone or computer will not see them. Clearing this site’s data removes what you changed here.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
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
            Export workspace
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
                  const error = importWorkspace(JSON.parse(await file.text()) as unknown);
                  setMessage(error ?? "Workspace imported.");
                } catch {
                  setMessage("That file could not be read.");
                }
              }}
            />
            <span className="inline-flex h-10 items-center rounded-full border border-[rgba(23,32,29,0.1)] bg-white px-4 text-sm font-semibold">
              Import workspace
            </span>
          </label>
        </div>
        {message ? <p className="text-[16px]">{message}</p> : null}
      </section>
      <section className="rounded-[28px] bg-[#F0F3EE] px-6 py-6">
        <h2 className="text-[22px] font-semibold">Reset demo workspace</h2>
        <p className="mt-2 text-[16px] leading-7 text-[#65706B]">Puts Juniper & Co. Events back to the original demo and removes changes made on this device.</p>
        <Button type="button" variant="danger" className="mt-4 rounded-full" onClick={() => setConfirmReset(true)}>
          Reset demo workspace
        </Button>
      </section>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo workspace">
        <p className="text-[16px] leading-7 text-[var(--ds-color-text-secondary)]">This replaces the workspace on this device with the original Juniper demo.</p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="danger"
            className="rounded-full"
            onClick={() => {
              resetWorkspace();
              setConfirmReset(false);
              setMessage("Demo workspace restored.");
            }}
          >
            Confirm reset
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
