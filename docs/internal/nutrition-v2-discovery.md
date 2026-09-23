# NVRTRACK Nutrition V2 — product / technical brief

**Status:** Nutrition V2 Phase 4 removed live USDA runtime search. The reviewed static `food_catalog` remains. No schema change.

**Baseline:** Onboarding V2 + Privacy RC `1388c98` (`cursor/onboarding-privacy-rc-8c10`).  
**Research branch:** `cursor/nutrition-discovery-audit-8c10`.

**Verdict:** Historical logs already snapshot nutrients onto `food_entries`. Removing live USDA search does not rewrite old totals if the UI keeps summing those snapshots. The current Nutrition screen is a nested dashboard + in-page database composer. That product direction is rejected.

---

## 1. Current architecture audit

### Data model

| Table | Role |
|---|---|
| `foods` | User-owned saved/custom foods. Core: name, brand, serving, kcal/P/C/F, optional fiber. USDA extras: `fdc_id`, `catalog_food_id`, `source_status`, per-100g, GTIN, source metadata. |
| `food_entries` | Daily log rows. **Immutable history by design.** Core snapshot: `food_name`, serving, `calories_per_serving`, macros per serving, `servings`, meal, date, note. Optional link `food_id` **on delete set null**. USDA extras copied onto the row. |
| `food_catalog` | Static reviewed USDA-backed common catalog. 167 active records in `food-catalog-reviewed.lock.json`. RLS: authenticated select where `is_active`. Per-100g nutrients + serving weight. |

`source_status`: `manual` \| `usda_catalog` \| `usda_live` \| `usda_modified`.

### Snapshot vs live records (critical)

Day totals **do not** join live USDA or current catalog for display.

`calculateDailyTotals` / Home calories use:

`entry.calories_per_serving * entry.servings` (same for P/C/F/fiber).

Catalog and live USDA inserts **copy**:

- per-serving macros for the logged amount
- per-100g source nutrients
- `amount_value` / `amount_unit` / `amount_grams`
- `fdc_id`, `catalog_food_id` (catalog only), `source_status`

Amount **edit** for `usda_catalog` / `usda_live` uses `recalculateCatalogEntryFromSnapshot(existingEntry, …)` — the **entry’s own** per-100g snapshot, not a live API call and not a required catalog join.

`catalog_food_id` and `food_id` are `ON DELETE SET NULL`. Deleting a catalog row or saved food later must not delete history.

**Risk to watch:** custom/saved-food logging path copies macros **at insert time**. Editing a saved food later does **not** rewrite old entries (good). Catalog amount-edit **does** rewrite that entry’s per-serving numbers from stored per-100g (intended). If an old USDA-live row is missing per-100g, amount-edit fails; display totals still work from per-serving columns.

### Serving / macros

Units already supported: `g`, `oz`, `source_serving`.  
Calories/macros stored per serving; catalog path forces `servings = 1` and puts the portion into `serving_size`/`amount_*`.

### USDA live search

- Client: `src/lib/usda/client.ts` → `https://api.nal.usda.gov/fdc/v1`, 8s timeout, `USDA_FDC_API_KEY`.
- Live layer: `src/lib/usda/live.ts` — process-local caches (search 60s / 32 entries; detail 10 min / 128). Fixture mode `USDA_FDC_FIXTURE_MODE` for e2e.
- Route: `POST /api/usda/search`.
- Actions: `resolveUsdaFoodDetailAction`, `createLiveUsdaFoodEntryAction` (optional save to My Foods).

### UI today

`/nutrition` → `NutritionLogView` (~1.7k lines, client):

- Date card + Daily Summary card (kcal ring, remaining, fiber) + Food Log card
- In-page composer modes: Common / Search USDA / My Foods / Manual Label
- Common results show USDA `data_type`, `food_category`, FDC ID, kcal/100g
- Meal groups exist **inside** the Food Log card (breakfast/lunch/dinner/snack)
- Saved foods admin: `/nutrition/foods` (`SavedFoodManager` form)

### Home

