"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteWeeklyJournalAction, upsertWeeklyJournalAction } from "@/app/(protected)/actions/progress-actions";
import type { WeeklyJournalEntryRow } from "@/lib/data/weekly-journal";

interface WeeklyJournalManagerProps {
  entries: WeeklyJournalEntryRow[];
  initialWeekStart: string;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

export function WeeklyJournalManager({ entries, initialWeekStart }: WeeklyJournalManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("");
  const [recovery, setRecovery] = useState("5");
  const [energy, setEnergy] = useState("5");
  const [sleepHours, setSleepHours] = useState("8");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const entriesDescending = useMemo(
    () => [...entries].sort((left, right) => (left.week_start < right.week_start ? 1 : -1)),
    [entries],
  );

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertWeeklyJournalAction({
        weekStart,
        notes,
        mood,
        recovery: Number(recovery),
        energy: Number(energy),
        sleepHours: Number(sleepHours),
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      const result = await deleteWeeklyJournalAction(entryId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <form onSubmit={handleSave} className="space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-3">
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Week start (Monday)</span>
          <input value={weekStart} onChange={(event) => setWeekStart(event.target.value)} type="date" className="app-input h-9 text-sm" />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Mood</span>
            <input value={mood} onChange={(event) => setMood(event.target.value)} className="app-input h-9 text-sm" maxLength={80} />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Recovery (1-10)</span>
            <input
              value={recovery}
              onChange={(event) => setRecovery(event.target.value)}
              type="number"
              min={1}
              max={10}
              className="app-input h-9 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Energy (1-10)</span>
            <input value={energy} onChange={(event) => setEnergy(event.target.value)} type="number" min={1} max={10} className="app-input h-9 text-sm" />
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Sleep hours</span>
          <input value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} type="number" min={0} max={24} step="0.1" className="app-input h-9 text-sm" />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-accent/35"
            maxLength={4000}
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:bg-zinc-300"
        >
          {isPending ? "Saving..." : "Save Weekly Journal"}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-300">Journal History</h3>
        {entriesDescending.length ? (
          <ul className="space-y-2">
            {entriesDescending.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Week of {formatDate(entry.week_start)}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Mood: {entry.mood ?? "n/a"} • Recovery: {entry.recovery ?? "n/a"} • Energy: {entry.energy ?? "n/a"} • Sleep:{" "}
                      {entry.sleep_hours ?? "n/a"}h
                    </p>
                    {entry.notes ? <p className="mt-1.5 text-xs text-zinc-300">{entry.notes}</p> : null}
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
          <p className="text-sm text-zinc-500">No weekly journal entries yet.</p>
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
