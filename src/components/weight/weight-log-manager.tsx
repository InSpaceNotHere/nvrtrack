"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createWeightEntryAction,
  deleteWeightEntryAction,
  updateWeightEntryAction,
  type WeightActionInput,
} from "@/app/(protected)/actions/weight-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import { getTodayDateString } from "@/lib/nutrition/date";
import type { WeightEntryMetricPoint } from "@/lib/weight/metrics";
import { formatWeight } from "@/lib/weight/metrics";
import { roundWeight, type WeightUnit } from "@/lib/weight/conversions";
import { formatCalendarDate } from "@/lib/timezone";

interface WeightLogManagerProps {
  entries: WeightEntryMetricPoint[];
  displayUnit: WeightUnit;
  showHistory?: boolean;
  initialEntryDate?: string;
  defaultEditorOpen?: boolean;
}

interface FormState {
  weight: string;
  unit: WeightUnit;
  entryDate: string;
  note: string;
}

function toFormState(unit: WeightUnit, entryDate: string): FormState {
  return { weight: "", unit, entryDate, note: "" };
}

function formatEntryDate(date: string): string {
  return formatCalendarDate(date);
}

function formatRowDelta(delta: number | null, unit: WeightUnit): string {
  if (delta === null) {
    return "No prior entry";
  }
  if (delta === 0) {
    return `No change ${unit}`;
  }
  if (delta > 0) {
    return `+${roundWeight(delta, 1)} ${unit}`;
  }
  return `-${roundWeight(Math.abs(delta), 1)} ${unit}`;
}

