# NVRTRACK

NVRTRACK is a mobile-first, private fitness tracking web app focused on speed and simplicity.

## Current Scope (Sessions 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 9.5A, 9.5B Phase 2A, 9.5B Phase 2B, 9.5B Phase 2C, and 9.5B Phase 2D)

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
- Session 8 workout database foundation:
  - migration adds `exercises`, `workouts`, `workout_exercises`, and `workout_sets`
  - ownership-safe parent/child enforcement with composite foreign keys and exercise ownership validation trigger
  - immutable `exercise_name` snapshot behavior for historical workout entries
  - typed workout validation and calculation utilities (volume + Epley estimated 1RM + best set + PR candidate)
  - secure server-side workout data helpers (library/workout/workout exercise/workout set CRUD + reorder)
- Session 9 workout logging UI:
  - `/training` now uses live workout data (active workout resume, recent history, completed-this-week count, recent exercises)
  - `/training/start` creates a live workout with name/date/optional notes and redirects into logger route
  - `/training/workouts/[workoutId]` supports active logging and completed summary view
  - `/training/history` lists workouts newest-first with status, counts, volume, and duration
  - `/training/exercises` route exists for training exercise management
  - Home workout card now reflects live workout state (continue active, today completed, start workout, or no workout yet)
- Session 9.5A built-in exercise catalog:
  - adds global read-only `exercise_catalog` table
  - `workout_exercises` can reference `catalog_exercise_id` (catalog), `exercise_id` (user custom), or snapshot-only custom name
  - Add Exercise flow is catalog-first (search + muscle/equipment filters)
  - `/training/exercises` is now a catalog browser with recent/frequent sections
  - custom exercise remains a restrained fallback and historical snapshots stay immutable
- Session 9.5B Phase 2A USDA pilot catalog pipeline:
  - reviewed USDA candidate discovery script for exact FDC selection
  - checked-in reviewed pilot manifest (20 exact records)
  - checked-in normalized lock file with provenance + nutrient diagnostics
  - deterministic SQL seed generation from manifest + lock (no live API dependency at generation time)
  - additive migration that upserts only approved pilot FDC IDs into `public.food_catalog`
- Session 9.5B Phase 2B Common catalog logging:
  - `/nutrition` Add Food is now **catalog-first** with `Common`, `My Foods`, and `Manual Label` modes
  - Common mode reads only local `public.food_catalog` pilot rows (no browser USDA calls)
  - trusted server actions log/edit catalog entries using snapshotted source + per-100g nutrition
  - catalog amount units support grams, ounces, and source serving only when trusted gram weight exists
  - Home and Nutrition totals stay compatible through the existing per-serving snapshot model (`servings = 1` for catalog amount entries)
- Session 9.5B Phase 2C expanded reviewed common catalog + scaled local search:
  - reviewed local Common catalog expanded to 167 exact USDA-backed rows (20 locked pilot + 147 reviewed expansion rows)
  - batch-oriented reviewed target workflow (`scripts/usda/catalog-target-batches.ts`) with deterministic lock + SQL generation
  - Nutrition Common mode now uses **server-side bounded local search** (no full-catalog browser preload)
  - initial Common results are capped featured rows; typed search queries return bounded ranked rows from local `food_catalog`
- Session 9.5B Phase 2D live USDA search + trusted logging + save-to-My-Foods:
  - Add Food now includes a distinct **Search USDA** mode alongside Common, My Foods, and Manual Label
  - USDA search is authenticated server-only via `/api/usda/search` and never exposes `USDA_FDC_API_KEY` to the browser
  - Generic and Branded USDA results are ranked separately with deterministic ordering and bounded result limits
  - selected USDA records are re-resolved by exact FDC ID server-side before logging
  - live USDA logs snapshot source/per-100g/amount metadata with `source_status = usda_live`
  - optional save-to-My-Foods reuses existing user+FDC records and avoids uncontrolled duplicates
  - editing saved USDA nutrition marks rows as `usda_modified` while preserving provenance metadata
  - fixture-backed USDA mode supports permanent E2E coverage without live USDA dependency

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
- `/nutrition/foods`
- `/training`
- `/training/start`
- `/training/history`
- `/training/exercises`
- `/training/workouts/[workoutId]`
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

## Session 8: Workout Database Foundation

### Scope

