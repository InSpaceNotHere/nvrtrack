"use client";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { isOpenTask } from "@/lib/command-center/attention";
import { stageLabel } from "@/lib/command-center/owner-presentation";

export function BusinessesView() {
  const { ready, workspace } = useWorkspace();
  if (!ready || !workspace) return <p className="text-[17px] text-[#65706B]">Opening the business…</p>;
  const recent = [...workspace.activity].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 3);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[17px] text-[#65706B]">Business</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">{workspace.business.name}</h1>
        <p className="mt-2 text-[17px] text-[#65706B]">{workspace.business.industry ?? "Local business"}</p>
      </header>
      <section className="rounded-[28px] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
        <h2 className="text-[22px] font-semibold">Business overview</h2>
        <p className="mt-2 text-[17px] leading-7 text-[#65706B]">
          NVRTRACK is watching {workspace.tasks.filter(isOpenTask).length} open pieces of work and {workspace.opportunities.length} opportunities.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-[22px] font-semibold">Current opportunities</h2>
        <ul className="space-y-2">
          {workspace.opportunities.map((item) => (
            <li key={item.id} className="rounded-[20px] bg-white px-5 py-4">
              <p className="text-[17px] font-semibold">{item.title}</p>
              <p className="text-[15px] text-[#65706B]">{stageLabel(item.status)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-[22px] font-semibold">Recent activity</h2>
        <ul className="space-y-2">
          {recent.map((event) => (
            <li key={event.id} className="text-[16px] text-[#17201D]">
              {event.title}
              {event.description ? ` — ${event.description}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
