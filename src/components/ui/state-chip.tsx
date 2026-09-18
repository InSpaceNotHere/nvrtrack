import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleOff,
  PauseCircle,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";

type StateChipKey =
  | "active"
  | "planned"
  | "completed"
  | "skipped"
  | "moved"
  | "rest"
  | "pr"
  | "tested"
  | "estimated"
  | "warning"
  | "error"
  | "neutral"
  | "missing";

interface StateChipProps {
  state: StateChipKey;
  label?: string;
  className?: string;
}

const STATE_CONFIG: Record<
  StateChipKey,
  {
    label: string;
    tone: "default" | "accent" | "danger" | "success" | "warning" | "info";
    icon: typeof Activity;
  }
> = {
  active: { label: "Active", tone: "accent", icon: Activity },
  planned: { label: "Planned", tone: "info", icon: TimerReset },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  skipped: { label: "Skipped", tone: "warning", icon: PauseCircle },
  moved: { label: "Moved", tone: "info", icon: TimerReset },
  rest: { label: "Rest", tone: "default", icon: CircleOff },
  pr: { label: "PR", tone: "accent", icon: Sparkles },
  tested: { label: "Tested", tone: "success", icon: CheckCircle2 },
  estimated: { label: "Estimated", tone: "info", icon: TrendingUp },
  warning: { label: "Warning", tone: "warning", icon: AlertCircle },
  error: { label: "Error", tone: "danger", icon: AlertCircle },
  neutral: { label: "Info", tone: "default", icon: Activity },
  missing: { label: "Missing", tone: "default", icon: CircleOff },
};

export function StateChip({ state, label, className }: StateChipProps) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  return (
    <Chip tone={config.tone} className={cn("gap-1.5 normal-case tracking-[0.04em]", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </Chip>
  );
}
