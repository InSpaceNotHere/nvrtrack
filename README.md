# NVRTRACK

NVRTRACK is a mobile-first, private fitness tracking web app focused on speed and simplicity.

## Current Scope (Sessions 1, 1.5, 2, 3, 4, 5, 6, and 7)

The app currently includes:

- Session 1 foundation (Next.js App Router + TypeScript + Tailwind)
- Session 1.5 visual refinement pass (mobile-first dark premium UI)
- Session 2 authentication:
  - Supabase email/password signup and login
  - Cookie-based server-side session handling
  - Server-side route protection for app routes
  - Redirects between public auth routes and protected app routes
  - Logout from the Profile screen
- Session 3 database foundation:
  - `profiles` table with per-user ownership model
  - `weight_entries` table with per-user ownership model
  - automatic profile creation trigger on new auth users
  - existing-user profile backfill migration
  - reusable `updated_at` trigger function
  - RLS policies on both new tables
  - typed server data helpers
- Session 4 body-weight tracking:
  - live body-weight CRUD (create, edit, delete, history) for authenticated users
  - duplicate-date handling tied to `(user_id, entry_date)` uniqueness
  - live Home + Progress weight metrics
  - live responsive weight trend chart using real entries
  - tested seven-day and previous-period weight calculations with unit conversion support
- Session 5 profile and goal persistence:
  - live Profile form persistence for account/body/nutrition goal fields in `public.profiles`
  - server-side profile validation + normalized null handling for optional fields
  - Home and Nutrition use live profile goals
  - preferred weight unit drives weight display unit across Home/Progress calculations without rewriting stored entries
- Session 6 nutrition database foundation:
  - migration adds `foods` and `food_entries` with ownership/RLS policies
  - food-entry snapshot model preserves historical nutrition values
  - typed nutrition calculations + validation utilities and tests
  - typed secure server data helpers for saved foods and food entries
  - schema + helper foundation for Session 7 UI wiring
- Session 7 food and meal logging UI:
  - live `/nutrition` daily intake totals, meal groups, and date navigation from `food_entries`
  - Add Food flow supports saved-food logging, quick custom entries, servings, date, meal type, and optional notes
  - logged entries can be edited (servings, meal, date, note) or deleted with confirmation
  - saved-food management route at `/nutrition/foods` supports search/create/edit/delete
  - Home calorie and macro consumed values are now sourced from today’s live food entries

## Technology

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Lucide React icons
- ESLint 9
- Supabase SSR (`@supabase/ssr`)
- Supabase JS (`@supabase/supabase-js`)

## Supabase Project Setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the Supabase dashboard, open **Project Settings → API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API key (anon/public key)** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** use a service-role key in this frontend app.

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

`.env.local` format:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Foundation (Session 3)

### Tables added

- `public.profiles`
- `public.weight_entries`

### Migrations in repository

- `supabase/migrations/20260720042756_create_profiles_and_weight_entries.sql`

This migration defines:

- table schemas
- validation constraints
- unique/index strategy
- reusable `updated_at` trigger function
- profile auto-create trigger on `auth.users`
- profile backfill for existing users
- row-level security and ownership policies

### Privacy model (RLS)

- `profiles`: users can select/insert/update/delete **only** rows where `auth.uid() = id`
- `weight_entries`: users can select/insert/update/delete **only** rows where `auth.uid() = user_id`

No broad public access policies are created.

### Automatic profile creation

When a new auth user is created, a trigger inserts a matching profile row.
The migration also backfills profile rows for users created before Session 3.

### Applying migrations

Local (CLI + local stack):

```bash
npx supabase start
npx supabase db reset
```

Remote project (after CLI auth/link):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Generating database types

The app currently uses `src/types/database.ts` for typed Supabase access.

Recommended regeneration from live schema (when CLI is authenticated and linked):

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

## Local Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Tests

```bash
npm run test
```

## Routes

### Public routes

- `/login`
- `/signup`
- `/auth/callback` (used by Supabase email confirmation flow)

### Protected routes

