export const FORBIDDEN_NUTRITION_UI_PATTERNS = [
  /nutrition_food_favorites/i,
  /waiting on the/i,
  /migration/i,
  /schema cache/i,
  /pgrst/i,
  /42p01/i,
  /Search USDA/i,
  /\/api\/usda\/search/i,
];

export function sanitizeFavoritesUserMessage(message: string): string {
  if (FORBIDDEN_NUTRITION_UI_PATTERNS.some((pattern) => pattern.test(message))) {
    return "Couldn't update favorites.";
  }
  return message;
}

export function containsInternalNutritionLanguage(text: string): boolean {
  return FORBIDDEN_NUTRITION_UI_PATTERNS.some((pattern) => pattern.test(text));
}
