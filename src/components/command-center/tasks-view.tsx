"use client";

import { useState } from "react";

import { TaskEditor } from "@/components/command-center/record-editor";
import { useWorkspace } from "@/components/command-center/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { LocalTask } from "@/lib/command-center/domain";

export function TasksView() {
  const { ready, workspace, createTask, updateTask, deleteTask } = useWorkspace();
  const [editing, setEditing] = useState<LocalTask | "new" | null>(null);
  if (!ready || !workspace) {
    return <p className="text-sm text-zinc-400">Opening your workspace…</p>;
  }

  const selected = editing && editing !== "new" ? workspace.tasks.find((task) => task.id === editing.id) ?? null : null;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={workspace.business.name} title="Tasks" subtitle="Work that needs a person, saved in this browser." />
      <Button type="button" variant="primary" onClick={() => setEditing("new")}>
        New task
      </Button>
      {editing ? (
        <Card title={editing === "new" ? "New task" : "Edit task"}>
          <TaskEditor
            key={editing === "new" ? "new" : editing.id}
            task={editing === "new" ? null : selected}
            onCancel={() => setEditing(null)}
            onDelete={
              editing === "new"
                ? undefined
                : () => {
                    deleteTask(editing.id);
                    setEditing(null);
                  }
            }
            onSave={(input) => {
              if (editing === "new") createTask(input);
              else updateTask(editing.id, input);
              setEditing(null);
            }}
          />
        </Card>
      ) : null}
      <ul className="space-y-2">
        {workspace.tasks.map((task) => (
          <li key={task.id}>
            <button type="button" className="w-full text-left" onClick={() => setEditing(task)}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{task.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {task.status.replaceAll("_", " ")} · {task.priority}
                      {task.dueAt ? ` · due ${task.dueAt.slice(0, 10)}` : ""}
                    </p>
                  </div>
                </div>
              </Card>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