- `/`
- `/nutrition`
- `/training`
- `/progress`
- `/profile`

## Authentication Behavior

- Unauthenticated users trying to access protected routes are redirected to `/login`.
- Authenticated users visiting `/login` or `/signup` are redirected to `/`.
- Session cookies are refreshed server-side via Next.js `proxy.ts` + Supabase SSR.
- Refreshing the browser preserves login state when valid session cookies exist.
- Logout clears the Supabase session and redirects to `/login`.

## Signup Confirmation Behavior

- If your Supabase project requires email confirmation, signup shows a success state asking the user to check email.
- After clicking the confirmation link, Supabase returns through `/auth/callback`, which exchanges the code for a session and redirects to `/`.
- If email confirmation is disabled in your Supabase project, signup may sign the user in immediately.

## Manual Auth Test Checklist

After configuring `.env.local` and running `npm run dev`:

1. Visit `/` while logged out → confirm redirect to `/login`.
2. Create an account at `/signup`.
3. If confirmation is enabled, confirm the email via inbox.
4. Log in at `/login`.
5. Confirm access to all protected routes.
6. Refresh a protected page → confirm session persists.
7. Use **Log Out** on `/profile` → confirm redirect to `/login`.
8. Try opening `/login` while authenticated → confirm redirect to `/`.

## Session 4: Body-Weight Tracking

### Scope

Body-weight features are now connected to live Supabase data for authenticated users.

Implemented in this session:

- Log a weight entry (weight, unit, entry date, optional note)
- View weight history (newest first)
- Edit existing entries
- Delete entries with confirmation
- Live metrics on Home and Progress:
  - current/latest weight (by `entry_date`)
  - change from previous entry
  - current seven-day average
  - comparison vs previous seven-day period
- Responsive live trend chart based on actual entries

### How weight logging works

- Mutations run through server actions with authenticated server-side Supabase context.
- User identity is derived from the server session; browser input never supplies trusted `user_id`.
- After successful create/edit/delete, Home and Progress are revalidated so refreshed metrics show immediately.

### Calculation definitions

- **Latest weight**: newest row by `entry_date` (not insertion timestamp).
- **Previous-entry change**: `latest - previous` using chronological entries.
- **Current seven-day average window**: today plus previous six calendar days.
- **Previous seven-day average window**: the seven calendar days immediately before the current window.
- **Comparison minimum-data rule**: previous-period comparison is shown only when **both** windows have at least **2 entries**; otherwise a neutral unavailable state is shown.
- Missing days are not imputed; averages use only entries that exist in each window.

### Unit-conversion behavior

- Stored entries may be `lb` or `kg`.
- For calculations, entries are converted into the user display unit (profile preference, default `lb`) before averaging/comparison.
- Conversion helpers:
  - pounds → kilograms
  - kilograms → pounds
- Input is normalized and rounded to practical precision before save.

### Duplicate-date behavior

The database enforces one row per `(user_id, entry_date)`.

When creating a row for an existing date:

- the UI shows a clear duplicate-date message
- users can explicitly choose **Update Existing Entry**
- raw unique-constraint errors are not shown to the end user

### Live vs static dashboard sections

**Live in Session 4**

- Home: all weight-related metrics and trend
- Progress Overview: weight metrics, trend, and weight history CRUD

**Still static in Session 4**

- consumed calories and consumed macro totals
- meals
- workouts and training blocks
- strength PR cards / 1000 LB Club
- photos/measurements tabs

## Manual Session 4 Test Checklist

After configuring `.env.local` and running `npm run dev`:

1. Log in and open `/progress`.
2. Create first weight entry.
3. Refresh page and confirm entry persists.
4. Create second entry on a different date and confirm latest/change metrics update.
5. Try creating another entry for the same date and confirm duplicate-date prompt appears.
6. Use **Update Existing Entry** path and confirm data updates.
7. Edit an existing entry and confirm values/history refresh.
8. Delete an entry via confirmation and confirm it is removed.
9. Confirm Home (`/`) and Progress (`/progress`) reflect updated live weight values after mutations.
10. Confirm `/profile` still loads for authenticated users.
11. Verify a different authenticated user cannot read or mutate another user’s entries (RLS ownership behavior).

