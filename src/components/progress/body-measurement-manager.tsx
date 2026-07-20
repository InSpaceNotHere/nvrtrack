"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteBodyMeasurementAction, upsertBodyMeasurementAction } from "@/app/(protected)/actions/progress-actions";
import type { BodyMeasurementEntryRow } from "@/lib/data/body-measurements";
import {
  STANDARD_MEASUREMENT_FIELDS,
  buildMeasurementTrend,
  normalizeCustomMeasurementValues,
  normalizeMeasurementValues,
  type MeasurementTrendPoint,
} from "@/lib/progress/measurements";

interface BodyMeasurementManagerProps {
  entries: BodyMeasurementEntryRow[];
}

interface CustomMeasurementInput {
  id: string;
  name: string;
  value: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function formatFieldLabel(fieldId: string): string {
  return fieldId
    .replaceAll("_", " ")
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

function toSvgPoints(points: MeasurementTrendPoint[]): string {
  if (points.length <= 1) {
    return "";
  }
  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const range = Math.max(max - min, 0.01);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 35 - ((point.value - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(" ");
}

export function BodyMeasurementManager({ entries }: BodyMeasurementManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entryDate, setEntryDate] = useState(todayDateString());
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<CustomMeasurementInput[]>([]);
  const [selectedTrendField, setSelectedTrendField] = useState<string>(STANDARD_MEASUREMENT_FIELDS[0].id);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const customTrendFields = useMemo(() => {
    const fieldSet = new Set<string>();
    for (const entry of entries) {
      for (const key of Object.keys(entry.custom_measurements ?? {})) {
        fieldSet.add(key);
      }
    }
    return [...fieldSet].sort();
  }, [entries]);

  const trendFields = [
    ...STANDARD_MEASUREMENT_FIELDS.map((field) => ({ id: field.id, label: field.label })),
    ...customTrendFields.map((field) => ({ id: field, label: formatFieldLabel(field) })),
  ];
  const trendPoints = buildMeasurementTrend(entries, selectedTrendField);
  const trendPath = toSvgPoints(trendPoints);

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const standardMeasurements = normalizeMeasurementValues(values);
    const customMeasurements = normalizeCustomMeasurementValues(custom);
    if (Object.keys(standardMeasurements).length + Object.keys(customMeasurements).length === 0) {
      setFeedback("Enter at least one measurement value before saving.", "error");
      return;
    }
    startTransition(async () => {
      const result = await upsertBodyMeasurementAction({
        entryDate,
        measurements: standardMeasurements,
        customMeasurements,
        notes,
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        setValues({});
        setCustom([]);
        setNotes("");
        router.refresh();
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteBodyMeasurementAction(entryId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-3">
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Entry date</span>
          <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="app-input h-9 text-sm" />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {STANDARD_MEASUREMENT_FIELDS.map((field) => (
            <label key={field.id} className="space-y-1 text-xs text-zinc-400">
              <span>{field.label} (in)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={values[field.id] ?? ""}
                onChange={(event) => setValues((state) => ({ ...state, [field.id]: event.target.value }))}
                className="app-input h-9 text-sm"
              />
            </label>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-2.5">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-400">Custom Measurements</p>
          {custom.map((item) => (
            <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <input
                value={item.name}
                onChange={(event) =>
                  setCustom((rows) => rows.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)))
                }
                placeholder="Name"
                className="app-input h-9 text-sm"
              />
              <input
                value={item.value}
                onChange={(event) =>
                  setCustom((rows) => rows.map((row) => (row.id === item.id ? { ...row, value: event.target.value } : row)))
                }
                type="number"
                min={0}
                step="0.1"
                placeholder="Value"
                className="app-input h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setCustom((rows) => rows.filter((row) => row.id !== item.id))}
                className="rounded-md border border-white/15 px-2 text-xs text-zinc-100 transition-colors hover:bg-white/10"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setCustom((rows) => [...rows, { id: crypto.randomUUID(), name: "", value: "" }])
            }
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/10"
          >
            Add Custom
          </button>
        </div>

        <label className="space-y-1 text-xs text-zinc-400">
          <span>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
            rows={2}
            maxLength={1000}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:bg-zinc-300"
        >
          {isPending ? "Saving..." : "Save Measurements"}
        </button>
      </form>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-100">Measurement Trend</h3>
          <select
            value={selectedTrendField}
            onChange={(event) => setSelectedTrendField(event.target.value)}
            className="app-input h-8 text-xs"
          >
            {trendFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>
        </div>
        {trendPoints.length ? (
          <>
            <svg viewBox="0 0 100 40" className="h-20 w-full rounded-lg border border-white/10 bg-black/25">
              <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
              {trendPath ? (
                <polyline points={trendPath} fill="none" stroke="rgba(135,163,255,0.95)" strokeWidth="1.8" />
              ) : (
                <circle cx="50" cy="20" r="2.5" fill="rgba(135,163,255,0.95)" />
              )}
            </svg>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>{trendPoints[0]?.date}</span>
              <span>{trendPoints[trendPoints.length - 1]?.date}</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-500">No data for this field yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-300">History</h3>
        {entries.length ? (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{formatDate(entry.entry_date)}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {Object.entries(entry.measurements)
                        .slice(0, 3)
                        .map(([field, value]) => `${formatFieldLabel(field)}: ${value}`)
                        .join(" • ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-md border border-rose-400/35 px-2 py-1 text-[11px] text-rose-200 transition-colors hover:bg-rose-500/15"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No measurement history yet.</p>
        )}
      </div>

      {message ? (
        <p
          role={isError ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            isError ? "border border-rose-400/35 bg-rose-500/10 text-rose-200" : "border border-accent/40 bg-accent/10 text-zinc-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
