import type { FoodEntryRow } from "@/lib/data/auth-context";

export function removeFoodEntryById(entries: FoodEntryRow[], entryId: string): FoodEntryRow[] {
  return entries.filter((entry) => entry.id !== entryId);
}

export function replaceFoodEntry(entries: FoodEntryRow[], next: FoodEntryRow): FoodEntryRow[] {
  return entries.map((entry) => (entry.id === next.id ? next : entry));
}
