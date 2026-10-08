import { CompleteTaskButton } from "@/components/command-center/complete-task-button";
import { CreateWorkspaceForm } from "@/components/command-center/create-workspace-form";
import { SchemaMissingState } from "@/components/command-center/schema-missing";
import { TodayCreateForms } from "@/components/command-center/today-create-forms";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolveFirstRunState } from "@/lib/command-center/first-run";
import { getCommandCenterToday } from "@/lib/data/command-center";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const result = await getCommandCenterToday();
  if (result.error) {
    return <EmptyState title="Tasks could not load" description={result.error.message} />;
  }

  const firstRun = resolveFirstRunState(result.data);
  if (firstRun === "schema_missing") {
    return <SchemaMissingState />;
  }
  if (firstRun === "create_workspace" || !result.data.organization) {
    return <CreateWorkspaceForm />;
  }

  const { organization, tasks } = result.data;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Tasks" subtitle={`Operational work for ${organization.name}.`} />
      <TodayCreateForms organizationId={organization.id} />
      <Card title="All tasks" subtitle={`${tasks.length} saved rows`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-400">No tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-md)] border border-white/8 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-white">{task.title}</p>
                  <p className="text-xs text-zinc-500">
                    {task.status} · {task.priority}
                    {task.due_at ? ` · due ${task.due_at.slice(0, 10)}` : ""}
                  </p>
                </div>
                {task.status !== "completed" && task.status !== "cancelled" ? (
                  <CompleteTaskButton taskId={task.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