`getMyFoodEntriesForDate(today)` → `calculateDailyTotals`. Calories + protein tiles. Does not call USDA.

### Recent / frequent / favorites (actual vs named)

- `getMyRecentFoodEntries(12)` — real recency by `entry_date`/`created_at`. **Keep.**
- `getMyRecentFoods(12)` — newest **created** saved foods, not last logged. **Adapt.**
- Catalog “featured” mixes recent `usda_catalog` `fdc_id`s + A–Z fallback, cap 40. **Adapt.**
- Favorites: **none**.
- Frequent foods: **none**. Training already has frequent-catalog-usage; Nutrition can copy that pattern, not invent ranking.

### Edit / delete

Entries: edit date/meal/amount (USDA paths) or servings (saved/custom); delete with confirm.  
Saved foods: CRUD on `/nutrition/foods`. Deleting a food nulls `food_id` on entries; snapshot stays.

### Tests

Unit: calculations, serving, catalog-entry, catalog-search, validation, source-status, USDA live/cache/normalization/nutrients/pilot.

E2E: `food-catalog.spec.ts` (common log/edit/delete, no live USDA calls), `usda-live-search.spec.ts` (fixture USDA composer).

---

## 2. KEEP / ADAPT / DEPRECATE / REMOVE LATER

| Component | Class | Note |
|---|---|---|
| `food_entries` snapshot columns | **KEEP** | History contract. |
| Meal types B/L/D/snack | **KEEP** | Matches target Today screen. |
| `calculateDailyTotals` / Home snapshot math | **KEEP** | |
| Amount math g/oz/source serving | **KEEP** | Hide USDA jargon in UI. |
| `foods` custom/saved CRUD | **KEEP** (simplify UI) | Custom foods V2. |
| `food_catalog` 167 USDA-reviewed rows | **ADAPT** | Reuse as Common Foods V1; humanize names; optional category UX. Do not delete. |
| Catalog search ranking + aliases | **ADAPT** | Keep backend; stop showing FDC/data_type. |
| Nutrition Today layout | **ADAPT** | Intake → meals → add. Drop nested cards/composer. |
| Saved foods page | **ADAPT** | Secondary, not the home of Nutrition. |
| `getMyRecentFoodEntries` | **ADAPT** | Drive Recent list (dedupe by food identity). |
| `getMyRecentFoods` | **ADAPT** | Stop treating create-order as recency. |
| Live USDA search UI + `/api/usda/search` | **DEPRECATE** then **REMOVE LATER** | Unreliable, database-like, not the product. |
| Composer “Search USDA” / generic vs branded | **DEPRECATE** | |
| USDA process cache, client, fixtures | **REMOVE LATER** | After UI off + tests rewritten. |
| `USDA_FDC_API_KEY` env | **REMOVE LATER** | After live path gone. |
| `fdc_id` / per-100g / source_* on entries | **KEEP** | Provenance for old logs; do not strip. |
| `source_status` | **KEEP** | Useful internally; hide from gym logging UI. |
| Fiber on log UI | **DEPRECATE** from primary logging | Keep column. |
| Full nutrition-facts / micronutrients | **DO NOT ADD** | |
| Favorites | **NEW (later phase)** | Explicit pin. |
| Frequent | **NEW (later phase)** | Count-based, like training. |
| Barcode / AI / recipes / remaining-kcal equation | **DO NOT COPY** | |

---

## 3. Mobbin references

Lose It! and Cronometer are **not in Mobbin** under those names. Substitutes with the same jobs: Fitbit food log, Garmin Connect food detail, Noom custom food. Stopped when patterns repeated.

