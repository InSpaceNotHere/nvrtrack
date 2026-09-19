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
    <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex rounded-xl border border-white/10 bg-[#0c0e11] p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            value === option.value ? "bg-white/12 font-medium text-white" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {option.label}
        </button>
      ))}
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

