# NVRTRACK — AI Business Command Center

Planning document for the pivot **after** NVR Nutrition was frozen. Application fitness code in this tree is unchanged until a later, explicit cutover.

**Daily question:** What needs my attention in my business?

Not a generic CRM, project manager, analytics wall, or ChatGPT wrapper.

## Product split

| | NVR Nutrition | NVRTRACK (this direction) |
| --- | --- | --- |
| Role | Frozen fitness/nutrition archive | Business command center |
| Git | tag `nvr-nutrition-v1-freeze` | branch `cursor/nvrtrack-command-center-8c10` |
| Data | existing fitness tables, untouched | **new** business tables, additive migrations |
| Production | keep https://nvrtrack.vercel.app as-is until a dedicated promote | Preview / this branch first |

NVR Labs discovers and implements AI opportunities. NVRTRACK monitors the business, implementations, tasks, and measurable results. Eventually: internal consulting workspaces **and** owner SaaS.

---

## Information architecture

### 1. Today / Command Center (`/` or `/today`)

Primary screen. Action first, charts last.

- **Needs attention** — overdue tasks, neglected contacts, open quotes/opportunities, failed implementations, stale follow-ups
- **Business snapshot** — counts and money that come from stored facts (open opportunities, won this period, active leads, overdue tasks, live automations)
- **AI impact** — hours saved / revenue influenced / actions automated, always labeled **estimated** vs **measured**
- **Recommended actions** — derived from the same records, not invented

### 2. Clients / Businesses (`/businesses`, `/businesses/[orgId]`)

Organizations (consulting clients or the owner’s company). Profile, industry, contacts, goals, notes. Multi-tenant ready: every row scoped to `organization_id`.

### 3. AI audit / opportunities (`/opportunities`)

Discovered work. Problem, proposed solution, department, priority, estimated impact, status pipeline:

`identified → approved → building → testing → live → measuring`

### 4. Implementations / automations (`/implementations`)

What actually shipped. Health, tools, owner, related opportunity, estimated **and** measured impact. Integration webhooks later; model includes `external_source` / `external_id` now.

### 5. Tasks / follow-ups (`/tasks`)

Operational work. Status, priority, due date, owner, organization, source, optional opportunity/implementation links. Today surfaces the important ones.

### 6. Results / ROI (`/results`)

Metric definitions + time-stamped entries. Every value has `value_kind: estimated | measured`. Never fabricate results.

### 7. Activity / timeline (`/activity`)

Append-only events for anything meaningful (lead, quote, deploy, failure, task complete, opportunity found, metric recorded). Future AI reads this log.

### AI layer (later)

Reason over structured NVRTRACK data. Cite rows. Separate facts vs assumptions. No autonomous agent in Phase 1.

---

## Domain model (proposed, not migrated yet)

Design before SQL. All new tables: RLS on, `organization_id` (except `organizations` itself), no reuse of fitness tables.

```
organizations
  id, name, slug, industry, website, timezone, created_by, timestamps

organization_members
  organization_id, user_id, role (owner | admin | member | viewer)
  unique (organization_id, user_id)

organization_profiles
  organization_id unique, services, goals, facts (jsonb), notes

contacts
  organization_id, name, email, phone, role_title, company_name, status, last_touch_at

opportunities          -- AI / process audit items
  organization_id, title, department, current_problem, proposed_solution
  estimated_hours_per_month, estimated_revenue_cents (nullable)
  priority, status, created_by

implementations
  organization_id, opportunity_id null, name, problem, status, health
  owner_user_id, tools (text[]), deployed_at, last_success_at, last_error_at, last_error
  estimated_hours_saved, measured_hours_saved
  estimated_revenue_cents, measured_revenue_cents
  external_source, external_id

business_tasks
  organization_id, title, status, priority, due_at, owner_user_id
  source, contact_id, opportunity_id, implementation_id, completed_at

business_metrics       -- catalog of KPI types
  organization_id, key, label, unit, description

metric_entries
  organization_id, metric_id, period_start, period_end
  value, value_kind ('estimated' | 'measured'), source, notes, recorded_by

activity_events
  organization_id, event_type, occurred_at, actor_user_id
  entity_type, entity_id, summary, payload jsonb

ai_recommendations     -- Phase 2+
  organization_id, prompt_kind, body, based_on_event_ids, status
```