Session 8 adds secure workout database infrastructure, validation, calculations, and typed server-side helpers.

This session does **not** connect the Training page UI to live workout data yet.  
Training remains static until Session 9.

### New workout tables

- `public.exercises`
  - user-owned exercise library
  - case-insensitive per-user duplicate-name prevention
- `public.workouts`
  - user-owned workout sessions by date
  - optional `started_at` and `completed_at` with ordering constraint
- `public.workout_exercises`
  - ordered workout exercises with immutable `exercise_name` snapshot
  - optional `exercise_id` reference to saved library exercise
- `public.workout_sets`
  - ordered sets under each workout exercise
  - set type, optional load/unit/reps/RPE, completion state, optional notes

### Workout relationship model

- `workout_exercises` belongs to `workouts` using ownership-safe composite FK:
  - `(workout_id, user_id) -> workouts(id, user_id)`
- `workout_sets` belongs to `workout_exercises` using ownership-safe composite FK:
  - `(workout_exercise_id, user_id) -> workout_exercises(id, user_id)`
- `exercise_id` uses `on delete set null` so historical workout rows remain after exercise-library deletion.

### Exercise snapshot behavior

- Logging or attaching a library exercise copies its current name into `workout_exercises.exercise_name`.
- Historical workout rows continue to show that snapshot name.
- Renaming or deleting a library exercise does not rewrite completed workout history.

### Set model and validation highlights

- Allowed `set_type` values:
  - `warmup`, `working`, `top`, `backoff`, `drop`, `failure`
- `position`, `weight`, and `reps` are nonnegative when provided.
- `weight_unit` must be `lb` or `kg` when provided.
- `rpe` must be between 1 and 10 when provided.
- Completed sets require at least reps, weight, or a meaningful note.

### Volume and strength calculations

- **Set volume**: `weight × reps` for valid completed weighted sets.
- **Exercise volume**: sum of valid set volumes for that exercise.
- **Workout volume**: sum of valid exercise volumes.
- **Estimated 1RM formula** (Epley):
  - `estimated_1rm = weight × (1 + reps / 30)`
- One-rep sets treat estimated 1RM as the entered lifted weight.
- Mixed units are converted to selected display unit (`lb`/`kg`) before combining.

### RLS ownership model

All four workout tables are RLS-enabled with owner-only policies:

- select own rows
- insert own rows (`with check`)
- update own rows (`using` + `with check`)
- delete own rows

No public policies are created.

### Migration workflow

Migration file:

- `supabase/migrations/20260720064500_create_workout_tracking.sql`

Apply after Supabase CLI auth and project link:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Regenerate database types from linked schema:

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

### Manual Session 8 Test Checklist

1. Create exercise(s) and verify they persist and are searchable per user.
2. Create workout(s) and verify date ordering and refresh persistence.
3. Add workout exercises from library and as custom snapshots.
4. Add/update/delete/reorder workout exercises and verify unique positions remain stable.
5. Add/update/delete/reorder sets and verify unique set positions remain stable.
6. Verify volume + estimated-1RM helpers on representative completed/incomplete/mixed-unit sets.
7. Rename a library exercise and verify historical `exercise_name` snapshot rows do not change.
8. Delete a library exercise and verify workout history remains with `exercise_id` detached.
9. Verify User B cannot read or mutate User A exercises/workouts/workout children.
10. Delete a workout and verify child workout exercises/sets are removed by cascade.

## Session 9: Workout Logging UI

### Scope

Session 9 connects Training and Home workout sections to live Supabase workout data.

Implemented in this session:

- Training dashboard (`/training`) now shows:
  - active workout resume when `completed_at` is null
  - Start Workout action
  - recent workouts from live data
  - current week completed-workout count
  - recent exercises and exercise-library/history links
- Start flow (`/training/start`) creates workouts with:
  - required name
  - required workout date
  - optional notes
  - server-side `started_at` initialization
  - redirect to stable logger route
- Workout logger/detail (`/training/workouts/[workoutId]`) now supports:
  - editing workout metadata (name/date/notes)
  - adding exercises from saved library, custom snapshots, or create-and-add flow
  - ordered set logging with set type, weight, unit, reps, RPE, completion, notes
  - set duplication (copies set type + weight values, keeps completion false)
  - set edit, complete/incomplete toggle, move up/down, delete with confirmation
  - exercise move up/down and remove with confirmation
  - completion workflow requiring meaningful set confirmation before forced completion
  - completed workout summary mode (read-only in this session)
