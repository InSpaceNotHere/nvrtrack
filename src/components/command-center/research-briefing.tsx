"use client";

import { useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import type { ResearchAttachment } from "@/lib/command-center/domain";
import { researchCounts, type FindingStatus, type RecommendationState } from "@/lib/command-center/research-contract";

const FINDING_LABEL: Record<FindingStatus, string> = {
  supported: "Supported by evidence",
  uncertain: "Needs more evidence",
  contradicted: "Evidence conflicts",
};

const RECOMMENDATION_LABEL: Record<RecommendationState, string> = {
  supported: "Supported for review",
  preliminary: "Preliminary",
  withheld: "Withheld",
};

export function ResearchBriefing({
  attachment,
  currentRecommendation,
  onReview,
  onAdopt,
}: {
  attachment: ResearchAttachment | null;
  currentRecommendation: string | null;
  onReview: () => void;
  onAdopt: () => void;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [confirmAdopt, setConfirmAdopt] = useState(false);
  if (!attachment) {
    return (
      <section className="mt-6 border-t border-[#F0F3EE] pt-6">
        <h3 className="text-[22px] font-semibold text-[#17201D]">Research</h3>
        <p className="mt-2 text-[17px] text-[#4E5954]">No research has been attached yet.</p>
      </section>
    );
  }

  const { result } = attachment;
  const counts = researchCounts(result);
  const suggestion = result.recommendations[0] ?? null;
  const replacesExisting = Boolean(currentRecommendation && suggestion && currentRecommendation !== suggestion.text);

  return (
    <section className="nvr-rise mt-6 space-y-4 border-t border-[#F0F3EE] pt-6">
      <h3 className="text-[22px] font-semibold text-[#17201D]">Research</h3>
      <div className="rounded-[24px] bg-[#F7F8F4] px-5 py-5">
        <p className="text-[18px] font-semibold text-[#17201D]">Research complete</p>
        <p className="mt-2 text-[17px] text-[#4E5954]">
          {counts.sources} sources reviewed · {counts.supportedFindings} supported findings · {counts.evidenceGaps} evidence gaps
        </p>
        <p className="mt-4 text-[15px] font-semibold text-[#17785E]">What the research suggests</p>
        <p className="mt-1 text-[17px] leading-7 text-[#17201D]">{result.summary}</p>
        {suggestion ? (
          <p className="mt-4 inline-flex rounded-full bg-[#E8F5EF] px-3 py-1 text-[15px] font-semibold text-[#17785E]">
            {RECOMMENDATION_LABEL[suggestion.state]}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#C88924]">What we still don’t know</p>
        <ul className="mt-2 space-y-2">
          {result.evidence_gaps.map((gap) => (
            <li key={gap.id} className="text-[17px] leading-7 text-[#17201D]">
              {gap.text}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ds-press rounded-full bg-[#17201D] px-5 py-3 text-[16px] font-semibold text-white" onClick={() => setEvidenceOpen(true)}>
          View evidence
        </button>
        {attachment.reviewedAt ? (
          <span className="inline-flex items-center rounded-full bg-[#E8F5EF] px-4 text-[15px] font-semibold text-[#17785E]">Reviewed</span>
        ) : (
          <button type="button" className="ds-press rounded-full bg-[#E8F5EF] px-5 py-3 text-[16px] font-semibold text-[#17785E]" onClick={onReview}>
            Mark reviewed
          </button>
        )}
        {suggestion && suggestion.state !== "withheld" ? (
          <button type="button" className="ds-press rounded-full border border-[rgba(23,32,29,0.1)] bg-white px-5 py-3 text-[16px] font-semibold text-[#17201D]" onClick={() => setConfirmAdopt(true)}>
            Use as next step
          </button>
        ) : null}
      </div>
      <p className="text-[16px] text-[#4E5954]">{attachment.reviewedAt ? "Reviewed" : "Research not reviewed"}</p>
      <details className="text-[15px] text-[#4E5954]">
        <summary className="cursor-pointer font-semibold text-[#17201D]">Research details</summary>
        <p className="mt-2">
          {attachment.provenance === "demo-fixture" ? "Development fixture, not a live research run." : "Imported result, not a live connection."} Schema {result.schema_version}.
        </p>
      </details>
      <Dialog open={evidenceOpen} onClose={() => setEvidenceOpen(false)} title="Evidence" className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <div className="space-y-5">
          <button type="button" className="ds-press rounded-full bg-[#F0F3EE] px-4 py-2 text-[15px] font-semibold text-[#17201D]" onClick={() => setEvidenceOpen(false)}>
            Close evidence
          </button>
          {result.findings.map((finding) => (
            <article key={finding.id} className="space-y-2">
              <p className="text-[18px] font-semibold text-[#17201D]">{finding.text}</p>
              <p className={findingChip(finding.status)}>{finding.status} · {FINDING_LABEL[finding.status]}</p>
              <p className="text-[16px] leading-7 text-[#4E5954]">{finding.reason}</p>
              <ul className="space-y-3">
                {finding.evidence_ids.map((evidenceId) => {
                  const evidence = result.evidence.find((item) => item.id === evidenceId);
                  const source = result.sources.find((item) => item.id === evidence?.source_id);
                  if (!evidence || !source) return null;
                  return (
                    <li key={evidence.id} className="rounded-[18px] bg-[#F7F8F4] px-4 py-3">
                      <p className="text-[16px] font-semibold text-[#17201D]">{source.title}</p>
                      <p className="text-[15px] text-[#4E5954]">{source.publisher}</p>
                      <p className="mt-2 text-[16px] leading-7 text-[#17201D]">{evidence.excerpt}</p>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[15px] font-semibold text-[#17785E]">
                        Open source
                      </a>
                      {evidence.retrieved_at ? <p className="text-[15px] text-[#4E5954]">Retrieved {evidence.retrieved_at.slice(0, 10)}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </Dialog>
      <Dialog open={confirmAdopt} onClose={() => setConfirmAdopt(false)} title="Use as next step">
        <p className="text-[16px] leading-7 text-[#17201D]">{suggestion?.text}</p>
        {replacesExisting ? (
          <p className="mt-3 text-[16px] leading-7 text-[#4E5954]">This replaces the next step already written for this opportunity. The research itself stays unchanged.</p>
        ) : (
          <p className="mt-3 text-[16px] leading-7 text-[#4E5954]">This becomes the next step. The research itself stays unchanged.</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="ds-press rounded-full bg-[#17785E] px-5 py-2.5 text-[15px] font-semibold text-white"
            onClick={() => {
              onAdopt();
              setConfirmAdopt(false);
            }}
          >
            Confirm
          </button>
          <button type="button" className="ds-press rounded-full px-5 py-2.5 text-[15px] font-semibold text-[#17201D]" onClick={() => setConfirmAdopt(false)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </section>
  );
}

function findingChip(status: FindingStatus): string {
  if (status === "supported") return "text-[15px] font-semibold text-[#17785E]";
  if (status === "contradicted") return "text-[15px] font-semibold text-[#A33B3B]";
  return "text-[15px] font-semibold text-[#C88924]";
}
