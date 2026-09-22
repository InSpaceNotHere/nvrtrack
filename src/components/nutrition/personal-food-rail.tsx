import { Star } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { formatMacroSummary } from "@/lib/nutrition/food-display-name";
import type { PersonalFoodItem } from "@/lib/nutrition/personal-foods";

interface PersonalFoodRailProps {
  title: string;
  items: PersonalFoodItem[];
  favoriteKeys: Set<string>;
  onSelect: (item: PersonalFoodItem) => void;
  onToggleFavorite: (item: PersonalFoodItem) => void;
}

export function PersonalFoodRail({ title, items, favoriteKeys, onSelect, onToggleFavorite }: PersonalFoodRailProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</h2>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const favorited = favoriteKeys.has(item.identity.key);
          return (
            <div
              key={`${title}-${item.identity.key}`}
              className="flex w-[168px] shrink-0 flex-col rounded-2xl bg-white/[0.04] ring-1 ring-white/6"
            >
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="min-h-[72px] flex-1 px-3 py-2.5 text-left"
              >
                <span className="block truncate text-[13px] font-medium text-white">{item.name}</span>
                <span className="mt-1 block text-[11px] leading-4 text-zinc-400">
                  {formatMacroSummary({
                    calories: item.calories,
                    protein_g: item.protein_g,
                    carbohydrate_g: item.carbohydrate_g,
                    fat_g: item.fat_g,
                  })}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-600">{item.basis}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite(item)}
                aria-label={favorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                aria-pressed={favorited}
                className="flex min-h-10 items-center justify-center border-t border-white/6 text-zinc-500"
              >
                <Star className={cn("h-4 w-4", favorited ? "fill-amber-300 text-amber-300" : "fill-none")} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
