"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EvidenceType } from "@/lib/command-center/domain";
import { readChange, resultStory } from "@/lib/command-center/improvement";

const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  measured: "Measured",
  self_reported: "Self-reported",
  estimated: "Estimated",
  missing: "Missing",
};

export function ResultsView() {
  const { ready, workspace, createMetric, recordObservation } = useWorkspace();
  const [message, setMessage] = useState<string | null>(null);
  if (!ready || !workspace) return <p className="text-[17px] text-[#65706B]">Opening results…</p>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">Results</h1>
        <p className="mt-2 max-w-xl text-[17px] leading-7 text-[#65706B]">Did the change actually help?</p>
      </header>
      {workspace.implementations.length === 0 ? (
        <p className="text-[17px] text-[#17201D]">No improvement has been planned yet, so there is nothing to measure.</p>
      ) : (
        workspace.implementations.map((implementation) => {
          const metrics = workspace.metrics.filter((metric) => metric.implementationId === implementation.id);
          return (
            <section key={implementation.id} className="space-y-4 rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_36px_rgba(23,32,29,0.05)]">
              <h2 className="text-[22px] font-semibold text-[#17201D]">{implementation.name}</h2>
              {metrics.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-[17px] text-[#17201D]">Baseline not established yet.</p>
                  <p className="text-[16px] text-[#65706B]">We need a starting measurement.</p>
                  <MetricForm
                    onCreate={(input) => setMessage(createMetric({ ...input, implementationId: implementation.id }))}
                  />
                </div>
              ) : (
                metrics.map((metric) => {
                  const observations = workspace.observations.filter((item) => item.metricId === metric.id);
                  const reading = readChange(metric, observations);
                  return (
                    <div key={metric.id} className="space-y-3">
                      <p className="text-[18px] font-semibold text-[#17201D]">
                        {metric.name} <span className="font-normal text-[#65706B]">({metric.unit})</span>
                      </p>
                      <p className="text-[17px] text-[#17201D]">{resultStory({ status: implementation.status, reading })}</p>
                      {reading.kind === "missing_baseline" ? <p className="text-[16px] text-[#65706B]">Baseline not established yet.</p> : null}
                      {reading.kind === "observed" ? (
                        <p className="text-[17px] text-[#17201D]">
                          Observed change: {reading.delta > 0 ? "+" : ""}
                          {reading.delta} {reading.unit}. This is the difference between two measured numbers, not proof of savings.
                        </p>
                      ) : null}
                      <ul className="space-y-1">
                        {observations.map((item) => (
                          <li key={item.id} className="text-[16px] text-[#17201D]">
                            {item.role === "baseline" ? "Starting point" : "Follow-up"}: {item.value ?? "—"} {metric.unit} · {EVIDENCE_LABEL[item.evidenceType]}
                            {item.periodLabel ? ` · ${item.periodLabel}` : ""}
                          </li>
                        ))}
                      </ul>
                      <ObservationForm metricId={metric.id} onSave={(input) => setMessage(recordObservation(input))} />
                    </div>
                  );
                })
              )}
            </section>
          );
        })
      )}
      {message ? <p className="text-[16px] text-[#17201D]">{message}</p> : null}
    </div>
  );
}

function MetricForm({ onCreate }: { onCreate: (input: { name: string; unit: string; desiredDirection: "higher" | "lower" }) => void }) {
  const [name, setName] = useState("Average response time");
  const [unit, setUnit] = useState("hours");
  const [direction, setDirection] = useState<"higher" | "lower">("lower");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input aria-label="Measurement name" value={name} onChange={(event) => setName(event.target.value)} />
      <Input aria-label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} />
      <label className="text-[16px] text-[#17201D]">
        Better when
        <select className="ds-input mt-1" value={direction} onChange={(event) => setDirection(event.target.value as "higher" | "lower")}>
          <option value="lower">Lower</option>
          <option value="higher">Higher</option>
        </select>
      </label>
      <Button type="button" variant="primary" className="rounded-full" onClick={() => onCreate({ name, unit, desiredDirection: direction })}>
        Create measurement
      </Button>
    </div>
  );
}

function ObservationForm({
  metricId,
  onSave,
}: {
  metricId: string;
  onSave: (input: {
    metricId: string;
    role: "baseline" | "follow_up";
    observedAt: string;
    periodLabel: string | null;
    value: number | null;
    evidenceType: EvidenceType;
    method: string | null;
    note: string | null;
    limitations: string | null;
  }) => void;
}) {
  const [role, setRole] = useState<"baseline" | "follow_up">("baseline");
  const [value, setValue] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("measured");
  const [periodLabel, setPeriodLabel] = useState("");
  const [method, setMethod] = useState("");
  const [limitations, setLimitations] = useState("");
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="ds-input" aria-label="Measurement role" value={role} onChange={(event) => setRole(event.target.value as "baseline" | "follow_up")}>
          <option value="baseline">Starting point</option>
          <option value="follow_up">Follow-up</option>
        </select>
        <select className="ds-input" aria-label="Evidence type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}>
          <option value="measured">Measured</option>
          <option value="self_reported">Self-reported</option>
          <option value="estimated">Estimated</option>
          <option value="missing">Missing</option>
        </select>
        <Input aria-label="Value" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Number, if you have one" />
        <Input aria-label="Period" value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} placeholder="Period, such as October" />
      </div>
      <Textarea aria-label="How it was measured" value={method} onChange={(event) => setMethod(event.target.value)} rows={2} placeholder="How was this observed?" />
      <Input aria-label="Limitations" value={limitations} onChange={(event) => setLimitations(event.target.value)} placeholder="Limitations" />
      <Button
        type="button"
        variant="secondary"
        className="rounded-full"
        onClick={() =>
          onSave({
            metricId,
            role,
            observedAt: new Date().toISOString(),
            periodLabel: periodLabel || null,
            value: value.trim() === "" ? null : Number(value),
            evidenceType,
            method: method || null,
            note: null,
            limitations: limitations || null,
          })
        }
      >
        Save measurement
      </Button>
    </div>
  );
}
