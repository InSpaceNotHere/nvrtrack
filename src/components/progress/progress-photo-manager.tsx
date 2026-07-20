"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { createProgressPhotoAction, deleteProgressPhotoAction } from "@/app/(protected)/actions/progress-actions";
import type { ProgressPhotoRow } from "@/lib/data/progress-photos";

interface ProgressPhotoManagerProps {
  photos: ProgressPhotoRow[];
}

type PhotoView = "front" | "side" | "back";

interface PendingFileState {
  dataUrl: string;
  filename: string;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupPhotosByDate(photos: ProgressPhotoRow[]) {
  const map = new Map<string, ProgressPhotoRow[]>();
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

function choosePhotoByView(photos: ProgressPhotoRow[], view: PhotoView): ProgressPhotoRow | null {
  return photos.find((photo) => photo.view === view) ?? null;
}

export function ProgressPhotoManager({ photos }: ProgressPhotoManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photoDate, setPhotoDate] = useState(todayDateString());
  const [view, setView] = useState<PhotoView>("front");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const [notes, setNotes] = useState("");
  const [fileState, setFileState] = useState<PendingFileState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const grouped = useMemo(() => groupPhotosByDate(photos), [photos]);
  const comparisonDates = useMemo(() => grouped.map(([date]) => date), [grouped]);
  const [leftDate, setLeftDate] = useState<string>(comparisonDates[0] ?? "");
  const [rightDate, setRightDate] = useState<string>(comparisonDates[1] ?? comparisonDates[0] ?? "");

  const photosByDate = useMemo(() => new Map(grouped), [grouped]);
  const leftPhotos = leftDate ? photosByDate.get(leftDate) ?? [] : [];
  const rightPhotos = rightDate ? photosByDate.get(rightDate) ?? [] : [];

  function setFeedback(nextMessage: string, tone: "success" | "error" = "success") {
    setMessage(nextMessage);
    setIsError(tone === "error");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileState(null);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setFeedback("Photo must be 4MB or smaller.", "error");
      setFileState(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setFeedback("Failed to read the selected file.", "error");
        return;
      }
      setFileState({ dataUrl: result, filename: file.name });
    };
    reader.onerror = () => setFeedback("Failed to read the selected file.", "error");
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fileState) {
      setFeedback("Select a photo before saving.", "error");
      return;
    }
    startTransition(async () => {
      const result = await createProgressPhotoAction({
        photoDate,
        view,
        imageDataUrl: fileState.dataUrl,
        weight,
        weightUnit,
        notes,
      });
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        setFileState(null);
        setWeight("");
        setNotes("");
        router.refresh();
      }
    });
  }

  function handleDelete(photoId: string) {
    startTransition(async () => {
      const result = await deleteProgressPhotoAction(photoId);
      setFeedback(result.message, result.status === "success" ? "success" : "error");
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3.5">
      <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Date</span>
            <input type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} className="app-input h-9 text-sm" />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            <span>View</span>
            <select value={view} onChange={(event) => setView(event.target.value as PhotoView)} className="app-input h-9 text-sm">
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
            </select>
          </label>
        </div>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Photo</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="app-input h-9 text-sm file:mr-2 file:text-xs" />
          {fileState ? <p className="text-[11px] text-zinc-500">{fileState.filename}</p> : null}
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-zinc-400">
            <span>Weight (optional)</span>
            <input
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
            <select value={weightUnit} onChange={(event) => setWeightUnit(event.target.value === "kg" ? "kg" : "lb")} className="app-input h-9 text-sm">
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </label>
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
          {isPending ? "Saving..." : "Save Photo"}
        </button>
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
                      <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">{photo.view}</p>
                      <div className="relative h-36 overflow-hidden rounded-md border border-white/10 bg-black/40">
                        <Image src={photo.image_data_url} alt={`${photo.view} progress check-in`} fill className="object-cover" sizes="200px" />
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {photo.weight ? `${photo.weight} ${photo.weight_unit ?? ""}` : "Weight not logged"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(photo.id)}
                        className="rounded-md border border-rose-400/35 px-2 py-1 text-[11px] text-rose-200 transition-colors hover:bg-rose-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No photos saved yet.</p>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-medium text-zinc-100">Compare Two Dates</h3>
        {comparisonDates.length >= 1 ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-zinc-400">
                <span>Left date</span>
                <select value={leftDate} onChange={(event) => setLeftDate(event.target.value)} className="app-input h-9 text-sm">
                  {comparisonDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-zinc-400">
                <span>Right date</span>
                <select value={rightDate} onChange={(event) => setRightDate(event.target.value)} className="app-input h-9 text-sm">
                  {comparisonDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
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
                        {photo ? <Image src={photo.image_data_url} alt={`${angle} ${leftDate}`} fill className="object-cover" sizes="120px" /> : null}
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
                        {photo ? <Image src={photo.image_data_url} alt={`${angle} ${rightDate}`} fill className="object-cover" sizes="120px" /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-500">Save at least one check-in date to compare.</p>
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
