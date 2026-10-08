# NVR Nutrition — frozen product archive

Working name for the existing fitness/nutrition application previously branded **NVRTRACK**.

This document describes the frozen snapshot so the product can be restored later for fitness coaching, nutrition tracking, or a standalone fitness app. **Do not delete this branch, tag, production deployment, or fitness schema** as part of the NVRTRACK business-product pivot.

## Frozen identity

| Item | Value |
| --- | --- |
| Product name | NVR Nutrition |
| Git tag | `nvr-nutrition-v1-freeze` |
| Archive branch | `archive/nvr-nutrition` |
| Frozen commit SHA | `daf5e185bd8e2b95e34c6f7f69a0df68f9d8f90a` |
| Feature branch at freeze | `cursor/training-tab-rc-harden-8c10` |
| Production URL (at freeze) | https://nvrtrack.vercel.app |
| Production deployment (at freeze) | `dpl_5cbNszDewLihq4Wpyi6CNMud3xQB` |
| Production target | `production` |
| Rollback (Smoothness V1) | `dpl_EEB1GDyJMcxPbSt5r91txam6dE1z` / `cfcb4369a6df925a24bc8ba3d3207b8c02f6e720` |

The annotated tag `nvr-nutrition-v1-freeze` points at **exactly** `daf5e18`. This archive-branch commit adds documentation only; it does not change application code.

## What NVR Nutrition contains

Mobile-first private fitness web app (Next.js App Router, TypeScript, Tailwind, Supabase Auth + Postgres + RLS).

- **Auth:** email/password signup and login, cookie SSR session, protected routes, logout
- **Onboarding V1:** gated first-run questionnaire, privacy notice, profile preferences
- **Home:** today workout (active / scheduled / rest / no program), nutrition totals, weight summary
- **Nutrition V2:** Today diary, Common catalog search (local `food_catalog`, no live USDA in-app), My Foods, custom foods, favorites, historical snapshot logging
- **Training:** program home (Current Program, Remove Program, week strip), ready-made presets, planner, workout logger, history, exercise catalog + custom exercises
- **Progress:** weight, measurements, photos, weekly journal, PRs/strength signals
- **Profile / notifications / privacy / PWA**

Navigation: Home, Nutrition, Training, Progress, Profile.

Routes: `/`, `/login`, `/signup`, `/auth/callback`, `/onboarding`, `/privacy`, `/nutrition`, `/nutrition/add`, `/nutrition/foods`, `/nutrition/foods/new`, `/nutrition/foods/[foodId]/edit`, `/training`, `/training/start`, `/training/history`, `/training/exercises`, `/training/workouts/[workoutId]`, `/progress`, `/profile`.

## Database

Fitness tables are **preserved**. Later NVRTRACK business work must be **additive** (new tables). Do not drop, rename, or overload these into business concepts.

See `docs/nvr-nutrition-schema-snapshot.md` for the table list and migration files.

All listed user tables use RLS with per-user (`auth.uid()`) ownership. Catalog tables (`exercise_catalog`, `food_catalog`) are global read-oriented.

Remote project: the production app’s `NEXT_PUBLIC_SUPABASE_URL` / anon key. Local CLI `project_id` in `supabase/config.toml` is `workspace` (local-dev label, not the hosted project ref).

## Environment

Required to run:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional / tooling:

```
E2E_TEST_EMAIL=
E2E_TEST_PASSWORD=
USDA_FDC_API_KEY=          # catalog pipeline scripts only; not used by the in-app Nutrition UI
USDA_FDC_FIXTURE_MODE=     # test-only USDA script fixture
```

Copy `.env.example` to `.env.local`.

## How to restore and run later

```bash
git fetch origin tag nvr-nutrition-v1-freeze
git checkout nvr-nutrition-v1-freeze
# or: git checkout archive/nvr-nutrition && git reset --hard nvr-nutrition-v1-freeze
cp .env.example .env.local   # fill Supabase URL + anon key
npm install
npm run dev
```

Recreate schema from migrations (empty database):

```bash
supabase db reset
# or apply files in supabase/migrations/ in timestamp order
```

Do **not** run new business-product migrations against a restore you intend to keep as NVR Nutrition unless they are proven additive and non-destructive.

## Freeze verification (this machine, 2026-10-08)

Recorded against SHA `daf5e185bd8e2b95e34c6f7f69a0df68f9d8f90a`:

| Check | Result |
| --- | --- |
| `npm run test` | 49 files / 317 tests passed |
| `npm run lint` | passed |
| `npm run build` | passed (Next.js 16.2.10) |
| `npm run test:e2e` | not re-run here (no `.env.local` in this environment). Last full suite on this SHA: 29 passed during Production verification, 2026-09-24 |

Production was **not** replaced as part of creating this archive.
