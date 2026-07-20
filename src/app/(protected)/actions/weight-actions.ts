"use server";

import { revalidatePath } from "next/cache";

import {
  createWeightEntry,
  deleteWeightEntry,
  getWeightEntryByDate,
  updateWeightEntry,
  type UpdateWeightEntryInput,
} from "@/lib/data/weight";
import { MAX_NOTE_LENGTH, MAX_WEIGHT, MIN_WEIGHT } from "@/lib/weight/metrics";
import { isWeightUnit, roundWeight, type WeightUnit } from "@/lib/weight/conversions";

export interface WeightActionInput {
  weight: string;
  unit: string;
  entryDate: string;
  note?: string;
}

export interface WeightActionResult {
  status: "success" | "error" | "duplicate";
  message: string;
  duplicateEntryDate?: string;
}

interface NormalizedWeightInput {
  weight: number;
  unit: WeightUnit;
  entryDate: string;
  note: string | null;
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function normalizeWeightInput(input: WeightActionInput): { data: NormalizedWeightInput | null; error: string | null } {
  const trimmedWeight = input.weight.trim();
  const parsedWeight = Number(trimmedWeight);

  if (!trimmedWeight || Number.isNaN(parsedWeight)) {
    return { data: null, error: "Weight must be a valid number." };
  }

  if (parsedWeight <= 0) {
    return { data: null, error: "Weight must be greater than zero." };
  }

  if (parsedWeight < MIN_WEIGHT || parsedWeight > MAX_WEIGHT) {
    return { data: null, error: `Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}.` };
  }

  if (!isWeightUnit(input.unit)) {
    return { data: null, error: "Unit must be lb or kg." };
  }

  if (!isDateString(input.entryDate)) {
    return { data: null, error: "Entry date must be valid." };
  }

  const note = input.note?.trim() ?? "";
  if (note.length > MAX_NOTE_LENGTH) {
    return { data: null, error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
  }

  return {
    data: {
      weight: roundWeight(parsedWeight, 2),
      unit: input.unit,
      entryDate: input.entryDate,
      note: note.length ? note : null,
    },
    error: null,
  };
}

function revalidateWeightViews() {
  revalidatePath("/");
  revalidatePath("/progress");
}

function isDuplicateDateError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes("duplicate key value violates unique constraint") ||
    normalized.includes("weight_entries_user_id_entry_date_key")
  );
}

export async function createWeightEntryAction(
  input: WeightActionInput,
  options?: { replaceExisting: boolean },
): Promise<WeightActionResult> {
  const normalized = normalizeWeightInput(input);
  if (normalized.error || !normalized.data) {
    return { status: "error", message: normalized.error ?? "Invalid input." };
  }

  const existing = await getWeightEntryByDate(normalized.data.entryDate);
  if (existing.error) {
    return {
      status: "error",
      message: existing.error.message,
    };
  }

  if (existing.data) {
    if (!options?.replaceExisting) {
      return {
        status: "duplicate",
        message: "An entry already exists for this date. Update it instead?",
        duplicateEntryDate: normalized.data.entryDate,
      };
    }

    const updateResult = await updateWeightEntry(existing.data.id, {
      weight: normalized.data.weight,
      unit: normalized.data.unit,
      entry_date: normalized.data.entryDate,
      note: normalized.data.note,
    });

    if (updateResult.error) {
      return { status: "error", message: updateResult.error.message };
    }

    revalidateWeightViews();
    return { status: "success", message: "Weight entry updated." };
  }

  const createResult = await createWeightEntry({
    weight: normalized.data.weight,
    unit: normalized.data.unit,
    entry_date: normalized.data.entryDate,
    note: normalized.data.note,
  });

  if (createResult.error) {
    return { status: "error", message: createResult.error.message };
  }

  revalidateWeightViews();
  return { status: "success", message: "Weight entry saved." };
}

export async function updateWeightEntryAction(
  entryId: string,
  input: WeightActionInput,
): Promise<WeightActionResult> {
  if (!entryId) {
    return { status: "error", message: "Entry id is required." };
  }

  const normalized = normalizeWeightInput(input);
  if (normalized.error || !normalized.data) {
    return { status: "error", message: normalized.error ?? "Invalid input." };
  }

  const payload: UpdateWeightEntryInput = {
    weight: normalized.data.weight,
    unit: normalized.data.unit,
    entry_date: normalized.data.entryDate,
    note: normalized.data.note,
  };

  const updateResult = await updateWeightEntry(entryId, payload);

  if (updateResult.error) {
    if (isDuplicateDateError(updateResult.error.cause)) {
      return {
        status: "duplicate",
        message: "Another entry already exists for this date.",
        duplicateEntryDate: normalized.data.entryDate,
      };
    }

    return { status: "error", message: updateResult.error.message };
  }

  revalidateWeightViews();
  return { status: "success", message: "Weight entry updated." };
}

export async function deleteWeightEntryAction(entryId: string): Promise<WeightActionResult> {
  if (!entryId) {
    return { status: "error", message: "Entry id is required." };
  }

  const result = await deleteWeightEntry(entryId);
  if (result.error) {
    return { status: "error", message: result.error.message };
  }

  revalidateWeightViews();
  return { status: "success", message: "Weight entry deleted." };
}
