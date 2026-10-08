# Open-source references (Phase 1A)

Bounded pass before Command Center implementation. Goal: reuse proven **patterns**, not clone products. Existing NVRTRACK code is preferred.

## Reuse decision

| Concern | Decision |
| --- | --- |
| Dashboard shell / sidebar / mobile nav | **Keep** `AppShell`, `DesktopSidebar`, `MobileBottomNav`, design tokens |
| Cards, sheets, dialogs, empty states, metric cards | **Keep** `src/components/ui/*` |
| Auth / Supabase SSR | **Keep** `@supabase/ssr`, `getAuthenticatedContext` |
| Org + membership schema / RLS | **Adapt** ideas from MIT `nextjs-supabase-rls-demo`; implement with NVRTRACK migration style. **Do not** copy SQL. Avoid `SECURITY DEFINER` helpers in `public` (Supabase guidance: definer functions belong outside exposed schemas). Bootstrap the first owner membership from the app with `user_id = auth.uid()`. |
| Task CRUD UX | **Keep** existing form primitives (`Input`, `Select`, `Button`) and server-action pattern |
| Activity feed | **Keep** list + `Card` presentation; events are new tables, not fitness journal rows |
| New UI libraries / shadcn | **Do not add** — would duplicate tokens and the current stack |

No copyleft dependencies were added. No unlicensed repositories were copied.

---

## 1. shadcn-admin

- URL: https://github.com/satnaing/shadcn-admin
- License: **MIT** (GitHub `spdx_id`: MIT)
- Files/patterns inspected: `src/components/layout/app-sidebar.tsx`, `nav-group.tsx`, `header.tsx`, `confirm-dialog.tsx`, `src/components/ui/sheet.tsx` / `dialog.tsx` / `table.tsx`
- Use: **design reference only** (grouped nav, dense dashboard chrome)
- Copied code: none
- Attribution required: none (no code copied)

## 2. supabase-nextjs-org-starter

- URL: https://github.com/MikeKurzewski/supabase-nextjs-org-starter
- License: **none recorded** on GitHub (`license: null`); no LICENSE file in the repo root
- Use: **skipped** — unclear license; do not copy or adapt code
- Copied code: none

## 3. nextjs-supabase-rls-demo

- URL: https://github.com/dani-io/nextjs-supabase-rls-demo
- License: **MIT**
- Files/patterns inspected: `supabase/migrations/0001_schema.sql`, `0002_functions_triggers.sql`, `0003_rls_policies.sql`
- Useful ideas (adapted, not copied):
  - `organizations` + membership join table + unique `(org, user)`
  - denormalize `organization_id` onto every tenant row so RLS is a single predicate
  - deny-by-default: enable RLS, then explicit policies
  - chicken-and-egg: creator must become owner (we do this in the data layer after insert, not via a public definer trigger)
- Copied code: none
- Attribution required: none for original SQL; this note is the credit for the pattern

## 4. shadcn-dashboard-landing-template

- URL: https://github.com/shadcnstore/shadcn-dashboard-landing-template
- License: **MIT**
- Use: **design reference only** (stat cards, dashboard spacing). NVRTRACK already has `MetricCard` / `Card`.
- Copied code: none
- Attribution required: none

## 5. shadcn-dashboard (SmitParekh84)

- URL: https://github.com/SmitParekh84/shadcn-dashboard
- License: **none recorded** on GitHub (`license: null`); no LICENSE file in the repo root
- Use: **skipped**
- Copied code: none

---

## What we implemented instead

Phase 1A uses NVRTRACK’s App Router, auth, RLS style (`auth.uid()` predicates, `set_updated_at`, `fail`/`ok` data helpers), and UI kit. New tables are additive and must not touch fitness schema.
