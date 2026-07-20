"use server";

import { revalidatePath } from "next/cache";

import {
  createMyProgressPhoto,
  deleteMyProgressPhoto,
  type ProgressPhotoView,
} from "@/lib/data/progress-photos";
import {
  deleteMyBodyMeasurementEntry,
  upsertMyBodyMeasurementEntry,
} from "@/lib/data/body-measurements";
import { upsertMyWeeklyJournalEntry } from "@/lib/data/weekly-journal";

function revalidateProgressViews() {
  revalidatePath("/");
  revalidatePath("/progress");
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

export async function createProgressPhotoAction(input: {
  photoDate: string;
  view: ProgressPhotoView;
  imageDataUrl: string;
  weight?: string;
  weightUnit?: "lb" | "kg";
  notes?: string;
}): Promise<{ status: "success" | "error"; message: string }> {
  if (!isValidDateString(input.photoDate)) {
    return { status: "error", message: "Photo date must be valid." };
  }
  if (!input.imageDataUrl.trim()) {
    return { status: "error", message: "Photo image is required." };
  }
  const result = await createMyProgressPhoto({
    photo_date: input.photoDate,
    view: input.view,
    image_data_url: input.imageDataUrl,
    weight: parseOptionalNumber(input.weight),
    weight_unit: input.weightUnit ?? null,
    notes: input.notes ?? null,
  });
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Progress photo saved." };
}

export async function deleteProgressPhotoAction(photoId: string): Promise<{ status: "success" | "error"; message: string }> {
  const result = await deleteMyProgressPhoto(photoId);
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Progress photo deleted." };
}

export async function upsertBodyMeasurementAction(input: {
  entryDate: string;
  measurements: Record<string, number>;
  customMeasurements: Record<string, number>;
  notes?: string;
}): Promise<{ status: "success" | "error"; message: string }> {
  if (!isValidDateString(input.entryDate)) {
    return { status: "error", message: "Entry date must be valid." };
  }
  const result = await upsertMyBodyMeasurementEntry({
    entry_date: input.entryDate,
    measurements: input.measurements,
    custom_measurements: input.customMeasurements,
    notes: input.notes ?? null,
  });
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Measurements saved." };
}

export async function deleteBodyMeasurementAction(entryId: string): Promise<{ status: "success" | "error"; message: string }> {
  const result = await deleteMyBodyMeasurementEntry(entryId);
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Measurement entry deleted." };
}

export async function upsertWeeklyJournalAction(input: {
  weekStart: string;
  notes?: string;
  mood?: string;
  recovery?: number | null;
  energy?: number | null;
  sleepHours?: number | null;
}): Promise<{ status: "success" | "error"; message: string }> {
  if (!isValidDateString(input.weekStart)) {
    return { status: "error", message: "Week start must be valid." };
  }
  const result = await upsertMyWeeklyJournalEntry({
    week_start: input.weekStart,
    notes: input.notes ?? null,
    mood: input.mood ?? null,
    recovery: input.recovery ?? null,
    energy: input.energy ?? null,
    sleep_hours: input.sleepHours ?? null,
  });
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Weekly journal saved." };
}
