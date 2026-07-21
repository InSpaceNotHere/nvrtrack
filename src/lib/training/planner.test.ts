import { describe, expect, it } from "vitest";

import { buildPlannerWeek, findPlannerDayForDate } from "./planner";

describe("training planner week builder", () => {
  it("builds scheduled and completed planner days with template metadata", () => {
    const week = buildPlannerWeek({
      referenceDate: new Date("2026-07-22T00:00:00.000Z"),
      templates: [
        {
          id: "template-push",
          name: "Push",
          template_type: "push",
          estimated_duration_minutes: 60,
        },
      ],
      templateExercises: [
        {
          id: "exercise-1",
          template_id: "template-push",
          exercise_id: null,
          catalog_exercise_id: null,
          exercise_name: "Bench Press",
          position: 0,
          primary_muscles: ["chest"],
          secondary_muscles: ["triceps"],
        },
      ],
      weekdayScheduleRows: [
        {
          id: "weekday-2",
          weekday: 2,
          template_id: "template-push",
          is_rest_day: false,
        },
      ],
      scheduleOverrideRows: [],
      completedWorkouts: [
        {
          id: "workout-1",
          workout_date: "2026-07-21",
          name: "Push",
        },
      ],
    });

    const tuesday = findPlannerDayForDate(week, "2026-07-21");
    expect(tuesday?.status).toBe("completed");
    expect(tuesday?.template_name).toBe("Push");
    expect(tuesday?.exercise_count).toBe(1);
  });

  it("respects rest and moved overrides", () => {
    const week = buildPlannerWeek({
      referenceDate: new Date("2026-07-22T00:00:00.000Z"),
      templates: [
        {
          id: "template-upper",
          name: "Upper",
          template_type: "upper",
          estimated_duration_minutes: 55,
        },
      ],
      templateExercises: [],
      weekdayScheduleRows: [
        {
          id: "weekday-3",
          weekday: 3,
          template_id: "template-upper",
          is_rest_day: false,
        },
      ],
      scheduleOverrideRows: [
        {
          id: "override-1",
          plan_date: "2026-07-22",
          template_id: "template-upper",
          status: "moved",
          is_rest_day: false,
          moved_to_date: "2026-07-23",
          moved_from_date: null,
          workout_id: null,
        },
        {
          id: "override-2",
          plan_date: "2026-07-23",
          template_id: null,
          status: "scheduled",
          is_rest_day: true,
          moved_to_date: null,
          moved_from_date: null,
          workout_id: null,
        },
      ],
      completedWorkouts: [],
    });

    expect(findPlannerDayForDate(week, "2026-07-22")?.status).toBe("moved");
    expect(findPlannerDayForDate(week, "2026-07-23")?.status).toBe("rest");
  });
});
