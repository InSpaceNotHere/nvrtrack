import { updateOpportunityStatusAction } from "@/app/(protected)/actions/command-center-actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { OpportunityStatus } from "@/types/command-center";

export function OpportunityStatusForm({
  opportunityId,
  status,
}: {
  opportunityId: string;
  status: OpportunityStatus;
}) {
  return (
    <form action={updateOpportunityStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Select name="status" defaultValue={status} aria-label="Opportunity status">
        <option value="identified">Identified</option>
        <option value="approved">Approved</option>
        <option value="building">Building</option>
        <option value="testing">Testing</option>
        <option value="live">Live</option>
        <option value="measuring">Measuring</option>
      </Select>
      <Button type="submit" size="sm" variant="secondary">
        Update
      </Button>
    </form>
  );
}
