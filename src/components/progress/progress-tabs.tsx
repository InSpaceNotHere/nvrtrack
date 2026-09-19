"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";

type ProgressTab = "Overview" | "Weight" | "Photos" | "Measurements";
type ExtendedProgressTab = ProgressTab | "Journal";

interface ProgressTabsProps {
  overview: React.ReactNode;
  weight: React.ReactNode;
  photos: React.ReactNode;
  measurements: React.ReactNode;
  journal: React.ReactNode;
  initialTab?: ExtendedProgressTab;
}

const TAB_OPTIONS: ExtendedProgressTab[] = ["Overview", "Weight", "Photos", "Measurements", "Journal"];
const TAB_CONTROL_OPTIONS = TAB_OPTIONS.map((option) => ({ value: option, label: option }));

export function ProgressTabs({ overview, weight, photos, measurements, journal, initialTab = "Overview" }: ProgressTabsProps) {
  const [tab, setTab] = useState<ExtendedProgressTab>(initialTab);

  const content = useMemo(() => {
    if (tab === "Overview") {
      return overview;
    }

    if (tab === "Weight") {
      return weight;
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
  }, [journal, measurements, overview, photos, tab, weight]);

  return (
    <section className="space-y-4">
      <p className="text-xs text-zinc-500">Use tabs for weight details, photos, measurements, and journal check-ins.</p>
      <Tabs value={tab} options={TAB_CONTROL_OPTIONS} onChange={setTab} ariaLabel="Progress views" />
      <div>{content}</div>
    </section>
  );
}
