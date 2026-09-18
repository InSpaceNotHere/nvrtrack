"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteWeeklyJournalAction, upsertWeeklyJournalAction } from "@/app/(protected)/actions/progress-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import type { WeeklyJournalEntryRow } from "@/lib/data/weekly-journal";
import { formatCalendarDate } from "@/lib/timezone";

interface WeeklyJournalManagerProps {
  entries: WeeklyJournalEntryRow[];
  initialWeekStart: string;
}

function formatDate(date: string): string {
  return formatCalendarDate(date);
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
          <DatePicker value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="app-input h-9 text-sm" />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Mood</span>
            <Input value={mood} onChange={(event) => setMood(event.target.value)} className="app-input h-9 text-sm" maxLength={80} />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Recovery (1-10)</span>
            <Input
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
            <Input value={energy} onChange={(event) => setEnergy(event.target.value)} type="number" min={1} max={10} className="app-input h-9 text-sm" />
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Sleep hours</span>
          <Input value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} type="number" min={0} max={24} step="0.1" className="app-input h-9 text-sm" />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Notes</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="text-sm"
            maxLength={4000}
          />
        </label>
        <Button type="submit" disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
          {isPending ? "Saving..." : "Save Weekly Journal"}
        </Button>
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
                  <Button type="button" onClick={() => handleDelete(entry.id)} variant="danger" size="sm" className="h-7 rounded-md px-2 py-1 text-[11px]">
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No weekly journal entries yet.</p>
        )}
      </div>

      {message ? <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"}>{message}</Toast> : null}
    </div>
  );
}
