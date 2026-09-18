import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

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
      <p className={cn("ds-metric text-white", "sm:text-[2.1rem]")}>{value}</p>
      {detail ? <p className="mt-1.5 text-xs text-zinc-500">{detail}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
}
