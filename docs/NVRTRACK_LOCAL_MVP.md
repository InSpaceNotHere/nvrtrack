# NVRTRACK local-first MVP

The active product on `cursor/nvrtrack-command-center-8c10` is a **single-user Command Center**. It opens at `/today` with no login.

## Owner experience

Today is the product. The primary navigation is Today, Work, and Opportunities, with Business, Results, Activity, AI, and Account behind More. The screen leads with one most-important action, then the rest of what needs the owner. Estimated impact stays labeled estimated.

## Current architecture

- Persistence: browser `localStorage` key `nvrtrack.command-center.workspace.v1`
- One workspace: Juniper & Co. Events, seeded on first launch
- UI talks to `BusinessRepository`
- Current implementation: `LocalBusinessRepository`
- Future implementation: `SupabaseBusinessRepository` (not built)

Pages must not read `localStorage` themselves. They use `WorkspaceProvider`, which owns the repository.

## Deferred cloud phase

Do not apply business SQL to Nutrition Production.

Staged migration, unused at runtime:

`supabase/migrations/20261008054754_add_command_center_foundation.sql`

It still defines `organizations`, `organization_members`, `opportunities`, `business_tasks`, and `activity_events` for a later cloud phase. Auth, signup, and multi-user organizations stay in the repo and are not required to use Today, Tasks, Opportunities, Activity, or Businesses.

## Local data limits

- Each browser profile has its own workspace
- Data is not shared across devices
- Clearing site data removes local changes
- Export workspace JSON from Account if you need a backup
- Reset demo workspace restores the Juniper seed after a confirmation

Estimated impact stays labeled **Estimated**. This phase does not store measured results.

Future research and automation monitoring are recorded in `docs/NVR_LABS_BRIDGE_V1.md`. NVR Labs stays the research system. OpenTelemetry conventions are the candidate technical telemetry format. Neither is wired up in this MVP.
