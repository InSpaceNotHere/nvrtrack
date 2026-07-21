"use server";

import { revalidatePath } from "next/cache";

import {
  createMyProgressPhotoMetadata,
  getMyProgressPhotoPage,
  getMyProgressPhotosForDates,
  deleteMyProgressPhoto,
  type ProgressPhotoSignedRow,
  type ProgressPhotoView,
} from "@/lib/data/progress-photos";
import {
  deleteMyBodyMeasurementEntry,
  upsertMyBodyMeasurementEntry,
} from "@/lib/data/body-measurements";
import { deleteMyWeeklyJournalEntry, upsertMyWeeklyJournalEntry } from "@/lib/data/weekly-journal";
import { getAuthenticatedContext } from "@/lib/data/auth-context";

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

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"] as const);
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function isValidSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  return "webp";
}

export async function createProgressPhotoAction(formData: FormData): Promise<{ status: "success" | "error"; message: string }> {
  const photoDate = String(formData.get("photoDate") ?? "");
  const view = String(formData.get("view") ?? "") as ProgressPhotoView;
  const weightValue = String(formData.get("weight") ?? "");
  const weightUnit = String(formData.get("weightUnit") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const fileValue = formData.get("photo");

  if (!isValidDateString(photoDate)) {
    return { status: "error", message: "Photo date must be valid." };
  }
  if (view !== "front" && view !== "side" && view !== "back") {
    return { status: "error", message: "Photo view must be front, side, or back." };
  }
  if (!(fileValue instanceof File)) {
    return { status: "error", message: "Photo file is required." };
  }
  if (fileValue.size <= 0) {
    return { status: "error", message: "Photo file is empty." };
  }
  if (fileValue.size > MAX_FILE_BYTES) {
    return { status: "error", message: "Photo file must be 4MB or smaller." };
  }
  if (!ALLOWED_MIME_TYPES.has(fileValue.type as "image/jpeg" | "image/png" | "image/webp")) {
    return { status: "error", message: "Only JPEG, PNG, and WebP are allowed." };
  }
  const bytes = new Uint8Array(await fileValue.arrayBuffer());
  if (!isValidSignature(fileValue.type, bytes)) {
    return { status: "error", message: "File signature does not match the selected image type." };
  }

  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return { status: "error", message: auth.error.message };
  }
  const extension = extensionFromMimeType(fileValue.type);
  const storagePath = `${auth.data.user.id}/${photoDate}/${view}-${crypto.randomUUID()}.${extension}`;
  const uploadResult = await auth.data.supabase.storage.from("progress-photos").upload(storagePath, fileValue, {
    contentType: fileValue.type,
    upsert: false,
  });
  if (uploadResult.error) {
    return { status: "error", message: "Failed to upload photo to storage." };
  }

  const metadataResult = await createMyProgressPhotoMetadata({
    photo_date: photoDate,
    view,
    storage_path: storagePath,
    mime_type: fileValue.type as "image/jpeg" | "image/png" | "image/webp",
    byte_size: fileValue.size,
    original_filename: fileValue.name || `${view}.${extension}`,
    weight: parseOptionalNumber(weightValue),
    weight_unit: weightUnit === "kg" ? "kg" : weightUnit === "lb" ? "lb" : null,
    notes,
  });
  if (metadataResult.error) {
    await auth.data.supabase.storage.from("progress-photos").remove([storagePath]);
    return { status: "error", message: metadataResult.error.message };
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

export async function loadProgressPhotoPageAction(
  offset: number,
): Promise<{ status: "success" | "error"; message: string; rows: ProgressPhotoSignedRow[]; nextOffset: number | null }> {
  const result = await getMyProgressPhotoPage(offset, 24);
  if (result.error || !result.data) {
    return {
      status: "error",
      message: result.error?.message ?? "Failed to load progress photos.",
      rows: [],
      nextOffset: null,
    };
  }
  return {
    status: "success",
    message: "Progress photos loaded.",
    rows: result.data.rows,
    nextOffset: result.data.nextOffset,
  };
}

export async function loadProgressPhotoComparisonAction(
  leftDate: string,
  rightDate: string,
): Promise<{ status: "success" | "error"; message: string; rows: ProgressPhotoSignedRow[] }> {
  const result = await getMyProgressPhotosForDates([leftDate, rightDate]);
  if (result.error || !result.data) {
    return {
      status: "error",
      message: result.error?.message ?? "Failed to load comparison photos.",
      rows: [],
    };
  }
  return {
    status: "success",
    message: "Comparison photos loaded.",
    rows: result.data,
  };
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

export async function deleteWeeklyJournalAction(entryId: string): Promise<{ status: "success" | "error"; message: string }> {
  const result = await deleteMyWeeklyJournalEntry(entryId);
  if (result.error) {
    return { status: "error", message: result.error.message };
  }
  revalidateProgressViews();
  return { status: "success", message: "Weekly journal deleted." };
}