## Session 5: Profile and Goal Persistence

### Scope

Profile fields are now persisted to `public.profiles` for authenticated users:

- `display_name`
- `height_inches`
- `calorie_goal`
- `protein_goal`
- `carbohydrate_goal`
- `fat_goal`
- `preferred_weight_unit`

The `/profile` page now loads existing values, saves updates, and reflects saved values after refresh.

### Height storage behavior

- Height is stored and edited as total inches (`height_inches`).
- The Profile form displays helper text in imperial style when valid (for example, `69` → `5 ft 9 in`).
- Blank height is normalized to `null` (not coerced to `0`).

### Preferred-unit behavior

- Supported units are `lb` and `kg`.
- Saving a new preferred unit does **not** rewrite historical `weight_entries` rows.
- Session 4 weight utilities convert entries for display/calculation using the selected profile unit.
- Home and Progress reflect the preferred unit after save + revalidation.

### Live goals vs static consumed nutrition

- **Live from profile:** calorie/macronutrient goal values.
- **Still static sample data:** consumed calories, consumed macros, and meal rows.
- When a goal is unset (`null`), UI shows neutral setup state (`Goal not set`) instead of fake defaults.

### Validation rules

Validation runs in shared utilities and is enforced by server-side save actions:

- Display name: trimmed, max 60 characters
- Height inches: optional whole number between 36 and 96
- Calorie goal: optional whole number between 0 and 10,000
- Protein/carbohydrate/fat goals: optional whole number between 0 and 1,000
- Preferred unit: must be `lb` or `kg`
- Blank optional numeric fields are saved as `null`

### Mutation and cache behavior

- Profile updates run through authenticated server actions (no trusted client user IDs).
- Successful saves revalidate:
  - `/`
  - `/nutrition`
  - `/progress`
  - `/profile`

### Manual Session 5 Test Checklist

After configuring `.env.local` and running `npm run dev`:

1. Open `/profile` while authenticated and confirm existing values load.
2. Update display name, height, goals, and preferred unit, then save.
3. Refresh `/profile` and confirm values persist.
4. Set at least one optional goal blank, save, and confirm neutral goal state appears on dashboards.
5. Confirm Home shows greeting with display name and live goal values.
6. Confirm Nutrition goal labels reflect profile values while consumed/meal data stays static.
7. Change preferred unit and confirm weight cards on Home/Progress display the new unit.
8. Enter invalid profile values and confirm useful validation feedback appears.
9. Verify a different authenticated user cannot read or modify another user’s profile row (RLS ownership behavior).

## Session 6: Nutrition Database Foundation

### Scope

Session 6 adds secure nutrition database infrastructure and typed server-side helpers.  
It does **not** connect Nutrition UI intake cards to live log data yet.

### New tables

- `public.foods`
  - user-owned saved foods
  - name/serving/nutrition validation checks
  - per-user query indexes (recency + name search)
- `public.food_entries`
  - user-owned logged food entries by date + meal type
  - supports optional reference to saved food (`food_id`)
  - stores immutable nutrition snapshot fields

### Meal types

Allowed `meal_type` values:

- `breakfast`
- `lunch`
- `dinner`
- `snack`

### Snapshot history model

Food entries store snapshot values (name, serving, calories/macros/fiber per serving) at log time.

Implications:

- Editing a saved food later does **not** rewrite historical entries.
- Deleting a saved food sets `food_entries.food_id` to `null` (`on delete set null`), while historical snapshot values remain intact.

### Ownership and RLS model

Both `foods` and `food_entries` are RLS-protected with owner-only policies:

- select own rows
- insert own rows (`with check`)
- update own rows (`using` + `with check`)
- delete own rows

No public access policies are added.

### Updated timestamp behavior

Both tables use the existing reusable `public.set_updated_at()` trigger function for `updated_at`.

### Typed nutrition utilities

Added reusable modules:

