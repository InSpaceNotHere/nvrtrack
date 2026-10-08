# NVR Nutrition schema snapshot

Frozen with tag `nvr-nutrition-v1-freeze` at commit `daf5e185bd8e2b95e34c6f7f69a0df68f9d8f90a`.

This is a **documentation snapshot** of the in-repo migrations and generated types. It is not a `pg_dump`. Recreate an empty database by applying `supabase/migrations/` in order. Do not drop these tables for the NVRTRACK business pivot.

## Public tables (from `src/types/database.ts`)

User-owned (RLS, typically `user_id = auth.uid()`):

- `profiles`
- `weight_entries`
- `foods`
- `food_entries`
- `nutrition_food_favorites`
- `exercises`
- `workouts`
- `workout_exercises`
- `workout_sets`
- `workout_templates`
- `workout_template_exercises`
- `workout_weekday_schedule`
- `workout_schedule_overrides`
- `body_measurement_entries`
- `weekly_journal_entries`
- `progress_photos`
- `notification_preferences`
- `notifications`

Shared catalogs (RLS enabled; global read for authenticated/anon as defined in migrations):

- `exercise_catalog`
- `food_catalog`

Related storage: progress photo objects referenced by `progress_photos.storage_path` (see Session 10a migration).

## Migrations (apply in this order)

| File | Purpose |
| --- | --- |
| `20260720042756_create_profiles_and_weight_entries.sql` | `profiles`, `weight_entries`, auth profile trigger, RLS |
| `20260720054800_create_foods_and_food_entries.sql` | `foods`, `food_entries` snapshot logging, RLS |
| `20260720064500_create_workout_tracking.sql` | `exercises`, `workouts`, `workout_exercises`, `workout_sets`, RLS |
| `20260720100400_add_exercise_catalog.sql` | `exercise_catalog` + workout exercise catalog refs |
| `20260720193000_add_usda_food_catalog_phase1.sql` | `food_catalog` |
| `20260720201500_seed_usda_food_catalog_pilot.sql` | food catalog pilot seed |
| `20260721003000_seed_usda_food_catalog_phase2c_common_expansion.sql` | expanded Common catalog seed |
| `20260721020000_add_training_muscle_metadata.sql` | muscle metadata on exercises |
| `20260721033000_add_session10a_functional_features.sql` | planner, photos, measurements, journal, notifications |
| `20260918024500_add_strength_canonical_lifts.sql` | canonical lift metadata |
| `20260921043000_add_template_exercise_prescriptions.sql` | template set/rep/rest prescriptions |
| `20260922001000_add_onboarding_v1_profile_fields.sql` | onboarding V1 profile columns |
| `20260922220000_add_nutrition_food_favorites.sql` | `nutrition_food_favorites` |

Generated TypeScript: `src/types/database.ts`.

## Safety rules for later NVRTRACK work

1. New business entities get **new** tables and **new** migrations.
2. Do not rename `weight_entries`, `food_entries`, `workouts`, etc. into business terms.
3. Do not delete or squash this migration history.
4. Restore NVR Nutrition from tag `nvr-nutrition-v1-freeze`, not from a later business-mixed `main`.