| Product | Flow / screen | Borrow | Do not copy |
|---|---|---|---|
| MyFitnessPal | [Log meal](https://mobbin.com/flows/d58bea22-7f26-48ef-a6de-134d9183c5ad) | Today kcal + meal groups + **ADD FOOD** per meal | Remaining = Goal − Food + Exercise; ads; nutrient warnings |
| MyFitnessPal | [Add food](https://mobbin.com/flows/bf066ae4-d9b5-4214-a2d2-9f553401920b) | Full-screen search, human rows, `+` to log, meal in header | My Meals / Recipes / barcode as first-class V1 |
| MyFitnessPal | [Food detail](https://mobbin.com/flows/71beee69-9ae1-419f-831a-9119b42438d7) | Amount + unit + meal + sticky confirm | Vitamin table, “frequently paired”, % daily goals wall |
| MacroFactor | [Logging food](https://mobbin.com/flows/e6bf4b49-18c0-4700-a4c4-800a518f9921) | Full-screen add; human tiles `165 cal · 31P · 0C · 3.6F`; keypad; g/oz/serving chips; heart favorite; sticky Add | Time-log instead of meals; AI Describe; micronutrient depth; unit preferences kitchen |
| Yazio | [Today](https://mobbin.com/screens/f1e30311-88df-4e8a-acf5-3077dae43e12) / [Breakfast](https://mobbin.com/screens/db44400f-843e-4185-b475-34808698df31) / [Search](https://mobbin.com/screens/d6037505-d718-446d-aea3-bf9ab4015638) | Diary summary → meals → `+`; Favorites / Created by me chips; sticky Add more | Recipe tab, AI camera, remaining-kcal hero, vitamin facts |
| Lifesum | [Diary](https://mobbin.com/screens/ba02a832-1a7e-4717-8dae-e96cb104ad78) / [Adding a food](https://mobbin.com/flows/c2dd3f1f-bbc8-42ba-9256-de428e773b74) | Meal rows + `+`; favorites tab; amount then TRACK | Diet-program chrome, food quality scores, 4-step custom + barcode |
| Fitbit | [Adding food](https://mobbin.com/flows/0bcbdaa0-f5b9-4e2d-a00d-87238e260ab0) | Search with Common badge + calories in the row; Create “X” for custom | Cal-in vs cal-out charts as Nutrition home |
| Garmin Connect | [Food Details](https://mobbin.com/screens/6b8d0b8a-f5e4-4e59-903a-d80d94b9c344) | Dark detail: serving, count, meal, 4 macros, star, sticky Add | Full nutrition sheet |
| Noom | [Adding custom food](https://mobbin.com/flows/8b1a1d46-63e2-4de3-8929-a66a7f3f2ed8) | Name + calories + serving; Save in header | Color food lists, optional micros as primary |

### Strongest recurring patterns

1. **Today is a diary**, not a food-admin console.
2. **Add Food is a focused screen** (search + lists), not a form embedded in the diary.
3. **Empty search shows Recent / Frequent / Favorites / Common**, not a USDA dump.
4. **Rows are human:** name, kcal, P/C/F, portion basis.
5. **Detail is amount + unit + live macros + one sticky Add to {Meal}.**
6. **Favorite is an explicit star**, not inferred.
7. **Custom food is a short form** when search fails.

NVRTRACK should not clone remaining-calorie algebra, ads, barcode, AI, recipes, or micronutrient databases.

---

## 4. Design language (Nutrition only)

Mobile-app first. Web second.

Keep: dark surfaces, restrained NVR blue, zinc/white type, large kcal number, compact density.

Leave: nested dashboard cards, giant labeled forms, FDC IDs, `data_type` chips, desktop two-column Date | Summary, in-page composer, “page reload” mental model.

Prefer: one focused Today scroll; full-screen Add Food; bottom sheet only for portion; sticky primary; 44px targets; immediate toast “Logged to Lunch”.

---

## 5. Nutrition Today (proposed)

```
TODAY                              <  22 Sep  >

        1,840 / 2,460 kcal
        ████████████░░░░

Protein  142 / 180 g
Carbs    201 / 300 g
Fat       48 /  54 g

Breakfast                      420 kcal
  Eggs                         155
  Oatmeal                      265
  + Add food

Lunch                          610 kcal
  Chicken breast               248
  Jasmine rice                 362
  + Add food

Dinner                         …
Snacks                         …

··· Foods (saved / custom)     secondary
```

Hierarchy: **intake → meals → add**. Fiber, notes, USDA provenance: not on this screen.

Date stays URL `?date=` for deep links; chrome should feel like a pager, not a Date card.

---

## 6. Add Food (proposed)

**Recommendation: hybrid.**

- **Full-screen route** `/nutrition/add?meal=lunch&date=…` for search + lists (keyboard, tabs, scroll). Matches MFP / MacroFactor / Yazio.
- **Sheet** for portion/detail if the food is already known (Recent tap). Sheet-only for the whole add flow is too small once Search + Common + Favorites appear.

```
Add to Lunch                         ✕
[ Search chicken…                  ]

Recent    Frequent    Favorites    Common

Chicken Breast
165 cal · 31P · 0C · 3.6F
per 100 g

Create custom food
```

Search filters Common + user’s custom/favorites. **No live USDA.** Empty query = the four lists. Human names, never `Chicken, broiler or fryers…`.

---

## 7. Food detail / portion

```
Chicken Breast                       ✕

Amount    [ 150 ]     Unit  [ g ▾ ]
          g   oz   serving (if catalog has gram weight)

248 kcal
46.5 P · 0 C · 5.4 F

[ Add to Lunch ]
```

Units: grams, ounces, catalog serving when `serving_weight_grams` exists. No fiber/sodium/vitamins in the logging path. Edit entry = same screen with Save / Delete.

---

## 8. Common Foods V1

**Reuse, do not invent.** Existing `food_catalog` is already a locked USDA FoodData Central (mostly SR Legacy) reviewed set: **167 foods**. Target band 150–250 is essentially “keep this set, humanize, fill gym gaps.”

### Categories (proposed display; map from current lock)

| Category | Approx now | V1 target |
|---|---|---|
| Protein (poultry, beef, pork, eggs, dairy protein) | 55 protein | 55–70 |
| Seafood | 22 | 20–25 |
| Grains / starches / breads / wraps | 30 | 35–45 |
| Dairy | 21 | 20–25 |
| Fruit | 11 | 15–20 |
| Vegetables | 15 | 20–25 |
| Fats / sauces / condiments | 13 fats_and_extras | 15–25 |
| Convenience (whey, rice cakes, etc.) | mixed | 10–15 |
| **Total** | **167** | **~200–220** |

Do not seed in this task. Later expansion: same pipeline (`scripts/usda/*` lock + review), still USDA FDC snapshots **stored in-app**, not live search.

### ~40 representative examples (prefer cooked gym defaults)

Chicken breast cooked, chicken thigh cooked, turkey breast, 90/10 beef cooked, 93/7 beef, egg, egg whites, salmon cooked, tuna canned, shrimp, Greek yogurt 0%, cottage cheese, whey protein, rice cooked, jasmine rice, oats, pasta cooked, potato, sweet potato, tortilla, bread, banana, apple, blueberries, spinach, broccoli, green beans, olive oil, peanut butter, butter, avocado, milk, cheddar, protein bar (one generic), rice cakes, ketchup, soy sauce, honey, almonds.

Display layer: `displayName` already exists in the lock (e.g. “Tortilla, flour”). UI should use that, not `description`.

**Sourcing:** USDA FDC static catalog already in-repo. Alternatives considered and **not** chosen as primary: Open Food Facts (branded/user-variable), proprietary MFP dumps (license), hand-typed labels (error-prone). Build-vs-Reuse: **reuse the reviewed lock**. Optional later: a small branded convenience slice only if a defensible static source exists.

---

## 9. Recent / Frequent / Favorites / Custom

| List | Semantics | Implementation sketch (later) | Not |
|---|---|---|---|
| **Recent** | Distinct foods this user logged, newest first | From `food_entries` (`food_name`+`fdc_id`/`food_id`/`catalog_food_id`), last ~30 days, cap ~20 | Newest saved-food create time |
| **Frequent** | Deterministic repeat count | Count logs in last 30–90 days, min 3, sort count desc then recency | ML, time-of-day models |
| **Favorites** | Explicit star | New user-owned pin table or `foods.is_favorite` + catalog pin table | Auto-favorite |
| **Custom** | User-created macros | Existing `foods` with `source_status=manual` | USDA editor |

No recommendation AI.

---

## 10. Custom food

Minimum: Name, serving amount, unit, Calories, Protein, Carbs, Fat. Sticky Save.

Optional only if already cheap: brand, fiber (already on `foods`). Do not add sodium/vitamins/barcode.

Flow: Add Food → “Can’t find it?” → short form → optional “also log to {meal}”. Management stays on a secondary Foods screen.

Existing `createSavedFoodAction` / Manual Label already cover this; V2 is **UI reduction**, not a new nutrition-label database.

---

## 11. USDA deprecation (safe)

Do this in order. **Do not delete rows.**

1. **Remove from UI** — drop Search USDA composer, generic/branded toggle, FDC ID, `data_type` in results.
2. **Disable new live search** — stop calling `/api/usda/search` and `resolveLiveUsdaFoodDetail` from product code. Keep route returning 410 or unused until tests migrate.
3. **Keep historical data** — all `food_entries` including `source_status=usda_live` stay. Totals unchanged.
4. **Keep static catalog** — `food_catalog` + `usda_catalog` entries stay. This is Common Foods, not live search.
5. **Keep catalog/source columns** — `fdc_id`, per-100g, `source_*` remain for provenance and amount-edit of old USDA-shaped rows.
6. **Remove API key requirement** — after live client unused in prod/preview; drop `USDA_FDC_API_KEY` from env docs last.
7. **Remove dead code later** — `src/lib/usda/live.ts`, client, cache tests, `usda-live-search.spec.ts`, fixture mode. Rewrite e2e that click “Search USDA”.

Optional later (not now): deactivate unused catalog rows with `is_active=false`; never `DELETE` catalog rows that entries still reference (FK is set-null, but provenance is nicer if the row remains).

Privacy note: public Privacy copy currently mentions USDA FoodData Central for signed-in food search. When live search is gone, **update Privacy in a dedicated change** — not this research task.

---

## 12. Implementation phases (independently testable)

Adjusted to the actual split: snapshots and catalog already exist; the failure is **interaction design + live USDA**.

**Phase A — Today screen**  
Rebuild `/nutrition` as diary: kcal/macros + meal lists + per-meal Add. Same data loaders. Hide composer. Keep logging working via a temporary Add that still uses catalog actions.  
Test: day totals match snapshots; Home calories unchanged; meal grouping; date pager.

**Phase B — Add Food + Common Foods UX**  
Full-screen add; human catalog rows; amount/unit detail; log via existing `createCatalogFoodEntryAction`. Humanize names from lock `displayName`. No new seed required for V1 of this phase (167 foods).  
Test: search chicken → cooked breast; 150 g preview; log to lunch; e2e replace USDA description locators gradually.

**Phase C — Recent / Frequent / Favorites**  
Recent from entries; frequent counts; favorites pin.  
Test: log same food 3× appears in Frequent; star survives reload; empty states.

**Phase D — Custom food**  
Short form + secondary Foods manager. Keep fiber optional.  
Test: create, log, edit, delete food does not delete old entries.

**Phase E — USDA live removal**  
UI already gone from B. Disable route; remove key; delete live client/tests; Privacy follow-up.  
Test: no `api.nal.usda.gov`; old `usda_live` entries still render; amount-edit still uses entry snapshots.

Each phase ships without the next. Do not mix catalog reseeding into A.

---

## Risks / data preservation

- **Do not** `DELETE FROM food_entries` or strip snapshot columns.
- **Do not** make totals join `food_catalog` or USDA at read time.
- Amount-edit of USDA-shaped rows needs stored per-100g; if null, allow servings-only edit or block with a clear message — do not call live USDA.
- E2E currently asserts raw USDA descriptions (`Chicken, broiler or fryers…`). Humanize UI only with a test update in the same phase.
- `getMyRecentFoods` is misleading; replacing it without a plan would regress “recent saved” if anything still depends on create-order.
- Preview/Production USDA key can be removed only after Phase E; fixture mode must not become the product.

---

## Stop

This is a product/design brief for review. Next step after approval: Phase A only, on a new implementation branch, still not Production.