- Workout history (`/training/history`) now shows live workouts newest-first with:
  - completion status
  - exercise count
  - completed/total set count
  - total volume
  - duration when started/completed timestamps are available
  - delete with confirmation
- Exercise library (`/training/exercises`) supports:
  - list/search
  - create/edit/delete
  - muscle group and equipment display
  - last-used date when available
  - explicit snapshot preservation messaging when deleting

### Server/client architecture

- **Server Components** handle secure initial loading:
  - `/training`
  - `/training/start`
  - `/training/history`
  - `/training/exercises`
  - `/training/workouts/[workoutId]`
- **Server Actions** in `src/app/(protected)/actions/training-actions.ts` handle all workout/exercise/set mutations.
- **Client Components** provide high-speed set-entry interactions and confirmation UX.
- All authenticated identity derivation stays server-side; client never supplies trusted `user_id`.
- Mutations revalidate relevant routes (`/`, `/training`, `/training/start`, `/training/history`, `/training/exercises`, workout detail route).

### Active-workout persistence behavior

- Active workouts are identified by `completed_at is null`.
- Most recently started unfinished workout is surfaced on `/training` and Home card.
- Workout logger route is stable (`/training/workouts/[workoutId]`), so refresh preserves active session context.
- Unfinished workouts remain resumable after refresh and auth round trips because state is persisted in database rows.

### Previous-performance and estimated PR behavior

- Previous performance matching order:
  1. `exercise_id` exact match when available
  2. normalized snapshot `exercise_name` match (`trim + lowercase`) when detached/custom
- Workout logger shows:
  - latest matched workout date
  - latest completed sets
  - previous best estimated 1RM
- Estimated PR indicators are derived from existing calculation helpers and labeled as **potential estimated PR**.
- No permanent PR table is written in Session 9.

### Snapshot behavior reminder

- `workout_exercises.exercise_name` remains the historical snapshot.
- Renaming/deleting library exercises does not rewrite existing workout snapshot names.
- Deleting library exercises detaches future direct linkage while preserving history rows.

### Live vs future Training scope

**Live in Session 9**

- Workout/exercise/set CRUD and ordering
- Workout completion and history
- Previous-performance summaries and potential estimated PR hints
- Home workout card live state

**Out of scope / future**

- Workout templates
- Program scheduling
- Permanent PR records
- AI coaching/recommendations
- Social features
- Health-platform integrations

### Manual Session 9 Test Checklist

1. Open `/training/exercises`, create a new exercise, search it, edit it, and confirm update persists.
2. Start a workout at `/training/start` and confirm redirect to `/training/workouts/[workoutId]`.
3. Add one saved exercise and one custom snapshot exercise to the workout.
4. Add multiple sets, fill weight/reps/RPE/type, and save.
5. Duplicate a set and confirm duplicated set starts incomplete.
6. Toggle completion on a set, edit completed set values, and confirm values persist after refresh.
7. Reorder sets using Up/Down controls and confirm ordering remains valid.
8. Delete a set and confirm remaining positions stay valid.
9. Reorder exercises and remove an exercise; confirm list remains valid.
10. Confirm previous-performance block appears for exercises with historical matches.
11. Complete workout and confirm redirect to summary mode with totals.
12. Open `/training/history` and verify workout appears with live counts/volume/duration.
13. Start another workout, leave unfinished, return to `/training`, and confirm Continue Active Workout appears.
14. Delete unfinished workout with confirmation and verify removal.
15. Rename/delete a library exercise and confirm previously completed workout snapshot names remain unchanged.
16. Confirm Home workout card reflects active/completed/empty states from live workout data.
17. Verify cross-user isolation (User B cannot access User A workout details or mutate User A rows).

## Session 9.5A: Built-In Exercise Catalog

### Scope

Session 9.5A changes exercise selection from user-created-first to a global curated catalog-first experience.

### Database architecture

New migration:

- `supabase/migrations/20260720100400_add_exercise_catalog.sql`

Schema additions:

- new global table `public.exercise_catalog` with:
  - `id`, `name`, `normalized_name`, `aliases`
  - `primary_muscle_group`, `secondary_muscle_groups`
  - `equipment`, `movement_pattern`, `instructions`
  - `is_active`, `created_at`, `updated_at`
