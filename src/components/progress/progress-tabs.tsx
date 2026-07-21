"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";

type ProgressTab = "Overview" | "Photos" | "Measurements";
type ExtendedProgressTab = ProgressTab | "Journal";

interface ProgressTabsProps {
  overview: React.ReactNode;
  photos: React.ReactNode;
  measurements: React.ReactNode;
  journal: React.ReactNode;
}

const TAB_OPTIONS: ExtendedProgressTab[] = ["Overview", "Photos", "Measurements", "Journal"];

export function ProgressTabs({ overview, photos, measurements, journal }: ProgressTabsProps) {
  const [tab, setTab] = useState<ExtendedProgressTab>("Overview");

  const content = useMemo(() => {
    if (tab === "Overview") {
      return overview;
    }

    if (tab === "Photos") {
      return photos;
    }

    if (tab === "Measurements") {
      return measurements;
    }

    if (tab === "Journal") {
      return journal;
    }

    return <EmptyState title="Unknown tab" description="This tab is not available." />;
  }, [journal, measurements, overview, photos, tab]);

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
