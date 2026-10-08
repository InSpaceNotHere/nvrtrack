import { createOpportunityAction, createTaskAction } from "@/app/(protected)/actions/command-center-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, FormGrid, FormStack } from "@/components/ui/form-layout";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TodayCreateFormsProps {
  organizationId: string;
}

export function TodayCreateForms({ organizationId }: TodayCreateFormsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Create task" subtitle="Operational follow-up that Today can surface.">
        <form action={createTaskAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <FormStack>
            <FormField label="Title">
              <Input name="title" required maxLength={160} placeholder="Send revised quote" />
            </FormField>
            <FormGrid>
              <FormField label="Priority">
                <Select name="priority" defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </FormField>
              <FormField label="Due date">
                <Input name="dueAt" type="date" />
              </FormField>
            </FormGrid>
            <Button type="submit" variant="primary">
              Save task
            </Button>
          </FormStack>
        </form>
      </Card>
      <Card title="Create opportunity" subtitle="Discovered work. Estimated impact stays nullable.">
        <form action={createOpportunityAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <FormStack>
            <FormField label="Title">
              <Input name="title" required maxLength={160} placeholder="Invoice reminder sequence" />
            </FormField>
            <FormGrid>
              <FormField label="Department">
                <Input name="department" maxLength={80} placeholder="Finance" />
              </FormField>
              <FormField label="Priority">
                <Select name="priority" defaultValue="high">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select name="status" defaultValue="identified">
                  <option value="identified">Identified</option>
                  <option value="approved">Approved</option>
                </Select>
              </FormField>
            </FormGrid>
            <FormField label="Current problem">
              <Textarea name="currentProblem" rows={2} maxLength={500} />
            </FormField>
            <FormField label="Proposed solution">
              <Textarea name="proposedSolution" rows={2} maxLength={500} />
            </FormField>
            <FormGrid>
              <FormField label="Estimated hours / month">
                <Input name="estimatedHoursPerMonth" type="number" min="0" step="0.5" />
              </FormField>
              <FormField label="Estimated revenue ($)">
                <Input name="estimatedRevenue" type="number" min="0" step="1" />
              </FormField>
            </FormGrid>
            <Button type="submit" variant="primary">
              Save opportunity
            </Button>
          </FormStack>
        </form>
      </Card>
    </div>
  );
}
