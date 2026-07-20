import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  detail?: string;
  children?: ReactNode;
}

export function MetricCard({ title, value, detail, children }: MetricCardProps) {
  return (
    <Card title={title}>
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-1 text-sm text-zinc-400">{detail}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
