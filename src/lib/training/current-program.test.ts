import { describe, expect, it } from "vitest";

import type { WorkoutTemplateRow, WorkoutWeekdayScheduleRow } from "../data/workout-planner";

import { hasAssignedWeeklyProgram, inferCurrentProgramSummary } from "./current-program";

function template(overrides: Partial<WorkoutTemplateRow>): WorkoutTemplateRow {
  return {
    id: "t1",
    user_id: "u1",
    name: "Classic PPL - Push",
    template_type: "push",
    estimated_duration_minutes: 60,
    notes: "nvrtrack-preset:classic-ppl:push\nReady-made preset copy.",
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function weekday(overrides: Partial<WorkoutWeekdayScheduleRow>): WorkoutWeekdayScheduleRow {
  return {
    id: "w1",
    user_id: "u1",
    weekday: 1,
    template_id: "t1",
    is_rest_day: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("hasAssignedWeeklyProgram", () => {
  it("is false when every weekday is unassigned", () => {
    expect(
      hasAssignedWeeklyProgram([
        weekday({ weekday: 0, template_id: null, is_rest_day: false }),
        weekday({ weekday: 1, template_id: null, is_rest_day: false, id: "w2" }),
      ]),
    ).toBe(false);
  });

  it("is true when a rest day is scheduled", () => {
    expect(hasAssignedWeeklyProgram([weekday({ template_id: null, is_rest_day: true })])).toBe(true);
  });

  it("is true when a template is assigned", () => {
    expect(hasAssignedWeeklyProgram([weekday({})])).toBe(true);
  });
});

describe("inferCurrentProgramSummary", () => {
  it("returns null without weekday assignments", () => {
    expect(
      inferCurrentProgramSummary({
        templates: [template({})],
        weekdayRows: [weekday({ template_id: null, is_rest_day: false })],
        weekDays: [],
        todayDate: "2026-09-24",
      }),
    ).toBeNull();
  });

  it("uses the ready-made preset title and next scheduled day", () => {
    const summary = inferCurrentProgramSummary({
      templates: [
        template({}),
        template({
          id: "t2",
          name: "Classic PPL - Pull",
          template_type: "pull",
          notes: "nvrtrack-preset:classic-ppl:pull",
        }),
      ],
      weekdayRows: [
        weekday({}),
        weekday({ id: "w2", weekday: 2, template_id: "t2" }),
        weekday({ id: "w3", weekday: 0, template_id: null, is_rest_day: true }),
      ],
      weekDays: [
        { date: "2026-09-24", weekdayLabel: "Thu", status: "scheduled", workoutLabel: "Push" },
        { date: "2026-09-25", weekdayLabel: "Fri", status: "scheduled", workoutLabel: "Pull" },
      ],
      todayDate: "2026-09-24",
    });

    expect(summary?.name).toBe("Classic PPL");
    expect(summary?.frequencyLabel).toBe("2 days / week");
    expect(summary?.splitLabel).toBe("push / pull");
    expect(summary?.nextLabel).toBe("Fri · Pull");
  });
});
