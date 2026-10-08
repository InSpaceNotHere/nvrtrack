"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { OpportunityEditor } from "@/components/command-center/record-editor";
import { ResearchBriefing } from "@/components/command-center/research-briefing";
import { useWorkspace } from "@/components/command-center/workspace-provider";
import { opportunityBand, priorityLabel, stageLabel } from "@/lib/command-center/owner-presentation";
import type { LocalOpportunity } from "@/lib/command-center/domain";

function OpportunityBoard() {
  const params = useSearchParams();
  const { ready, workspace, createOpportunity, updateOpportunity, markResearchReviewed, adoptResearchRecommendation } = useWorkspace();
  const initial = params.get("new") ? "new" : params.get("focus");
  const [editing, setEditing] = useState<string | "new" | null>(initial);
  const [showEditor, setShowEditor] = useState(initial === "new");
  if (!ready || !workspace) return <p className="text-[17px] text-[#65706B]">Opening opportunities…</p>;

  const selected =
    typeof editing === "string" && editing !== "new" ? workspace.opportunities.find((item) => item.id === editing) ?? null : null;
  const readyItems = workspace.opportunities.filter((item) => opportunityBand(item.status) === "ready");
  const progress = workspace.opportunities.filter((item) => opportunityBand(item.status) === "progress");
  const later = workspace.opportunities.filter((item) => opportunityBand(item.status) === "later");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">Opportunities</h1>
        <p className="mt-2 max-w-xl text-[17px] leading-7 text-[#65706B]">
          Ways the business could save time, improve follow-up, or reduce repetitive work.
        </p>
      </header>
      <button type="button" className="ds-press rounded-full bg-[#17785E] px-5 py-3 text-[16px] font-semibold text-white" onClick={() => { setEditing("new"); setShowEditor(true); }}>
        + Opportunity
      </button>
      {editing === "new" || selected ? (
        <section className="nvr-rise rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
          {selected ? (
            <>
              <OpportunityDetail opportunity={selected} />
              <ResearchBriefing
                attachment={workspace.research.find((item) => item.opportunityId === selected.id) ?? null}
                currentRecommendation={selected.recommendation}
                onReview={() => markResearchReviewed(selected.id)}
                onAdopt={() => adoptResearchRecommendation(selected.id)}
              />
            </>
          ) : null}
          {showEditor ? (
            <OpportunityEditor
              key={editing === "new" ? "new" : editing}
              opportunity={editing === "new" ? null : selected}
              onCancel={() => {
                if (editing === "new") setEditing(null);
                setShowEditor(false);
              }}
              onSave={(input) => {
                if (editing === "new") createOpportunity(input);
                else if (editing) updateOpportunity(editing, input);
                setEditing(null);
                setShowEditor(false);
              }}
            />
          ) : (
            <button type="button" className="ds-press rounded-full bg-[#17785E] px-5 py-3 text-[16px] font-semibold text-white" onClick={() => setShowEditor(true)}>
              Edit details
            </button>
          )}
        </section>
      ) : null}
      <OpportunityGroup
        title="Ready to review"
        items={readyItems}
        researchIds={workspace.research.map((item) => item.opportunityId)}
        onOpen={(id) => {
          setShowEditor(false);
          setEditing(id);
        }}
      />
      <OpportunityGroup title="In progress" items={progress} onOpen={(id) => { setShowEditor(false); setEditing(id); }} />
      <OpportunityGroup title="Later" items={later} onOpen={(id) => { setShowEditor(false); setEditing(id); }} />
    </div>
  );
}

function OpportunityDetail({ opportunity }: { opportunity: LocalOpportunity }) {
  return (
    <div className="mb-6 space-y-4 border-b border-[#F0F3EE] pb-6">
      <h2 className="text-2xl font-semibold text-[#17201D]">{opportunity.title}</h2>
      <Detail label="The problem" body={opportunity.problem ?? "The problem has not been written yet."} />
      <Detail label="What could change" body={opportunity.recommendation ?? "A clearer next step still needs to be written."} />
      <Detail label="Why it matters" body={opportunity.description ?? opportunity.department ?? "This is still being shaped."} />
      <Detail
        label="Estimated impact"
        body={
          opportunity.estimatedHoursSavedMonthly !== null
            ? `Estimated · about ${opportunity.estimatedHoursSavedMonthly} hours a month. This is not a measured result.`
            : "Estimated impact has not been entered."
        }
      />
      <Detail label="Current stage" body={stageLabel(opportunity.status)} />
    </div>
  );
}

function Detail({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[15px] font-semibold text-[#17785E]">{label}</p>
      <p className="mt-1 text-[17px] leading-7 text-[#17201D]">{body}</p>
    </div>
  );
}

function OpportunityGroup({
  title,
  items,
  onOpen,
  researchIds = [],
}: {
  title: string;
  items: LocalOpportunity[];
  onOpen: (id: string) => void;
  researchIds?: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-[#65706B]">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" className="w-full rounded-[24px] bg-white px-5 py-5 text-left shadow-[0_14px_36px_rgba(23,32,29,0.05)]" onClick={() => onOpen(item.id)}>
              <p className="text-[20px] font-semibold text-[#17201D]">{item.title}</p>
              <p className="mt-1 text-[16px] text-[#65706B]">{item.department ?? "Across the business"}</p>
              {item.problem ? <p className="mt-3 text-[17px] leading-7 text-[#17201D]">{item.problem}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {researchIds.includes(item.id) ? (
                  <span className="rounded-full bg-[#E8F5EF] px-3 py-1 text-[15px] font-semibold text-[#17785E]">Research available</span>
                ) : null}
                <span className="rounded-full bg-[#F0F3EE] px-3 py-1 text-[15px] text-[#17201D]">{priorityLabel(item.priority)}</span>
                {item.estimatedHoursSavedMonthly !== null ? (
                  <span className="rounded-full bg-[#E8F5EF] px-3 py-1 text-[15px] text-[#17785E]">
                    Estimated: {item.estimatedHoursSavedMonthly} hrs/month
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#17785E]">Review opportunity</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OpportunitiesView() {
  return (
    <Suspense fallback={<p className="text-[17px] text-[#65706B]">Opening opportunities…</p>}>
      <OpportunityBoard />
    </Suspense>
  );
}
