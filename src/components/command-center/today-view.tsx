"use client";

import Link from "next/link";
import { useState } from "react";

import { useWorkspace } from "@/components/command-center/workspace-provider";
import { buildAttentionItems, buildBusinessSnapshot, buildRecommendedActions } from "@/lib/command-center/attention";
import { activityWhen, attentionCountLabel, distinctSuggestions, splitAttention, whyNow } from "@/lib/command-center/owner-presentation";
import type { AttentionItem, LocalTask } from "@/lib/command-center/domain";

function hrefFor(item: AttentionItem): string {
  if (item.kind === "overdue_task" || item.kind === "high_priority_task") {
    return `/tasks?focus=${item.entityId}`;
  }
  return `/opportunities?focus=${item.entityId}`;
}

export function TodayView() {
  const { ready, workspace, welcomeVisible, dismissWelcome, updateTask } = useWorkspace();
  const [leavingId, setLeavingId] = useState<string | null>(null);
  if (!ready || !workspace) {
    return <p className="text-[17px] text-[#65706B]">Opening NVRTRACK…</p>;
  }

  const now = new Date();
  const attention = buildAttentionItems({
    tasks: workspace.tasks,
    opportunities: workspace.opportunities,
    research: workspace.research,
    now,
  });
  const { hero, rest } = splitAttention(attention);
  const pulse = buildBusinessSnapshot({ tasks: workspace.tasks, opportunities: workspace.opportunities, now });
  const suggestions = distinctSuggestions(attention, buildRecommendedActions({ tasks: workspace.tasks, opportunities: workspace.opportunities, now }));
  const recent = [...workspace.activity].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 3);
  const tasksById = new Map(workspace.tasks.map((task) => [task.id, task]));

  function complete(task: LocalTask) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = () =>
      updateTask(task.id, {
        title: task.title,
        description: task.description,
        status: "completed",
        priority: task.priority,
        dueAt: task.dueAt,
      });
    if (reduced) {
      apply();
      return;
    }
    setLeavingId(task.id);
    window.setTimeout(() => {
      apply();
      setLeavingId(null);
    }, 280);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[17px] text-[#65706B]">{workspace.business.name}</p>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,4vw,2.375rem)] font-semibold leading-[1.1] tracking-tight text-[#17201D]">
          Here’s what needs your attention.
        </h1>
        <p className="mt-3 text-[17px] text-[#65706B]">{attentionCountLabel(attention.length)}</p>
      </header>

      {welcomeVisible ? (
        <section className="nvr-rise rounded-[28px] bg-white px-6 py-5 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
          <p className="text-lg font-semibold text-[#17201D]">NVRTRACK</p>
          <p className="mt-1 text-[17px] text-[#65706B]">Your business. What needs attention. What to do next.</p>
          <button type="button" className="ds-press mt-4 rounded-full bg-[#17785E] px-5 py-2.5 text-[15px] font-semibold text-white" onClick={dismissWelcome}>
            Continue
          </button>
        </section>
      ) : null}

      {hero ? (
        <section aria-label="Most important" className={leavingId === hero.entityId ? "nvr-leave" : "nvr-rise"}>
          <p className="mb-3 text-[15px] font-medium uppercase tracking-[0.08em] text-[#C88924]">Most important</p>
          <div className="rounded-[30px] bg-[#FFF5DE] px-6 py-7 shadow-[0_22px_60px_rgba(200,137,36,0.12)] sm:px-8">
            <h2 className="text-[clamp(1.6rem,3vw,2rem)] font-semibold tracking-tight text-[#17201D]">{hero.title}</h2>
            <p className="mt-2 text-[18px] text-[#65706B]">{whyNow(hero, tasksById.get(hero.entityId), now)}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={hrefFor(hero)} className="ds-press rounded-full bg-[#17201D] px-5 py-3 text-[16px] font-semibold text-white">
                Review now
              </Link>
              {tasksById.has(hero.entityId) ? (
                <button
                  type="button"
                  className="ds-press rounded-full bg-white px-5 py-3 text-[16px] font-semibold text-[#17201D]"
                  onClick={() => {
                    const task = tasksById.get(hero.entityId);
                    if (task) complete(task);
                  }}
                >
                  Complete
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[30px] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
          <h2 className="text-2xl font-semibold text-[#17201D]">You’re clear.</h2>
          <p className="mt-2 text-[17px] text-[#65706B]">Nothing is waiting on a decision right now.</p>
        </section>
      )}

      {rest.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[22px] font-semibold text-[#17201D]">What else needs you</h2>
          <ul className="space-y-3">
            {rest.map((item) => {
              const task = tasksById.get(item.entityId);
              return (
                <li key={item.id} className={leavingId === item.entityId ? "nvr-leave" : undefined}>
                  <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white px-5 py-4 shadow-[0_14px_36px_rgba(23,32,29,0.05)]">
                    <div>
                      <p className="text-[18px] font-semibold text-[#17201D]">{item.title}</p>
                      <p className="mt-1 text-[16px] text-[#65706B]">{whyNow(item, task, now)}</p>
                    </div>
                    {task ? (
                      <button type="button" className="ds-press shrink-0 rounded-full bg-[#E8F5EF] px-4 py-2 text-[15px] font-semibold text-[#17785E]" onClick={() => complete(task)}>
                        Complete
                      </button>
                    ) : (
                      <Link href={hrefFor(item)} className="ds-press shrink-0 rounded-full bg-[#E8F5EF] px-4 py-2 text-[15px] font-semibold text-[#17785E]">
                        Review
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Link href="/tasks?new=1" className="ds-press rounded-full border border-[rgba(23,32,29,0.08)] bg-white px-4 py-2.5 text-[15px] font-semibold text-[#17201D]">
          + Task
        </Link>
        <Link href="/opportunities?new=1" className="ds-press rounded-full border border-[rgba(23,32,29,0.08)] bg-white px-4 py-2.5 text-[15px] font-semibold text-[#17201D]">
          + Opportunity
        </Link>
        <Link href="/tasks" className="ds-press rounded-full bg-[#17785E] px-4 py-2.5 text-[15px] font-semibold text-white">
          View work
        </Link>
      </section>

      {suggestions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[22px] font-semibold text-[#17201D]">Suggested next moves</h2>
          <ul className="space-y-2">
            {suggestions.map((action) => (
              <li key={action.id} className="rounded-[20px] bg-[#F0F3EE] px-5 py-4 text-[17px] text-[#17201D]">
                {action.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[22px] font-semibold text-[#17201D]">Business pulse</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [pulse.openTaskCount, "Open items"],
            [pulse.overdueTaskCount, "Overdue"],
            [pulse.activeOpportunityCount, "Opportunities"],
            [pulse.highPriorityOpportunityCount, "High priority"],
          ].map(([value, label]) => (
            <div key={String(label)} className="rounded-[22px] bg-white px-4 py-5 shadow-[0_14px_36px_rgba(23,32,29,0.05)]">
              <p className="text-[2rem] font-semibold leading-none tracking-tight text-[#17201D]">{value}</p>
              <p className="mt-2 text-[15px] text-[#65706B]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-[22px] font-semibold text-[#17201D]">Recent changes</h2>
          <Link href="/activity" className="text-[15px] font-semibold text-[#17785E]">
            View activity
          </Link>
        </div>
        <ol className="space-y-3 border-l border-[#E8F5EF] pl-4">
          {recent.map((event) => (
            <li key={event.id}>
              <p className="text-[16px] font-medium text-[#17201D]">{event.description ?? event.title}</p>
              <p className="text-[15px] text-[#65706B]">
                {event.title} · {activityWhen(event.createdAt, now)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
