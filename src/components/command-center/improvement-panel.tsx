"use client";

import { useState, type ReactNode } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ImplementationStatus, LocalImplementation, LocalOpportunity } from "@/lib/command-center/domain";
import { allowedTransitions } from "@/lib/command-center/improvement";

const STATUS_LABEL: Record<ImplementationStatus, string> = {
  planning: "Planning",
  approved: "Approved",
  building: "Building",
  testing: "Testing",
  live: "Live",
  measuring: "Measuring",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

export function ImprovementPanel({ opportunity }: { opportunity: LocalOpportunity }) {
  const workspaceApi = useWorkspace();
  const { workspace, createImplementation, transitionImplementation, pauseImplementation, resumeImplementation } = workspaceApi;
  const [planning, setPlanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!workspace) return null;
  const implementation = workspace.implementations.find((item) => item.opportunityId === opportunity.id) ?? null;

  return (
    <section className="mt-6 space-y-4 border-t border-[#F0F3EE] pt-6">
      <h3 className="text-[22px] font-semibold text-[#17201D]">Implementation</h3>
      {implementation ? (
        <ImplementationCard
          implementation={implementation}
          tasks={workspace.tasks.filter((task) => implementation.taskIds.includes(task.id))}
          onTransition={(status) => setMessage(transitionImplementation(implementation.id, status))}
          onPause={() => setMessage(pauseImplementation(implementation.id))}
          onResume={() => setMessage(resumeImplementation(implementation.id))}
        />
      ) : planning ? (
        <PlanForm
          opportunity={opportunity}
          onCancel={() => setPlanning(false)}
          onCreate={(input) => {
            const error = createImplementation(input);
            setMessage(error);
            if (!error) setPlanning(false);
          }}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-[17px] text-[#65706B]">No plan yet. Research does not start an implementation.</p>
          <Button type="button" variant="primary" className="rounded-full" onClick={() => setPlanning(true)}>
            Plan improvement
          </Button>
        </div>
      )}
      {message ? <p className="text-[16px] text-[#17201D]">{message}</p> : null}
    </section>
  );
}

function PlanForm({
  opportunity,
  onCancel,
  onCreate,
}: {
  opportunity: LocalOpportunity;
  onCancel: () => void;
  onCreate: (input: Parameters<ReturnType<typeof useWorkspace>["createImplementation"]>[0]) => void;
}) {
  const [name, setName] = useState(`${opportunity.title} improvements`);
  const [problem, setProblem] = useState(opportunity.problem ?? "");
  const [change, setChange] = useState(opportunity.recommendation ?? "");
  const [why, setWhy] = useState("");
  const [steps, setSteps] = useState("Confirm the current workflow");
  const [responsible, setResponsible] = useState("");
  const [success, setSuccess] = useState("");
  const [risks, setRisks] = useState("");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-3">
      <Field label="What problem are we solving?"><Textarea value={problem} onChange={(event) => setProblem(event.target.value)} rows={2} /></Field>
      <Field label="What will we change?"><Textarea value={change} onChange={(event) => setChange(event.target.value)} rows={2} /></Field>
      <Field label="Why does this approach make sense?"><Textarea value={why} onChange={(event) => setWhy(event.target.value)} rows={2} /></Field>
      <Field label="What steps are required? One step per line."><Textarea value={steps} onChange={(event) => setSteps(event.target.value)} rows={3} /></Field>
      <Field label="Who is responsible?"><Input value={responsible} onChange={(event) => setResponsible(event.target.value)} /></Field>
      <Field label="What will success look like?"><Input value={success} onChange={(event) => setSuccess(event.target.value)} /></Field>
      <Field label="What risks or prerequisites remain?"><Input value={risks} onChange={(event) => setRisks(event.target.value)} /></Field>
      <Field label="Name this improvement"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <p className="text-[16px] text-[#65706B]">Saving creates a draft. It is not approved to build.</p>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            className="rounded-full"
            onClick={() =>
              onCreate({
                opportunityId: opportunity.id,
                name,
                problem,
                proposedImprovement: change,
                chosenApproach: change,
                whySelected: why,
                nextAction: steps.split("\n").map((line) => line.trim()).find(Boolean) ?? null,
                targetDate: null,
                responsible,
                risks,
                successLooksLike: success,
                stepTitles: steps.split("\n"),
              })
            }
          >
            Confirm draft plan
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setConfirming(false)}>
            Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" className="rounded-full" onClick={() => setConfirming(true)} disabled={!name.trim()}>
            Review plan
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function ImplementationCard({
  implementation,
  tasks,
  onTransition,
  onPause,
  onResume,
}: {
  implementation: LocalImplementation;
  tasks: Array<{ id: string; title: string; status: string }>;
  onTransition: (status: ImplementationStatus) => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const next = allowedTransitions(implementation.status).filter((status) => status !== "paused");
  return (
    <div className="space-y-3 rounded-[24px] bg-[#F7F8F4] px-5 py-5">
      <p className="text-[20px] font-semibold text-[#17201D]">{implementation.name}</p>
      <p className="text-[17px] text-[#17201D]">Status: {STATUS_LABEL[implementation.status]}</p>
      {implementation.status === "planning" ? (
        <p className="text-[16px] text-[#65706B]">This is a draft. It is not approved to build or launch.</p>
      ) : null}
      {implementation.nextAction ? <p className="text-[17px] text-[#17201D]">Next step: {implementation.nextAction}</p> : null}
      {implementation.responsible ? <p className="text-[16px] text-[#65706B]">Responsible: {implementation.responsible}</p> : null}
      {tasks.length > 0 ? (
        <div>
          <p className="text-[16px] font-semibold text-[#17201D]">Linked work</p>
          <ul className="mt-1 space-y-1">
            {tasks.map((task) => (
              <li key={task.id} className="text-[16px] text-[#17201D]">
                {task.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <Button key={status} type="button" variant={status === "approved" ? "primary" : "secondary"} className="rounded-full" onClick={() => onTransition(status)}>
            {status === "approved" ? "Approve plan" : STATUS_LABEL[status]}
          </Button>
        ))}
        {implementation.status !== "paused" && implementation.status !== "completed" && implementation.status !== "cancelled" ? (
          <Button type="button" variant="ghost" className="rounded-full" onClick={onPause}>
            Pause
          </Button>
        ) : null}
        {implementation.status === "paused" ? (
          <Button type="button" variant="primary" className="rounded-full" onClick={onResume}>
            Resume
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-[16px] text-[#17201D]">
      <span>{label}</span>
      {children}
    </label>
  );
}
