import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { formatMacroSummary } from "@/lib/nutrition/food-display-name";

interface FoodResultRowProps {
  name: string;
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  basis: string;
  selected?: boolean;
  onSelect: () => void;
  footer?: ReactNode;
}

export function FoodResultRow({
  name,
  calories,
  protein_g,
  carbohydrate_g,
  fat_g,
  basis,
  selected = false,
  onSelect,
  footer,
}: FoodResultRowProps) {
  return (
    <div className={cn("border-b border-white/6 last:border-b-0", selected ? "bg-white/[0.06]" : "")}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full min-h-12 items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-5 text-white">{name}</span>
          <span className="mt-0.5 block text-[12px] leading-4 text-zinc-400">
            {formatMacroSummary({ calories, protein_g, carbohydrate_g, fat_g })}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-zinc-500">{basis}</span>
        <span className="shrink-0 text-lg leading-none text-zinc-500" aria-hidden="true">
          +
        </span>
      </button>
      {footer}
    </div>
  );
}
