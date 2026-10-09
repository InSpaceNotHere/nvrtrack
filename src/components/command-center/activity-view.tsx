"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { activityDayLabel } from "@/lib/command-center/owner-presentation";

export function ActivityView() {
  const { ready, workspace } = useWorkspace();
  const [filter, setFilter] = useState("all");
  if (!ready || !workspace) return <p className="text-[17px] text-[#65706B]">Opening recent changes…</p>;

  const now = new Date();
  const events = [...workspace.activity]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((event) => {
      if (filter === "task") return event.entityType === "task";
      if (filter === "opportunity") return event.entityType === "opportunity";
      return true;
    });
  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const label = activityDayLabel(event.createdAt, now);
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">What happened</h1>
        <p className="mt-2 text-[17px] text-[#65706B]">A quiet record of changes in {workspace.business.name}.</p>
      </header>
      <div className="flex gap-2">
        {[
          ["all", "All"],
          ["task", "Work"],
          ["opportunity", "Opportunities"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              filter === value
                ? "rounded-full bg-[#17785E] px-4 py-2 text-[15px] font-semibold text-white"
                : "rounded-full bg-white px-4 py-2 text-[15px] font-semibold text-[#17201D]"
            }
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-8">
        {[...groups.entries()].map(([day, items]) => (
          <section key={day}>
            <h2 className="text-[22px] font-semibold text-[#17201D]">{day}</h2>
            <ol className="mt-4 space-y-5 border-l border-[#D7E8E1] pl-5">
              {items.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-[#20A77B]" aria-hidden="true" />
                  <p className="text-[18px] font-semibold text-[#17201D]">{event.title}</p>
                  {event.description ? <p className="mt-1 text-[16px] text-[#65706B]">{event.description}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