- `workout_exercises.catalog_exercise_id` nullable FK to catalog (`on delete set null`)
- check constraint so each workout exercise references at most one source:
  - `exercise_id` (user-owned custom exercise)
  - `catalog_exercise_id` (global catalog)
  - or neither (snapshot-only custom)

### Catalog security model

- RLS enabled on `exercise_catalog`.
- Authenticated users can read active catalog rows.
- No insert/update/delete policy is granted to normal authenticated users.
- Existing RLS for user-owned workout/exercise tables remains unchanged.

### Catalog content and search

- Catalog is seeded with curated practical exercises spanning:
  - barbell, dumbbell, cable, machine, smith machine, bodyweight, plate-loaded, cardio
- Canonical names and aliases support common query forms such as:
  - `rdl`
  - `bench`
  - `pulldown`
  - `side raise`
  - `tricep pressdown`

### UX changes

- Workout Add Exercise flow is now catalog-first:
  1. search
  2. muscle filter
  3. equipment filter
  4. select catalog exercise
  5. add to workout
- “Can’t find it?” custom fallback remains available and clearly marked as custom source.
- `/training/exercises` is now catalog browser (not primary CRUD form) with:
  - search
  - muscle/equipment filters
  - recently used catalog exercises
  - frequently used catalog exercises

### Matching and snapshot behavior

- Previous-performance matching order:
  1. `catalog_exercise_id`
  2. `exercise_id`
  3. normalized `exercise_name` snapshot fallback
- Historical workout display remains snapshot-based via `exercise_name`.
- Catalog updates/deactivation do not rewrite historical workout names.

### Manual Session 9.5A Checklist

1. Open `/training/exercises` and verify catalog search + filters work.
2. Confirm alias searches (`rdl`, `pulldown`, `side raise`, `tricep pressdown`) return expected exercises.
3. Start a workout and add exercise directly from catalog.
4. Add custom fallback exercise and verify it is labeled as custom in logger.
5. Confirm previous-performance still appears for repeated catalog exercises.
6. Confirm Home and `/training` workout cards remain live and accurate.
7. Verify User A cannot read/modify User B custom exercise rows.
8. Verify catalog rows are readable but not writable by authenticated non-admin users.

## Session 9.5B Phase 2A: Reviewed USDA Pilot Catalog Seed

### Scope

Phase 2A adds a **reviewed, deterministic USDA pilot-catalog seeding workflow**.  
This phase does **not** add Nutrition UI changes, browser USDA search, or direct food logging flows yet.

### USDA attribution

Nutrition source data in this phase comes from **USDA FoodData Central**.

### Pipeline overview

The pilot catalog generation is a three-stage workflow:

1. **Candidate discovery (live USDA search)**
   - `scripts/usda/discover-candidates.ts`
   - Outputs temporary review reports (not committed) under `scripts/usda/generated/`.
2. **Reviewed manifest + locked normalized records**
   - Reviewed manifest: `scripts/usda/food-catalog-manifest.ts`
   - Detail fetch + lock generation: `scripts/usda/fetch-reviewed-foods.ts`
   - Lock file: `scripts/usda/generated/food-catalog-pilot.lock.json`
   - Review table: `scripts/usda/generated/food-catalog-pilot.review.md`
3. **Deterministic SQL generation**
   - Generator: `scripts/usda/generate-food-catalog-seed.ts`
   - Seed SQL: `scripts/usda/generated/food-catalog-pilot.sql`
   - Migration output: `supabase/migrations/20260720201500_seed_usda_food_catalog_pilot.sql`

### Why lock data is checked in

- USDA upstream records can change over time.
- Seed SQL generation is intentionally deterministic from checked-in inputs:
  - reviewed manifest
  - normalized lock data
- Routine generation does **not** refetch USDA automatically.
- To refresh data intentionally, run discovery/review/fetch again and commit updated lock + SQL outputs.

### Raw-versus-cooked and source precision rules

- Manifest records explicitly preserve raw/cooked/preparation wording from USDA descriptions.
- Raw and cooked records are intentionally separate entries (for example chicken and ground beef pairs).
- Aliases improve search only; they do not collapse distinct preparation states.

