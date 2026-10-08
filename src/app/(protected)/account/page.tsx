import { LogoutButton } from "@/components/auth/logout-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function AccountPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="NVRTRACK" title="Account" subtitle="Session and workspace access." />
      <Card title="Sign out">
        <LogoutButton />
      </Card>
    </div>
  );
}
