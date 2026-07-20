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
      <p className="text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.1rem]">{value}</p>
      {detail ? <p className="mt-1.5 text-xs text-zinc-500">{detail}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
}