### Missing-versus-zero nutrient handling

- Core nutrients required for pilot approval:
  - calories (kcal), protein, carbohydrate, fat
- Optional nutrients (fiber, sugar, sodium) may remain `null` when USDA does not provide them.
- Missing optional nutrients are **not** coerced to zero.
- kJ values are not treated as kcal.

### Commands

Run the pilot pipeline commands:

```bash
npm run usda:discover
npm run usda:fetch-pilot
npm run usda:generate-pilot
npm run usda:verify-pilot
```

Then verify code health:

```bash
npm run test
npm run lint
npm run build
```

### Required environment variable

- `USDA_FDC_API_KEY` must be present in server environment (`.env.local` for local development).
- Never expose this key to browser code or commit it to git.

## Session 9.5B Phase 2B: Common Food Catalog Logging (Pilot 20)

### Scope

Phase 2B wires the pilot USDA-backed catalog into live meal logging without introducing live USDA browser search yet.

Primary Add Food modes:

- **Common** (pilot `food_catalog` rows)
- **My Foods** (user-owned saved foods)
- **Manual Label** (fallback custom snapshot entry)

### Trusted server boundary

Catalog logging is server-trusted:

- Browser submits only:
  - `catalog_food_id`
  - amount value + unit
  - meal/date/note
- Server resolves active catalog row, validates unit/amount, computes grams + nutrition from trusted per-100g values, writes immutable snapshot fields, and revalidates `/nutrition` + `/`.
- Client-submitted macro values are not authoritative for catalog entries.

### Catalog search/ranking behavior

Common mode search uses local `food_catalog` data only (no live USDA API call in this phase) with deterministic ranking:

1. exact normalized-name match
2. exact alias match
3. normalized-name prefix match
4. all query terms in normalized name
5. all query terms in aliases
6. recent catalog usage tie-break

Raw/cooked records remain separate; exact USDA descriptions are shown in result rows and logged entries.

### Amount and serving model

For newly logged catalog entries:

- `servings = 1`
- `serving_size = entered amount value`
- `serving_unit = entered amount unit`
- `calories/macros per serving = computed totals for that exact amount`
- `amount_value`, `amount_unit`, and `amount_grams` are snapshotted
- `source_status = usda_catalog` with source metadata (`fdc_id`, description, data type, brand/GTIN when present, retrieval timestamp)
- per-100g source nutrients are snapshotted for future safe recalculation

Supported catalog amount units:

- grams (`g`)
- ounces (`oz`)
- source serving (`source_serving`) only when trusted source gram weight exists

Unsupported food-specific units are not guessed.

### Historical snapshot behavior

- Old logs are not rewritten when catalog rows change/deactivate.
- Catalog-entry quantity edits recalculate from the entry’s own stored per-100g/source-serving snapshots, not by refetching a current catalog row.
- Manual and My Foods entry paths continue to use existing snapshot behavior.

### Reliability and fallback behavior

- If catalog data is unavailable, existing My Foods/manual flows still remain available.
- This phase does not add live USDA query dependencies to the browser test path.

### Verification commands

```bash
npm run test
npx playwright test tests/e2e/food-catalog.spec.ts
npm run test:e2e
npm run lint
npm run build
```

### Manual verification checklist (Phase 2B)

1. Open `/nutrition` and Add Food composer.
2. Confirm `Common`, `My Foods`, and `Manual Label` modes are available.
3. Search Common foods for chicken breast and verify raw/cooked records are distinct.
4. Log a Common entry in grams and confirm totals update.
5. Edit that Common entry to ounces and confirm persistence after refresh.
6. Delete the Common entry and confirm totals revert.
7. Confirm Home totals reflect nutrition changes.
8. Confirm My Foods logging and Manual Label logging still work.
9. Confirm browser traffic does not call USDA directly.

## Session 9.5B Phase 2C: Expanded Reviewed Common Catalog + Scaled Local Search

### Expanded Common catalog scope

Phase 2C expands the reviewed Common catalog from the original 20 pilot records to **167 total reviewed USDA-backed rows**:

- **20** locked pilot records (unchanged from Phase 2A)
- **147** reviewed expansion records

Catalog rows are grouped under app-facing categories:

- `protein`
- `seafood`
- `dairy`
- `grains_and_starches`
- `fruit`
- `vegetables`
- `fats_and_extras`