export function WeightLogManager({
  entries,
  displayUnit,
  showHistory = true,
  initialEntryDate,
  defaultEditorOpen,
}: WeightLogManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const todayDateString = initialEntryDate ?? getTodayDateString("UTC");

  const [isEditorOpen, setIsEditorOpen] = useState(defaultEditorOpen ?? entries.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => toFormState(displayUnit, todayDateString));
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<WeightActionInput | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      entries.map((entry, index) => {
        const olderEntry = entries[index + 1] ?? null;
        const delta = olderEntry ? roundWeight(entry.weight - olderEntry.weight, 2) : null;
        return { entry, delta };
      }),
    [entries],
  );

  function resetForm() {
    setForm(toFormState(displayUnit, todayDateString));
    setEditingId(null);
    setDuplicatePrompt(null);
  }

  function setSuccessMessage(text: string) {
    setMessage(text);
    setIsError(false);
  }

  function setErrorMessage(text: string) {
    setMessage(text);
    setIsError(true);
  }

  function toActionInput(): WeightActionInput {
    return {
      weight: form.weight,
      unit: form.unit,
      entryDate: form.entryDate,
      note: form.note,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setDuplicatePrompt(null);

    const payload = toActionInput();

    startTransition(async () => {
      if (editingId) {
        const result = await updateWeightEntryAction(editingId, payload);
        if (result.status === "success") {
          setSuccessMessage(result.message);
          resetForm();
          setIsEditorOpen(false);
          router.refresh();
          return;
        }

        setErrorMessage(result.message);
        return;
      }

      const result = await createWeightEntryAction(payload);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        resetForm();
        setIsEditorOpen(false);
        router.refresh();
        return;
      }

      if (result.status === "duplicate") {
        setErrorMessage(result.message);
        setDuplicatePrompt(payload);
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function handleDuplicateReplace() {
    if (!duplicatePrompt) {
      return;
    }

    startTransition(async () => {
      const result = await createWeightEntryAction(duplicatePrompt, { replaceExisting: true });
      if (result.status === "success") {
        setSuccessMessage(result.message);
        resetForm();
        setIsEditorOpen(false);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function startEdit(entry: WeightEntryMetricPoint) {
    setEditingId(entry.id);
    setForm({
      weight: entry.sourceWeight.toString(),
      unit: entry.sourceUnit,
      entryDate: entry.entryDate,
      note: entry.note ?? "",
    });
    setIsEditorOpen(true);
    setMessage(null);
    setDuplicatePrompt(null);
    setConfirmDeleteId(null);
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteWeightEntryAction(entryId);
      if (result.status === "success") {
        setSuccessMessage(result.message);
        setConfirmDeleteId(null);
        router.refresh();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-300">Weight Log</h3>
        <Button
          type="button"
          onClick={() =>
            setIsEditorOpen((value) => {
              const next = !value;
              if (next) {
                setEditingId(null);
                setForm(toFormState(displayUnit, todayDateString));
              }
              return next;
            })
          }
          variant="primary"
          size="sm"
          className="h-9 rounded-lg px-3 text-xs"
        >
          {isEditorOpen ? "Close" : "Log Weight"}
        </Button>
      </div>

      {isEditorOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Weight</span>
              <Input
                type="number"
                min={45}
                max={1400}
                step="0.1"
                value={form.weight}
                onChange={(event) => setForm((state) => ({ ...state, weight: event.target.value }))}
                className="app-input"
                required
              />
            </label>

            <label className="space-y-1.5 text-sm text-zinc-300">
              <span>Unit</span>
              <Select
                value={form.unit}
                onChange={(event) =>
                  setForm((state) => ({ ...state, unit: event.target.value === "kg" ? "kg" : "lb" }))
                }
                className="app-input"
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </Select>
            </label>
          </div>

          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Entry date</span>
            <DatePicker value={form.entryDate} onChange={(event) => setForm((state) => ({ ...state, entryDate: event.target.value }))} className="app-input" required />
          </label>

          <label className="space-y-1.5 text-sm text-zinc-300">
            <span>Note (optional)</span>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))}
              maxLength={280}
              rows={2}
              className="text-sm"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={isPending} variant="primary" className="h-10 rounded-xl px-4 text-sm">
              {isPending ? "Saving..." : editingId ? "Save Changes" : "Save Entry"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                resetForm();
              }}
              variant="secondary"
              className="h-10 rounded-xl px-4 text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {duplicatePrompt ? (
        <div className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-zinc-200">
          <p>An entry already exists on {duplicatePrompt.entryDate}. Replace it with this new value?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" onClick={handleDuplicateReplace} disabled={isPending} variant="primary" size="sm" className="h-8 rounded-lg px-3 text-xs">
              {isPending ? "Updating..." : "Update Existing Entry"}
            </Button>
            <Button type="button" onClick={() => setDuplicatePrompt(null)} variant="secondary" size="sm" className="h-8 rounded-lg px-3 text-xs">
              Keep Current Entry
            </Button>
          </div>
        </div>
      ) : null}

      {message ? <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"}>{message}</Toast> : null}

      {showHistory ? (
        entries.length ? (
          <ul className="space-y-2">
            {rows.map(({ entry, delta }) => (
              <li key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-white">{formatWeight(entry.weight, displayUnit)}</p>
                    <p className="text-xs text-zinc-400">{formatEntryDate(entry.entryDate)}</p>
                    {entry.note ? <p className="mt-1 text-xs text-zinc-500">{entry.note.slice(0, 100)}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Change</p>
                    <p
                      className={`text-sm font-medium ${
                        delta === null ? "text-zinc-300" : delta < 0 ? "text-rose-300" : "text-zinc-200"
                      }`}
                    >
                      {formatRowDelta(delta, displayUnit)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button type="button" onClick={() => startEdit(entry)} variant="secondary" size="sm" className="h-7 rounded-md px-2.5 py-1 text-xs" aria-label={`Edit weight entry from ${formatEntryDate(entry.entryDate)}`}>
                    Edit
                  </Button>
                  {confirmDeleteId === entry.id ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" onClick={() => handleDelete(entry.id)} disabled={isPending} variant="danger" size="sm" className="h-7 rounded-md px-2.5 py-1 text-xs" aria-label={`Confirm delete weight entry from ${formatEntryDate(entry.entryDate)}`}>
                        {isPending ? "Deleting..." : "Confirm Delete"}
                      </Button>
                      <Button type="button" onClick={() => setConfirmDeleteId(null)} variant="secondary" size="sm" className="h-7 rounded-md px-2.5 py-1 text-xs">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" onClick={() => setConfirmDeleteId(entry.id)} variant="danger" size="sm" className="h-7 rounded-md px-2.5 py-1 text-xs" aria-label={`Delete weight entry from ${formatEntryDate(entry.entryDate)}`}>
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
            <p className="text-sm font-medium text-zinc-200">No weight entries yet.</p>
            <p className="mt-1 text-sm text-zinc-400">
              Log your first weigh-in to activate trend lines and rolling averages.
            </p>
          </div>
        )
      ) : null}
    </section>
  );
}
