import { cn } from "@/components/ui/cn";

interface MetricValueProps {
  value: string;
  unit?: string | null;
  tone?: "primary" | "secondary";
  className?: string;
}

export function MetricValue({ value, unit, tone = "primary", className }: MetricValueProps) {
  return (
    <p className={cn(tone === "primary" ? "ds-metric-primary" : "ds-metric-secondary", className)}>
      <span>{value}</span>
      {unit ? <span className="ds-metric-unit">{` ${unit}`}</span> : null}
    </p>
  );
}
