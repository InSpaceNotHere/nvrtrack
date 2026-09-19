"use client";
/* eslint-disable @next/next/no-img-element -- signed Supabase URLs are dynamic and not Next image-loader compatible */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createProgressPhotoAction,
  deleteProgressPhotoAction,
  loadProgressPhotoComparisonAction,
  loadProgressPhotoPageAction,
} from "@/app/(protected)/actions/progress-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StateChip } from "@/components/ui/state-chip";
import { Toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import type { ProgressPhotoSignedRow } from "@/lib/data/progress-photos";
import { formatCalendarDate } from "@/lib/timezone";

interface ProgressPhotoManagerProps {
  initialRows: ProgressPhotoSignedRow[];
  initialNextOffset: number | null;
  availableDates: string[];
  todayDate: string;
}

type PhotoView = "front" | "side" | "back";

function formatDate(date: string): string {
  return formatCalendarDate(date);
}

function groupPhotosByDate(photos: ProgressPhotoSignedRow[]) {
  const map = new Map<string, ProgressPhotoSignedRow[]>();
  for (const photo of photos) {
    const list = map.get(photo.photo_date);
    if (list) {
      list.push(photo);
    } else {
      map.set(photo.photo_date, [photo]);
    }
  }
  return [...map.entries()].sort((left, right) => (left[0] < right[0] ? 1 : -1));
}

function choosePhotoByView(photos: ProgressPhotoSignedRow[], view: PhotoView): ProgressPhotoSignedRow | null {
  return photos.find((photo) => photo.view === view) ?? null;
}

export function ProgressPhotoManager({ initialRows, initialNextOffset, availableDates, todayDate }: ProgressPhotoManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photoDate, setPhotoDate] = useState(todayDate);
  const [view, setView] = useState<PhotoView>("front");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ProgressPhotoSignedRow[]>(initialRows);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const grouped = useMemo(() => groupPhotosByDate(rows), [rows]);
  const comparisonDates = availableDates;
  const [leftDate, setLeftDate] = useState<string>(comparisonDates[0] ?? "");
  const [rightDate, setRightDate] = useState<string>(comparisonDates[1] ?? comparisonDates[0] ?? "");

  const photosByDate = useMemo(() => new Map(grouped), [grouped]);
  const leftPhotos = leftDate ? photosByDate.get(leftDate) ?? [] : [];
  const rightPhotos = rightDate ? photosByDate.get(rightDate) ?? [] : [];

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("photoDate", photoDate);
    formData.set("view", view);
    formData.set("weight", weight);
    formData.set("weightUnit", weightUnit);
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await createProgressPhotoAction(formData);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        setWeight("");
        setNotes("");
        form.reset();
        router.refresh();
      }
    });
  }

  function handleDelete(photoId: string) {
    startTransition(async () => {
      const result = await deleteProgressPhotoAction(photoId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        setRows((existing) => existing.filter((row) => row.id !== photoId));
        router.refresh();
      }
    });
  }

  function handleLoadMore() {
    if (nextOffset === null) {
      return;
    }
    startTransition(async () => {
      const result = await loadProgressPhotoPageAction(nextOffset);
      if (result.status === "error") {
        setFeedback(result.message, "error");
        return;
      }
      setRows((existing) => {
        const seen = new Set(existing.map((row) => row.id));
        const additions = result.rows.filter((row) => !seen.has(row.id));
        return [...existing, ...additions];
      });
      setNextOffset(result.nextOffset);
    });
  }

  async function ensureComparisonRows() {
    if (!leftDate && !rightDate) {
      return;
    }
    const hasLeft = leftDate ? rows.some((row) => row.photo_date === leftDate) : true;
    const hasRight = rightDate ? rows.some((row) => row.photo_date === rightDate) : true;
    if (hasLeft && hasRight) {
      return;
    }
    const result = await loadProgressPhotoComparisonAction(leftDate, rightDate);
    if (result.status === "error") {
      setFeedback(result.message, "error");
      return;
    }
    setRows((existing) => {
      const seen = new Set(existing.map((row) => row.id));
      const additions = result.rows.filter((row) => !seen.has(row.id));
      return [...existing, ...additions];
    });
  }

  return (
    <div className="space-y-3.5">
      <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Date</span>
            <DatePicker value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} className="app-input h-9 text-sm" />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>View</span>
            <Select value={view} onChange={(event) => setView(event.target.value as PhotoView)} className="app-input h-9 text-sm">
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
            </Select>
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Photo</span>
          <Input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="app-input h-9 text-sm file:mr-2 file:text-xs" />
          <p className="text-[11px] text-zinc-500">JPEG, PNG, or WebP up to 4MB.</p>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Weight (optional)</span>
            <Input
              type="number"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="app-input h-9 text-sm"
              min={0}
              step="0.1"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Unit</span>
            <Select value={weightUnit} onChange={(event) => setWeightUnit(event.target.value === "kg" ? "kg" : "lb")} className="app-input h-9 text-sm">
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </Select>
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Notes (optional)</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="text-sm"
            rows={2}
            maxLength={1000}
          />
        </label>
        <Button type="submit" disabled={isPending} variant="primary" size="sm" className="h-9 rounded-lg px-3 text-xs">
          {isPending ? "Saving..." : "Save Photo"}
        </Button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-300">Timeline</h3>
        {grouped.length ? (
          <ul className="space-y-2">
            {grouped.map(([date, rows]) => (
              <li key={date} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-zinc-100">{formatDate(date)}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {rows.map((photo) => (
                    <div key={photo.id} className="space-y-1 rounded-lg border border-white/10 bg-black/25 p-2">
                      <StateChip state="neutral" label={photo.view} className="text-[10px]" />
                      <div className="relative h-36 overflow-hidden rounded-md border border-white/10 bg-black/40">
                        {photo.signed_url ? (
                          <img
                            src={photo.signed_url}
                            alt={`${photo.view} progress check-in`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {photo.weight ? `${photo.weight} ${photo.weight_unit ?? ""}` : "Weight not logged"}
                      </p>
                      {photo.notes ? <p className="text-[11px] text-zinc-400">{photo.notes}</p> : null}
                      <Button type="button" onClick={() => handleDelete(photo.id)} variant="danger" size="sm" className="h-7 rounded-md px-2 py-1 text-[11px]">
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-1">
            <StateChip state="missing" label="No photos saved" />
            <p className="text-sm text-zinc-500">No photos saved yet.</p>
          </div>
        )}
        {nextOffset !== null ? (
          <Button type="button" onClick={handleLoadMore} disabled={isPending} variant="secondary" size="sm" className="h-8 rounded-md px-2.5 text-xs">
            {isPending ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-medium text-zinc-100">Compare Two Dates</h3>
        {comparisonDates.length >= 1 ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-zinc-400">
                <span>Left date</span>
                <Select value={leftDate} onChange={(event) => setLeftDate(event.target.value)} className="app-input h-9 text-sm">
                  {comparisonDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-xs text-zinc-400">
                <span>Right date</span>
                <Select value={rightDate} onChange={(event) => setRightDate(event.target.value)} className="app-input h-9 text-sm">
                  {comparisonDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-zinc-400">{leftDate ? formatDate(leftDate) : "Left date"}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {( ["front", "side", "back"] as PhotoView[]).map((angle) => {
                    const photo = choosePhotoByView(leftPhotos, angle);
                    return (
                      <div key={`left-${angle}`} className="relative h-24 rounded-md border border-white/10 bg-black/30">
                        {photo?.signed_url ? (
                          <img src={photo.signed_url} alt={`${angle} ${leftDate}`} className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-400">{rightDate ? formatDate(rightDate) : "Right date"}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {( ["front", "side", "back"] as PhotoView[]).map((angle) => {
                    const photo = choosePhotoByView(rightPhotos, angle);
                    return (
                      <div key={`right-${angle}`} className="relative h-24 rounded-md border border-white/10 bg-black/30">
                        {photo?.signed_url ? (
                          <img
                            src={photo.signed_url}
                            alt={`${angle} ${rightDate}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 rounded-md px-2.5 text-xs"
              onClick={() => {
                startTransition(async () => {
                  await ensureComparisonRows();
                });
              }}
            >
              Load Selected Dates
            </Button>
          </>
        ) : (
          <div className="space-y-1">
            <StateChip state="missing" label="Comparison unavailable" />
            <p className="text-xs text-zinc-500">Save at least one check-in date to compare.</p>
          </div>
        )}
      </div>

      {message ? <Toast tone={isError ? "error" : "success"} role={isError ? "alert" : "status"}>{message}</Toast> : null}
    </div>
  );
}
