export function customFoodCreateHref(params: { meal?: string; date?: string } = {}): string {
  const search = new URLSearchParams();
  if (params.meal) {
    search.set("meal", params.meal);
  }
  if (params.date) {
    search.set("date", params.date);
  }
  const query = search.toString();
  return query ? `/nutrition/foods/new?${query}` : "/nutrition/foods/new";
}

export function customFoodEditHref(
  foodId: string,
  params: { meal?: string; date?: string } = {},
): string {
  const search = new URLSearchParams();
  if (params.meal) {
    search.set("meal", params.meal);
  }
  if (params.date) {
    search.set("date", params.date);
  }
  const query = search.toString();
  return query ? `/nutrition/foods/${foodId}/edit?${query}` : `/nutrition/foods/${foodId}/edit`;
}

export function addFoodHref(params: { meal: string; date: string; saved?: string }): string {
  const search = new URLSearchParams({ meal: params.meal, date: params.date });
  if (params.saved) {
    search.set("saved", params.saved);
  }
  return `/nutrition/add?${search.toString()}`;
}

export function parseMealDateParams(searchParams: Record<string, string | string[] | undefined> | undefined): {
  meal: string | null;
  date: string | null;
} {
  const mealRaw = searchParams?.meal;
  const dateRaw = searchParams?.date;
  const meal = Array.isArray(mealRaw) ? mealRaw[0] : mealRaw;
  const date = Array.isArray(dateRaw) ? dateRaw[0] : dateRaw;
  return { meal: meal || null, date: date || null };
}