### Reviewed batch workflow (no uncontrolled bulk approval)

Common catalog expansion follows reviewed batches with deterministic artifacts:

1. Define target concepts in `scripts/usda/catalog-target-batches.ts`
2. Run candidate discovery (optionally by `--batch=<batch-id>`)
3. Review exact USDA candidate descriptions and reject noisy matches
4. Approve exact FDC IDs into `scripts/usda/food-catalog-manifest.ts`
5. Fetch exact detail records into a normalized lock file
6. Generate deterministic SQL from manifest + lock
7. Verify deterministic regeneration before migration

### Exact FDC approval and pilot stability

- Every approved row must keep:
  - exact USDA FDC ID
  - exact USDA description
  - exact USDA data type
- Existing pilot FDC IDs are intentionally locked in `PILOT_LOCKED_RECORDS` and must not be silently replaced.
- Raw/cooked, skin state, and lean-percentage distinctions are preserved as separate rows when USDA source rows are distinct.

### Data-type selection rules

Selection favors exact identity and preparation clarity over forcing one source type:

- Prefer **Foundation** or **Survey (FNDDS)** when they are the best exact match.
- Use **SR Legacy** when it is the clearest defensible exact record.
- Avoid branded rows for generic Common foods unless a specific reviewed exception is documented.

### Nutrient trust model

For every approved catalog row:

- calories, protein, carbohydrate, and fat per 100g are required
- optional nutrients (fiber, sugar, sodium) may remain `null` when unavailable upstream
- no fabricated nutrient values or guessed conversions are introduced

### Deterministic refresh model

The three-stage model remains intact:

1. **Live discovery**
2. **Reviewed manifest + normalized lock file**
3. **Deterministic SQL generation from checked-in inputs**

Deterministic guarantees:

- generated SQL is byte-stable when inputs are unchanged
- lock/SQL records are sorted deterministically
- lock `retrievedAt` timestamps are pinned in checked-in artifacts
- generation does not inject secrets or private user data

Primary artifacts:

- Manifest: `scripts/usda/food-catalog-manifest.ts`
- Lock file: `scripts/usda/generated/food-catalog-reviewed.lock.json`
- Seed SQL: `scripts/usda/generated/food-catalog-reviewed.sql`
- Migration SQL: `supabase/migrations/20260721003000_seed_usda_food_catalog_phase2c_common_expansion.sql`

### Scaled local Common search behavior

Phase 2C keeps Common search local to `public.food_catalog` and avoids full-catalog preload on page load:

- initial Nutrition Common panel loads a bounded featured subset (capped)
- typed queries run server-side search against bounded candidates
- deterministic ranking remains:
  1. exact normalized-name
  2. exact alias
  3. starts-with normalized-name
  4. all terms in normalized-name
  5. all terms in aliases
  6. recent-usage tie-break
  7. stable alphabetical/FDC tie-break
- client includes loading/no-results behavior and stale-request prevention

### USDA attribution

Catalog source nutrition data is derived from **USDA FoodData Central** and stored as reviewed local snapshots for Common logging.

### Common catalog limitations vs live USDA search

Phase 2C intentionally keeps Common mode local and reviewed:

- no browser-side live USDA querying
- no live save/import workflow for new USDA rows
- no barcode flow
- branded coverage remains limited in Common mode

These capabilities belong to the later live USDA search phase, not this deterministic reviewed catalog phase.

## Session 9.5B Phase 2D: Live USDA Search + Trusted Logging + Save to My Foods

### Architecture boundary (server-only USDA key)

- USDA API access remains server-only in `src/lib/usda/client.ts` (`import "server-only"`).
- Browser never sends USDA API key, never calls `api.nal.usda.gov` directly, and never receives raw keyed USDA URLs.
- Authenticated internal search boundary:
  - `POST /api/usda/search`
  - validates auth, query, result group, and limit
  - returns only safe normalized summaries
- Exact detail resolution and logging use server actions:
  - `resolveUsdaFoodDetailAction`
  - `createLiveUsdaFoodEntryAction`

### Search USDA mode and result groups

Add Food now includes four explicit modes:

- **Common** (curated local `food_catalog`)
- **Search USDA** (live server-fetched USDA)
- **My Foods**
- **Manual Label**

Search USDA keeps Generic and Branded distinct:

