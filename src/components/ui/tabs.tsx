import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  value: T;
  options: TabOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({ value, options, onChange, ariaLabel, className }: TabsProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div role="tablist" aria-label={ariaLabel} className="inline-flex min-w-full flex-nowrap gap-1 rounded-xl border border-white/10 bg-[#0c0e11] p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "ds-press whitespace-nowrap rounded-lg px-1.5 py-1.5 text-[11px] transition-colors sm:px-3 sm:text-sm",
              value === option.value ? "bg-white/12 font-medium text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  className?: string;
}

export function TabPanel({ children, className }: TabPanelProps) {
  return <div className={className}>{children}</div>;
}

