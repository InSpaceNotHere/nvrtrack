import { getExerciseCatalog } from "./exercise-catalog";
import { getAuthenticatedContext } from "./auth-context";
import {
  createWorkoutTemplate,
  getMyWeekdaySchedule,
  getMyWorkoutTemplateExercises,
  getMyWorkoutTemplates,
  replaceWorkoutTemplateExercises,
  setWeekdaySchedule,
  type WorkoutTemplateRow,
} from "./workout-planner";
import { fail, ok, type DataAccessResult } from "./result";
import {
  buildReadyMadePresetResolution,
  buildTemplateExerciseGuidanceLabel,
  type ReadyMadePresetId,
  type ReadyMadePresetResolvedDefinition,
} from "../training/ready-made-presets";

interface ImportReadyMadePresetInput {
  presetId: ReadyMadePresetId;
  applySchedule: boolean;
  confirmScheduleReplace: boolean;
}

export interface ImportReadyMadePresetResult {
  presetId: ReadyMadePresetId;
  presetTitle: string;
  kind: "weekly_program" | "focused_workout";
  importedTemplateNames: string[];
  appliedSchedule: boolean;
  requiresScheduleConfirmation: boolean;
}

interface PresetTemplateRecord {
  template: WorkoutTemplateRow;
  session: ReadyMadePresetResolvedDefinition["sessions"][number];
  wasCreated: boolean;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function buildPresetMarker(presetId: ReadyMadePresetId, sessionKey: string): string {
  return `nvrtrack-preset:${presetId}:${sessionKey}`;
}

function hasPresetMarker(notes: string | null | undefined, marker: string): boolean {
  if (!notes) {
    return false;
  }
  return notes.includes(marker);
}

function buildTemplateName(preset: ReadyMadePresetResolvedDefinition, sessionName: string): string {
  if (preset.kind === "focused_workout") {
    return preset.title;
  }
  return `${preset.title} - ${sessionName}`;
}

function buildTemplateNotes(preset: ReadyMadePresetResolvedDefinition, sessionKey: string): string {
  const marker = buildPresetMarker(preset.id, sessionKey);
  return `${marker}\nReady-made preset copy. Customize this template however you like.`;
}

function titleList(values: string[]): string {
  return values.join(", ");
}

async function ensurePresetTemplates(
  preset: ReadyMadePresetResolvedDefinition,
): Promise<DataAccessResult<PresetTemplateRecord[]>> {
  const [templatesResult, templateExercisesResult] = await Promise.all([getMyWorkoutTemplates(), getMyWorkoutTemplateExercises()]);
  if (templatesResult.error) {
    return templatesResult;
  }
  if (templateExercisesResult.error) {
    return templateExercisesResult;
  }

  const templateByLowerName = new Map<string, WorkoutTemplateRow>();
  for (const template of templatesResult.data) {
    templateByLowerName.set(normalizeName(template.name), template);
  }

  const templateExerciseCountByTemplateId = new Map<string, number>();
  for (const templateExercise of templateExercisesResult.data) {
    templateExerciseCountByTemplateId.set(
      templateExercise.template_id,
      (templateExerciseCountByTemplateId.get(templateExercise.template_id) ?? 0) + 1,
    );
  }

  const records: PresetTemplateRecord[] = [];
  for (const session of preset.sessions) {
    const marker = buildPresetMarker(preset.id, session.key);
    const templateName = buildTemplateName(preset, session.name);
    const markerMatch =
      templatesResult.data.find((template) => hasPresetMarker(template.notes, marker)) ?? null;

    if (markerMatch) {
      records.push({ template: markerMatch, session, wasCreated: false });
      continue;
    }

    const nameCollision = templateByLowerName.get(normalizeName(templateName)) ?? null;
    if (nameCollision && !hasPresetMarker(nameCollision.notes, marker)) {
      return fail({
        code: "INVALID_INPUT",
        message: `Template name collision: "${templateName}" already exists. Rename that template or import after changing your custom name.`,
      });
    }

    const created = await createWorkoutTemplate({
      name: templateName,
      template_type: session.templateType,
      estimated_duration_minutes: session.estimatedDurationMinutes,
      notes: buildTemplateNotes(preset, session.key),
    });
    if (created.error) {
      const retryLookup = await getMyWorkoutTemplates();
      if (retryLookup.error) {
        return fail({
          code: created.error.code,
          message: created.error.message,
        });
      }
      const retryMarkerMatch =
        retryLookup.data.find((template) => hasPresetMarker(template.notes, marker)) ?? null;
      if (retryMarkerMatch) {
        records.push({ template: retryMarkerMatch, session, wasCreated: false });
        continue;
      }
      const retryNameMatch =
        retryLookup.data.find((template) => normalizeName(template.name) === normalizeName(templateName)) ?? null;
      if (retryNameMatch && hasPresetMarker(retryNameMatch.notes, marker)) {
        records.push({ template: retryNameMatch, session, wasCreated: false });
        continue;
      }
      return fail({
        code: created.error.code,
        message: created.error.message,
      });
    }
    templateByLowerName.set(normalizeName(created.data.name), created.data);
    templateExerciseCountByTemplateId.set(created.data.id, 0);
    records.push({ template: created.data, session, wasCreated: true });
  }

  const catalogResult = await getExerciseCatalog({ limit: 1000 });
  if (catalogResult.error) {
    return fail({
      code: "DB_ERROR",
      message: catalogResult.error.message,
    });
  }
  const catalogById = new Map(catalogResult.data.map((exercise) => [exercise.id, exercise]));

  for (const record of records) {
    const exerciseCount = templateExerciseCountByTemplateId.get(record.template.id) ?? 0;
    if (!record.wasCreated && exerciseCount > 0) {
      continue;
    }

    const replace = await replaceWorkoutTemplateExercises(
      record.template.id,
      record.session.exercises.map((exercise, index) => {
        const catalogExercise = exercise.catalogExerciseId ? catalogById.get(exercise.catalogExerciseId) ?? null : null;
        return {
          position: index,
          exercise_name: exercise.resolvedName ?? exercise.requestedName,
          catalog_exercise_id: exercise.catalogExerciseId,
          exercise_id: null,
          primary_muscles: catalogExercise?.primary_muscles ?? [],
          secondary_muscles: catalogExercise?.secondary_muscles ?? [],
          body_region: catalogExercise?.body_region ?? null,
          movement_pattern: catalogExercise?.movement_pattern ?? null,
          notes: buildTemplateExerciseGuidanceLabel({
            workingSets: exercise.workingSets,
            repMin: exercise.repMin,
            repMax: exercise.repMax,
            restSecondsMin: exercise.restSecondsMin,
            restSecondsMax: exercise.restSecondsMax,
            isPerLeg: exercise.isPerLeg,
          }),
          working_sets: exercise.workingSets,
          rep_range_min: exercise.repMin,
          rep_range_max: exercise.repMax,
          rest_seconds_min: exercise.restSecondsMin,
          rest_seconds_max: exercise.restSecondsMax,
          is_per_leg: exercise.isPerLeg,
        };
      }),
    );

    if (replace.error) {
      return fail({
        code: replace.error.code,
        message: replace.error.message,
      });
    }
  }

  return ok(records);
}

async function maybeApplyPresetSchedule(
  preset: ReadyMadePresetResolvedDefinition,
  records: PresetTemplateRecord[],
  input: ImportReadyMadePresetInput,
): Promise<DataAccessResult<{ applied: boolean; requiresConfirmation: boolean }>> {
  if (!input.applySchedule || preset.kind !== "weekly_program") {
    return ok({ applied: false, requiresConfirmation: false });
  }

  const scheduleResult = await getMyWeekdaySchedule();
  if (scheduleResult.error) {
    return scheduleResult;
  }

  const templateIdBySessionKey = new Map(records.map((record) => [record.session.key, record.template.id]));
  const desiredByWeekday = new Map(
    preset.schedule.map((entry) => [
      entry.weekday,
      {
        templateId: entry.sessionKey ? templateIdBySessionKey.get(entry.sessionKey) ?? null : null,
        isRestDay: entry.isRestDay,
      },
    ]),
  );

  const currentByWeekday = new Map(
    scheduleResult.data.map((entry) => [
      entry.weekday,
      {
        templateId: entry.template_id,
        isRestDay: entry.is_rest_day,
      },
    ]),
  );

  let hasDifference = false;
  for (const [weekday, desired] of desiredByWeekday) {
    const current = currentByWeekday.get(weekday) ?? { templateId: null, isRestDay: false };
    if (current.templateId !== desired.templateId || current.isRestDay !== desired.isRestDay) {
      hasDifference = true;
      break;
    }
  }

  const hasExistingAssignments = scheduleResult.data.some(
    (entry) => entry.template_id !== null || entry.is_rest_day,
  );

  if (hasDifference && hasExistingAssignments && !input.confirmScheduleReplace) {
    return ok({ applied: false, requiresConfirmation: true });
  }

  for (const [weekday, desired] of desiredByWeekday) {
    const updated = await setWeekdaySchedule(weekday, {
      template_id: desired.templateId,
      is_rest_day: desired.isRestDay,
    });
    if (updated.error) {
      return fail({
        code: updated.error.code,
        message: updated.error.message,
      });
    }
  }

  return ok({ applied: hasDifference, requiresConfirmation: false });
}

export async function importReadyMadePreset(
  input: ImportReadyMadePresetInput,
): Promise<DataAccessResult<ImportReadyMadePresetResult>> {
  const auth = await getAuthenticatedContext();
  if (auth.error) {
    return auth;
  }

  const catalogResult = await getExerciseCatalog({ limit: 1000 });
  if (catalogResult.error) {
    return fail({
      code: "DB_ERROR",
      message: catalogResult.error.message,
    });
  }

  const resolution = buildReadyMadePresetResolution(catalogResult.data);
  const preset = resolution.presets.find((entry) => entry.id === input.presetId) ?? null;
  if (!preset) {
    return fail({
      code: "NOT_FOUND",
      message: "Preset not found.",
    });
  }

  const missingForPreset = resolution.missingExercises.filter((entry) => entry.presetId === preset.id);
  if (missingForPreset.length > 0) {
    return fail({
      code: "INVALID_INPUT",
      message: `Preset is missing required catalog mappings: ${titleList(
        missingForPreset.map((entry) => `${entry.requestedName} (${entry.sessionName})`),
      )}.`,
    });
  }

  const recordsResult = await ensurePresetTemplates(preset);
  if (recordsResult.error) {
    return recordsResult;
  }

  const applyResult = await maybeApplyPresetSchedule(preset, recordsResult.data, input);
  if (applyResult.error) {
    return applyResult;
  }

  return ok({
    presetId: preset.id,
    presetTitle: preset.title,
    kind: preset.kind,
    importedTemplateNames: recordsResult.data.map((record) => record.template.name),
    appliedSchedule: applyResult.data.applied,
    requiresScheduleConfirmation: applyResult.data.requiresConfirmation,
  });
}