- **Generic**: Foundation / Survey (FNDDS) / SR Legacy style results
- **Branded**: branded product records with brand + GTIN/UPC context

### Search behavior, ranking, and bounds

Search USDA behavior is bounded and stale-safe:

- minimum query length
- query normalization
- debounced search in composer
- explicit Search button
- stale request cancellation/ignore
- capped result count

Deterministic ranking:

- Generic prioritizes exact/term/preparation clarity before source-type tie-breaks
- Branded prioritizes exact brand/product and GTIN relevance, then nutrient/serving quality and recency
- branded duplicates with same GTIN/UPC are deduplicated deterministically (most recent valid record wins)
- stable FDC tie-break remains

### Exact FDC detail resolution (trusted preview + logging authority)

Search rows are discovery summaries only.

When a user selects a result:

1. browser submits FDC ID
2. server resolves exact USDA detail for that FDC ID
3. trusted normalization runs server-side
4. UI receives safe normalized detail preview (no raw USDA payload)

Logging re-resolves USDA detail again server-side before write, so browser-provided macros/descriptions are never trusted.

### Supported quantity model

Live USDA logging supports:

- `g`
- `oz`
- `source_serving` only when USDA detail provides trusted gram weight for that portion

No invented conversions are introduced.
If required core nutrient basis is missing, logging is blocked with a clear message.

### Snapshot logging behavior (`source_status = usda_live`)

Live USDA entries are stored as immutable snapshots using the same proven amount-entry representation:

- `servings = 1`
- `serving_size = entered amount value`
- `serving_unit = entered amount unit`
- per-serving calories/macros are computed server-side from trusted nutrient basis
- amount fields and source metadata are snapshotted on entry row
- `source_status = usda_live`

Quantity edits for `usda_live` entries recalculate from entry snapshots (no USDA refetch), preserving historical stability.

### Save to My Foods and USDA Modified behavior

Optional save-to-My-Foods in Search USDA mode:

- reuses user-owned saved USDA food by `user_id + fdc_id` lookup logic
- avoids uncontrolled duplicate creation on repeated saves
- does not overwrite `usda_modified`/manual customized records without explicit user edits

Saved-food editing behavior:

- non-nutrition edits keep USDA status/provenance
- changing core nutrition values marks source as `usda_modified`
- provenance fields (`fdc_id`, source metadata) remain retained

### Cache behavior

Conservative in-memory cache at USDA integration boundary (`src/lib/usda/live.ts`):

- short-lived cache for normalized search responses
- longer-lived cache for normalized exact-detail responses
- cache key includes normalization version + normalized query/group/limit (search) or FDC ID (detail)
- malformed responses and upstream failures are not permanently cached

Notes:

- this is process-local cache behavior, not a distributed global rate limiter
- stronger distributed throttling can be added as future production hardening

### Outage and rate-limit behavior

Search USDA distinguishes typed failures (for example `rate_limited`, `timeout`, `service_unavailable`) and keeps other modes usable:

- Common still works
- My Foods still works
- Manual Label still works
- existing logs remain visible/editable

### Fixture-backed permanent testing boundary

Permanent E2E does not require live USDA availability.

- server-only USDA fixture mode: `USDA_FDC_FIXTURE_MODE=1`
- fixture mode is disabled in production runtime
- fixture activation is environment-based only (not query/cookie toggled)
- fixture implementation is contained to USDA server module boundary (`src/lib/usda/fixtures.ts` + `src/lib/usda/live.ts`)

New dedicated E2E:

- `tests/e2e/usda-live-search.spec.ts`

### Live USDA verification checklist (separate from permanent fixture tests)

When running live verification with real USDA credentials, validate:

1. generic search behavior
2. branded search behavior
3. exact FDC detail resolution
4. grams and ounces logging math
5. source-serving logging when trusted grams exist
6. `usda_live` snapshot persistence
7. save-to-My-Foods reuse behavior
8. `usda_modified` transition after nutrient edits
9. browser never directly requests USDA host
10. no key exposure in browser payloads

### USDA attribution and explicit deferrals

- Live search and source nutrition remain attributed to **USDA FoodData Central**.
- Explicitly deferred from this phase:
  - barcode scanning
  - arbitrary global live-product caching service
  - final UI redesign
  - Session 10 work
