import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { MetricValue } from "@/components/ui/metric-value";

interface MetricCardProps {
  title: string;
  value: string;
  detail?: string;
  children?: ReactNode;
  className?: string;
}

export function MetricCard({ title, value, detail, children, className }: MetricCardProps) {
  return (
    <Card title={title} className={className}>
      <MetricValue value={value} className={cn("sm:text-[2.1rem]")} />
      {detail ? <p className="mt-1.5 text-xs text-zinc-500">{detail}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
}
