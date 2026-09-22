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
}: FoodResultRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        selected ? "bg-white/12" : "hover:bg-white/8",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{name}</span>
        <span className="mt-0.5 block text-[12px] text-zinc-400">
          {formatMacroSummary({ calories, protein_g, carbohydrate_g, fat_g })}
        </span>
        <span className="block text-[11px] text-zinc-500">{basis}</span>
      </span>
      <span className="text-lg leading-none text-zinc-500" aria-hidden="true">
        +
      </span>
    </button>
  );
}
