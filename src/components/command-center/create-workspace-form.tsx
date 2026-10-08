import { createWorkspaceAction } from "@/app/(protected)/actions/command-center-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, FormStack } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

export function CreateWorkspaceForm() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="NVRTRACK"
        title="Today"
        subtitle="What needs my attention in the business?"
      />
      <Card title="Create your first business workspace" subtitle="Today only works with a real organization you own.">
        <form action={createWorkspaceAction}>
          <FormStack>
            <FormField label="Workspace name">
              <Input name="name" required maxLength={80} placeholder="Juniper & Co. Events" />
            </FormField>
            <Button type="submit" variant="primary">
              Create workspace
            </Button>
          </FormStack>
        </form>
      </Card>
    </div>
  );
}
