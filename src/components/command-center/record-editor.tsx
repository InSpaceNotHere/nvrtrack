"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField, FormGrid, FormStack } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StateChip } from "@/components/ui/state-chip";
import { Textarea } from "@/components/ui/textarea";
import {
  OPPORTUNITY_STATUSES,
  TASK_STATUSES,
  WORK_PRIORITIES,
  type LocalOpportunity,
  type LocalTask,
  type OpportunityStatus,
  type TaskStatus,
  type WorkPriority,
} from "@/lib/command-center/domain";
import type { OpportunityDraft, TaskDraft } from "@/lib/command-center/repository";

export function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function dateInputToIso(value: string): string | null {
  return value ? `${value}T12:00:00.000Z` : null;
}

export function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function TaskEditor({
  task,
  onSave,
  onDelete,
  onCancel,
}: {
  task: LocalTask | null;
  onSave: (input: TaskDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "open");
  const [priority, setPriority] = useState<WorkPriority>(task?.priority ?? "medium");
  const [dueAt, setDueAt] = useState(dateInputValue(task?.dueAt ?? null));
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <FormStack>
      <FormField label="Title">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </FormField>
      <FormField label="Description">
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
      </FormField>
      <FormGrid>
        <FormField label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {TASK_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={priority} onChange={(event) => setPriority(event.target.value as WorkPriority)}>
            {WORK_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </FormField>
      </FormGrid>
      <FormField label="Due date">
        <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={() =>
            onSave({
              title,
              description,
              status,
              priority,
              dueAt: dateInputToIso(dueAt),
            })
          }
          disabled={!title.trim()}
        >
          Save task
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        ) : null}
      </div>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete task">
        <p className="text-sm text-zinc-300">This removes the task from the local workspace.</p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              onDelete?.();
              setConfirmDelete(false);
            }}
          >
            Confirm delete
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </FormStack>
  );
}

export function OpportunityEditor({
  opportunity,
  onSave,
  onCancel,
}: {
  opportunity: LocalOpportunity | null;
  onSave: (input: OpportunityDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(opportunity?.title ?? "");
  const [problem, setProblem] = useState(opportunity?.problem ?? "");
  const [department, setDepartment] = useState(opportunity?.department ?? "");
  const [description, setDescription] = useState(opportunity?.description ?? "");
  const [recommendation, setRecommendation] = useState(opportunity?.recommendation ?? "");
  const [priority, setPriority] = useState<WorkPriority>(opportunity?.priority ?? "medium");
  const [status, setStatus] = useState<OpportunityStatus>(opportunity?.status ?? "identified");
  const [hours, setHours] = useState(
    opportunity?.estimatedHoursSavedMonthly === null || opportunity?.estimatedHoursSavedMonthly === undefined
      ? ""
      : String(opportunity.estimatedHoursSavedMonthly),
  );
  const [value, setValue] = useState(
    opportunity?.estimatedValueMonthly === null || opportunity?.estimatedValueMonthly === undefined
      ? ""
      : String(opportunity.estimatedValueMonthly),
  );

  return (
    <FormStack>
      <FormField label="Title">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </FormField>
      <FormGrid>
        <FormField label="Department">
          <Input value={department} onChange={(event) => setDepartment(event.target.value)} />
        </FormField>
        <FormField label="Priority">
          <Select value={priority} onChange={(event) => setPriority(event.target.value as WorkPriority)}>
            {WORK_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </FormField>
      </FormGrid>
      <FormField label="Status">
        <Select value={status} onChange={(event) => setStatus(event.target.value as OpportunityStatus)}>
          {OPPORTUNITY_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Problem">
        <Textarea value={problem} onChange={(event) => setProblem(event.target.value)} rows={3} />
      </FormField>
      <FormField label="Description">
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
      </FormField>
      <FormField label="Recommendation">
        <Textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} rows={2} />
      </FormField>
      <FormGrid>
        <FormField label="Estimated hours saved / month">
          <Input type="number" min="0" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} />
        </FormField>
        <FormField label="Estimated value / month ($)">
          <Input type="number" min="0" step="1" value={value} onChange={(event) => setValue(event.target.value)} />
        </FormField>
      </FormGrid>
      <StateChip state="estimated" label="Estimated" />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={!title.trim()}
          onClick={() =>
            onSave({
              title,
              problem,
              department,
              description,
              recommendation,
              priority,
              status,
              estimatedHoursSavedMonthly: optionalNumber(hours),
              estimatedValueMonthly: optionalNumber(value),
            })
          }
        >
          Save opportunity
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </FormStack>
  );
}
