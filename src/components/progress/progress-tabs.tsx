"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";

type ProgressTab = "Overview" | "Photos" | "Measurements";

interface ProgressTabsProps {
  overview: React.ReactNode;
}

const TAB_OPTIONS: ProgressTab[] = ["Overview", "Photos", "Measurements"];

export function ProgressTabs({ overview }: ProgressTabsProps) {
  const [tab, setTab] = useState<ProgressTab>("Overview");

  const content = useMemo(() => {
    if (tab === "Overview") {
      return overview;
    }

    if (tab === "Photos") {
      return (
        <EmptyState
          title="Progress photos are empty"
          description="Photo check-ins will be added in a later session. This placeholder reflects the future upload view."
        />
      );
    }

    return (
      <EmptyState
        title="Measurements are empty"
          description="Body measurement logging is not active in Session 4. This tab remains a polished static placeholder."
      />
    );
  }, [overview, tab]);

  return (
    <section className="space-y-4">
      <div role="tablist" aria-label="Progress views" className="inline-flex rounded-xl border border-white/10 bg-[#0f1114] p-1">
        {TAB_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => setTab(option)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === option ? "bg-white/12 font-medium text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div>{content}</div>
    </section>
  );
}
