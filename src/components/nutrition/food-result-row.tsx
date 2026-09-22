import type { ReactNode } from "react";

import { Star } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { formatMacroSummary } from "@/lib/nutrition/food-display-name";

interface FoodResultRowProps {
  name: string;
  brand?: string | null;
  calories: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  basis: string;
  selected?: boolean;
  favorited?: boolean;
  onSelect: () => void;
  onToggleFavorite?: () => void;
  footer?: ReactNode;
}

export function FoodResultRow({
  name,
  brand,
  calories,
  protein_g,
  carbohydrate_g,
  fat_g,
  basis,
  selected = false,
  favorited = false,
  onSelect,
  onToggleFavorite,
  footer,
}: FoodResultRowProps) {
  return (
    <div className={cn("border-b border-white/6 last:border-b-0", selected ? "bg-white/[0.06]" : "")}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04]"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-5 text-white">{name}</span>
            {brand ? <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{brand}</span> : null}
            <span className="mt-0.5 block text-[12px] leading-4 text-zinc-400">
              {formatMacroSummary({ calories, protein_g, carbohydrate_g, fat_g })}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-zinc-500">{basis}</span>
          <span className="shrink-0 text-lg leading-none text-zinc-500" aria-hidden="true">
            +
          </span>
        </button>
        {onToggleFavorite ? (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
            aria-pressed={favorited}
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-200"
          >
            <Star className={cn("h-4 w-4", favorited ? "fill-amber-300 text-amber-300" : "fill-none")} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