- `src/lib/nutrition/types.ts`
- `src/lib/nutrition/validation.ts`
- `src/lib/nutrition/calculations.ts`

Utilities support:

- per-entry totals (`per-serving × servings`)
- daily totals aggregation
- per-meal grouping totals
- goal progress handling for null/zero/under/over-goal cases
- saved-food and food-entry validation

### Typed server data helpers

Added secure server-side data helpers:

- `src/lib/data/foods.ts`
  - `getMyFoods`, `searchMyFoods`, `getMyRecentFoods`, `getMyFoodById`
  - `createMyFood`, `updateMyFood`, `deleteMyFood`
- `src/lib/data/nutrition.ts`
  - `getMyFoodEntriesForDate`, `getMyFoodEntriesForDateRange`, `getMyRecentFoodEntries`
  - `createMyFoodEntry`, `updateMyFoodEntry`, `deleteMyFoodEntry`

When creating from a saved food ID, helpers load the authenticated user’s food and server-copy snapshot values.

### Migration and type generation commands

Migration file:

- `supabase/migrations/20260720054800_create_foods_and_food_entries.sql`

Apply to linked remote project:

```bash
npx supabase migration list
npx supabase db push
```

Regenerate database types after migration:

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

### Session 6 test scope

- Added nutrition utility and validation tests:
  - `src/lib/nutrition/calculations.test.ts`
  - `src/lib/nutrition/validation.test.ts`

## Session 7: Food and Meal Logging UI

### Scope

Session 7 connects Nutrition and Home consumed-intake views to live Supabase nutrition data.

Implemented in this session:

- `/nutrition` now loads live entries for a selected date (`?date=YYYY-MM-DD`) using server-side authenticated helpers.
- Daily calories, macros, and fiber are calculated from `food_entries` snapshots (`per-serving × servings`).
- Meal sections (Breakfast, Lunch, Dinner, Snacks) render live grouped entries and meal calorie totals.
- Entry-level actions:
  - create from saved food
  - create direct custom entry (without saving)
  - edit servings/meal/date/note while keeping snapshot nutrition unchanged
  - delete with confirmation
- Add Food flow includes:
  - recent saved foods
  - recent logged foods quick-fill
  - client-side search over authenticated user foods
  - create new saved food inline
- `/nutrition/foods` route adds saved-food management:
  - search
  - create
  - edit
  - delete with explicit historical snapshot warning
- Home dashboard consumed calories/macros now reflect live totals for today’s logged entries.

### Date navigation behavior

- Date source of truth is the `date` query parameter on `/nutrition`.
- Invalid or malformed date query values safely fall back to today.
- Previous/Today/Next controls update the `date` query.
- A shared utility module handles:
  - date-string validation
  - fallback normalization
  - day offset navigation

### Snapshot behavior in UI

- Logged entries always display snapshot nutrition values stored on the entry row.
- Editing a logged entry does not refresh snapshot values from current saved-food data.
- Deleting a saved food does not erase historical entries; `food_id` is detached while snapshot nutrition remains.

### Manual Session 7 Test Checklist

After configuring `.env.local` and running `npm run dev`:

1. Open `/nutrition` and confirm totals initialize from live data (or zero when no entries exist).
2. Create a saved food from the Add Food flow and verify it appears in search/recent lists.
3. Log that saved food to Breakfast and verify daily + meal totals update.
4. Log a fractional serving and verify totals reflect decimal servings.
5. Log a Quick Custom Entry and verify it appears in the selected meal.
6. Edit an entry’s servings, meal, date, and note; verify totals and grouping update.
7. Delete an entry and verify it disappears and totals recalculate.
8. Navigate dates via Previous/Next/Today and confirm the URL query updates and data reloads.
9. Open `/nutrition/foods`, search foods, edit a saved food, and confirm historical logged entries keep old snapshot values.
10. Delete a saved food and confirm existing historical entries remain visible with nutrition intact.
11. Refresh `/nutrition` and `/nutrition/foods` and confirm data persists.
12. Open `/` and verify calorie/macro consumed values match today’s live entry totals.
