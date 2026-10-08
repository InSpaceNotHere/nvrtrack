import { describe, expect, it } from "vitest";

import { buildAttentionItems, buildRecommendedActions } from "./attention";
import {
  activityDayLabel,
  attentionCountLabel,
  distinctSuggestions,
  opportunityBand,
  splitAttention,
  stageLabel,
  taskTone,
  whyNow,
  workGroups,
} from "./owner-presentation";
import { createJuniperSeed } from "./seed";

const now = new Date("2026-10-08T15:00:00.000Z");

describe("owner presentation", () => {
  const seed = createJuniperSeed(now);
  const attention = buildAttentionItems({ ...seed, now });

  it("puts one item first and keeps the rest as secondary", () => {
    const { hero, rest } = splitAttention(attention);
    expect(hero?.title).toBe("Send outstanding quote");
    expect(rest.map((item) => item.title)).toEqual([
      "Follow up with 3 unanswered inquiries",
      "Proposal drafting assistant",
      "Lead intake & reply drafting",
    ]);
    expect(attentionCountLabel(attention.length)).toBe("4 things need a decision or follow-up.");
  });

  it("does not repeat attention items as suggested moves", () => {
    const suggestions = distinctSuggestions(attention, buildRecommendedActions({ ...seed, now }));
    expect(suggestions).toEqual([]);
  });

  it("speaks about overdue work in days, not a raw timestamp", () => {
    const quote = seed.tasks.find((task) => task.title === "Send outstanding quote");
    const hero = attention[0];
    expect(whyNow(hero, quote, now)).toBe("Overdue by 2 days.");
    expect(taskTone(quote!, now).when).toBe("Overdue by 2 days");
  });

  it("groups work and opportunities in owner language", () => {
    const groups = workGroups(seed.tasks, now);
    expect(groups.overdue.map((task) => task.title)).toEqual(["Send outstanding quote"]);
    expect(groups.next.map((task) => task.title)).toContain("Follow up with 3 unanswered inquiries");
    expect(opportunityBand("approved")).toBe("ready");
    expect(opportunityBand("building")).toBe("progress");
    expect(stageLabel("approved")).toBe("Ready for review");
    expect(activityDayLabel("2026-10-08T12:00:00.000Z", now)).toBe("Today");
    expect(activityDayLabel("2026-10-07T12:00:00.000Z", now)).toBe("Yesterday");
  });
});