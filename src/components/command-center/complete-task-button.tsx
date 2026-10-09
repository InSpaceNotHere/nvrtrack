import { completeTaskAction } from "@/app/(protected)/actions/command-center-actions";
import { Button } from "@/components/ui/button";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  return (
    <form action={completeTaskAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" size="sm" variant="secondary">
        Complete
      </Button>
    </form>
  );
}
