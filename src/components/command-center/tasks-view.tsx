"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { TaskEditor } from "@/components/command-center/record-editor";
import { useWorkspace } from "@/components/command-center/workspace-provider";
import { taskTone, workGroups } from "@/lib/command-center/owner-presentation";
import type { LocalTask } from "@/lib/command-center/domain";

function WorkList() {
  const params = useSearchParams();
  const { ready, workspace, createTask, updateTask, deleteTask } = useWorkspace();
  const initial = params.get("new") ? "new" : params.get("focus");
  const [editing, setEditing] = useState<string | "new" | null>(initial);
  if (!ready || !workspace) return <p className="text-[17px] text-[#65706B]">Opening your work…</p>;

  const now = new Date();
  const groups = workGroups(workspace.tasks, now);
  const selected = typeof editing === "string" && editing !== "new" ? workspace.tasks.find((task) => task.id === editing) ?? null : null;

  function complete(task: LocalTask) {
    updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: "completed",
      priority: task.priority,
      dueAt: task.dueAt,
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[clamp(2rem,4vw,2.375rem)] font-semibold tracking-tight text-[#17201D]">Work</h1>
        <p className="mt-2 text-[17px] text-[#65706B]">Things that need a person.</p>
      </header>
      <button type="button" className="ds-press rounded-full bg-[#17785E] px-5 py-3 text-[16px] font-semibold text-white" onClick={() => setEditing("new")}>
        + Task
      </button>
      {editing ? (
        <section className="nvr-rise rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(23,32,29,0.06)]">
          <TaskEditor
            key={editing === "new" ? "new" : editing}
            task={editing === "new" ? null : selected}
            onCancel={() => setEditing(null)}
            onDelete={
              editing === "new"
                ? undefined
                : () => {
                    deleteTask(editing);
                    setEditing(null);
                  }
            }
            onSave={(input) => {
              if (editing === "new") createTask(input);
              else updateTask(editing, input);
              setEditing(null);
            }}
          />
        </section>
      ) : null}
      <WorkGroup title="Overdue" tasks={groups.overdue} now={now} onOpen={setEditing} onComplete={complete} />
      <WorkGroup title="Today / next" tasks={groups.next} now={now} onOpen={setEditing} onComplete={complete} />
      <WorkGroup title="Completed recently" tasks={groups.done.slice(0, 6)} now={now} onOpen={setEditing} />
    </div>
  );
}

function WorkGroup({
  title,
  tasks,
  now,
  onOpen,
  onComplete,
}: {
  title: string;
  tasks: LocalTask[];
  now: Date;
  onOpen: (id: string) => void;
  onComplete?: (task: LocalTask) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em] text-[#65706B]">{title}</h2>
      <ul className="space-y-3">
        {tasks.map((task) => {
          const tone = taskTone(task, now);
          return (
            <li key={task.id} className="flex items-center justify-between gap-4 rounded-[22px] bg-white px-5 py-4 shadow-[0_14px_36px_rgba(23,32,29,0.05)]">
              <button type="button" className="text-left" onClick={() => onOpen(task.id)}>
                <p className="text-[18px] font-semibold text-[#17201D]">{task.title}</p>
                <p className="mt-1 text-[16px] text-[#65706B]">
                  {tone.priority}
                  {task.status === "completed" ? "" : ` · ${tone.when}`}
                </p>
              </button>
              {onComplete && task.status !== "completed" ? (
                <button type="button" className="ds-press shrink-0 rounded-full bg-[#E8F5EF] px-4 py-2 text-[15px] font-semibold text-[#17785E]" onClick={() => onComplete(task)}>
                  Complete
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TasksView() {
  return (
    <Suspense fallback={<p className="text-[17px] text-[#65706B]">Opening your work…</p>}>
      <WorkList />
    </Suspense>
  );
}
