import type { WorkoutTemplateRow, WorkoutWeekdayScheduleRow } from "../data/workout-planner";
import { READY_MADE_PRESETS } from "./ready-made-presets";

const PRESET_MARKER = /^nvrtrack-preset:([^:]+):/;

export function hasAssignedWeeklyProgram(weekdayRows: WorkoutWeekdayScheduleRow[]): boolean {
  return weekdayRows.some((row) => Boolean(row.template_id) || row.is_rest_day);
}

export interface CurrentProgramSummary {
  name: string;
  frequencyLabel: string;
  splitLabel: string | null;
  nextLabel: string | null;
}

export interface WeekProgramDay {
  date: string;
  weekdayLabel: string;
  status: string;
  workoutLabel: string;
}

function presetTitleForId(presetId: string): string | null {
  return READY_MADE_PRESETS.find((preset) => preset.id === presetId)?.title ?? null;
}

function presetIdFromNotes(notes: string | null): string | null {
  if (!notes) {
    return null;
  }
  const match = notes.match(PRESET_MARKER);
  return match?.[1] ?? null;
}

function programNameFromTemplateName(name: string): string {
  const separator = " - ";
  const index = name.indexOf(separator);
  if (index <= 0) {
    return name;
  }
  return name.slice(0, index);
}

export function inferCurrentProgramSummary(input: {
  templates: WorkoutTemplateRow[];
  weekdayRows: WorkoutWeekdayScheduleRow[];
  weekDays: WeekProgramDay[];
  todayDate: string;
}): CurrentProgramSummary | null {
  if (!hasAssignedWeeklyProgram(input.weekdayRows)) {
    return null;
  }

  const templatesById = new Map(input.templates.map((template) => [template.id, template]));
  const assignedTemplates = input.weekdayRows
    .map((row) => (row.template_id ? templatesById.get(row.template_id) ?? null : null))
    .filter((template): template is WorkoutTemplateRow => Boolean(template));

  const presetIds = Array.from(
    new Set(assignedTemplates.map((template) => presetIdFromNotes(template.notes)).filter((id): id is string => Boolean(id))),
  );
  const nameFromPreset = presetIds.length === 1 ? presetTitleForId(presetIds[0]!) : null;
  const nameFromTemplates = Array.from(new Set(assignedTemplates.map((template) => programNameFromTemplateName(template.name))));
  const name = nameFromPreset ?? (nameFromTemplates.length === 1 ? nameFromTemplates[0]! : nameFromTemplates.length > 1 ? "Custom Program" : "Current Program");

  const trainingDays = input.weekdayRows.filter((row) => Boolean(row.template_id) && !row.is_rest_day).length;
  const restDays = input.weekdayRows.filter((row) => row.is_rest_day).length;
  const frequencyLabel = trainingDays > 0 ? `${trainingDays} days / week` : restDays > 0 ? "Rest schedule" : "Custom schedule";

  const typeLabels = Array.from(new Set(assignedTemplates.map((template) => template.template_type))).filter(Boolean);
  const splitLabel = typeLabels.length ? typeLabels.slice(0, 4).join(" / ") : null;

  const todayIndex = input.weekDays.findIndex((day) => day.date === input.todayDate);
  const ordered = todayIndex >= 0 ? [...input.weekDays.slice(todayIndex + 1), ...input.weekDays.slice(0, todayIndex)] : input.weekDays;
  const next = ordered.find((day) => day.status === "scheduled" || day.status === "planned");
  const nextLabel = next ? `${next.weekdayLabel} · ${next.workoutLabel}` : null;

  return {
    name,
    frequencyLabel,
    splitLabel,
    nextLabel,
  };
}