Status vocabularies stay explicit in check constraints. Money as integer cents. Hours as numeric. Null estimated/measured rather than zero fakes.

### RLS sketch

- Members see only their organizations.
- `organization_members` is the tenancy gate.
- Writes limited to `owner | admin | member` as appropriate; viewers read-only.
- Do not put authorization in `user_metadata`.

---

## Reuse vs retire

### Reuse (keep as infrastructure)

- Next.js App Router, TypeScript, Tailwind, dark premium tokens
- Supabase Auth, SSR cookies, `src/lib/supabase/*`, `src/lib/data/auth-context.ts`, `src/lib/data/result.ts`
- RLS / ownership patterns (adapt from user-scoped to org-scoped)
- `AppShell`, `MobileBottomNav`, `DesktopSidebar`, routing access helpers
- UI primitives: button, card, dialog, sheet, toast, tabs, chips, empty state, page header, metric card, chart shell, progress bar, form layout
- Notification tables/framework (later remap to org events)
- Chart + timeline/journal **patterns** (not the fitness copy)
- PWA/manifest (rebrand later)
- Onboarding **flow shape** (new questions, not training goals)

### Retire from the *new product surface* (do not delete from git)

Fitness-specific UI, data helpers, and routes: Nutrition V2, training planner/logger, weight/body measurements, progress photos as physique tracking, exercise catalog, food catalog, USDA scripts, workout Home cards.

They stay on `nvr-nutrition-v1-freeze` / `archive/nvr-nutrition`. This branch may keep the files until a cutover PR removes them from the **default app**, not from history.

### Do not do

- Rename `weight_entries` → revenue
- Rename `food_entries` → leads
- Point Production at this branch until the command center MVP is reviewed

---

## Phased plan

### Phase 0 (done in this work)

Freeze NVR Nutrition (tag, archive branch, schema notes, tests). Production left on Training RC.

### Phase 1 MVP (next implementation)

Minimum that answers “what needs my attention?” for one organization:

1. Additive migration: `organizations`, `organization_members`, `organization_profiles`, `contacts`, `opportunities`, `business_tasks`, `activity_events` + RLS
2. Ensure a personal org on first login (or explicit create)
3. Command Center at `/today` (or `/` only after fitness Home is parked)
4. Tasks + opportunities CRUD, Today attention list from overdue/high-priority rows
5. Activity events written on create/complete/status change
6. Estimated impact fields nullable; no measured values unless the user enters them
7. Preview deploy only

Out of Phase 1: Zapier/Make/n8n, AI chat, billing, fake dashboards, deleting fitness schema.

### Phase 2

Implementations + health fields, metric catalog + measured entries, Results view.

### Phase 3

Activity-aware AI Q&A over real rows; external run webhooks.

### Phase 4

Multi-member invites, consulting workspace switcher, optional SaaS tenancy polish, then a **deliberate** production cutover that does not destroy the Nutrition archive or production rollback target.

---

## Proposed navigation (new product)

1. Today
2. Businesses
3. Opportunities
4. Implementations
5. Tasks
6. Results
7. Activity
8. Account / settings (existing profile shell, new copy)

Desktop-first, mobile usable. Fitness tabs remain only while the fitness app is still the default route tree.

---

## Exact next implementation step

On `cursor/nvrtrack-command-center-8c10`, after this plan is accepted:

**Add one additive Supabase migration** for `organizations`, `organization_members`, `business_tasks`, `opportunities`, and `activity_events` with RLS, plus TypeScript types and a `/today` Command Center that lists real tasks/opportunities (empty states allowed). Do not change Production. Do not drop fitness tables.
