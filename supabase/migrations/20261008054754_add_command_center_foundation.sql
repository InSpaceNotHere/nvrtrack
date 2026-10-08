-- Phase 1A Command Center foundation.
-- Additive only: does not alter or drop fitness/nutrition tables.

create schema if not exists private;

create or replace function private.is_organization_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.has_organization_write_role(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$;

create or replace function private.has_organization_admin_role(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

revoke all on function private.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function private.has_organization_write_role(uuid) from public, anon, authenticated;
revoke all on function private.has_organization_admin_role(uuid) from public, anon, authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  industry text,
  website text,
  timezone text not null default 'UTC',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_empty check (char_length(trim(name)) > 0),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_key unique (slug)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint organization_members_org_user_key unique (organization_id, user_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  department text,
  current_problem text,
  proposed_solution text,
  estimated_hours_per_month numeric,
  estimated_revenue_cents integer,
  priority text not null default 'medium',
  status text not null default 'identified',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_not_empty check (char_length(trim(title)) > 0),
  constraint opportunities_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint opportunities_status_check check (
    status in ('identified', 'approved', 'building', 'testing', 'live', 'measuring', 'completed', 'rejected')
  ),
  constraint opportunities_hours_nonnegative check (
    estimated_hours_per_month is null or estimated_hours_per_month >= 0
  ),
  constraint opportunities_revenue_nonnegative check (
    estimated_revenue_cents is null or estimated_revenue_cents >= 0
  )
);

create table if not exists public.business_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  due_at timestamptz,
  owner_user_id uuid references auth.users (id) on delete set null,
  source text,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_tasks_title_not_empty check (char_length(trim(title)) > 0),
  constraint business_tasks_status_check check (
    status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')
  ),
  constraint business_tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent'))
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  entity_type text,
  entity_id uuid,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_events_summary_not_empty check (char_length(trim(summary)) > 0),
  constraint activity_events_event_type_not_empty check (char_length(trim(event_type)) > 0)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists opportunities_organization_id_idx
  on public.opportunities (organization_id, created_at desc);

create index if not exists business_tasks_organization_id_due_idx
  on public.business_tasks (organization_id, due_at);

create index if not exists business_tasks_organization_id_status_idx
  on public.business_tasks (organization_id, status);

create index if not exists activity_events_organization_id_occurred_idx
  on public.activity_events (organization_id, occurred_at desc);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row
execute function public.set_updated_at();

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
before update on public.opportunities
for each row
execute function public.set_updated_at();

drop trigger if exists business_tasks_set_updated_at on public.business_tasks;
create trigger business_tasks_set_updated_at
before update on public.business_tasks
for each row
execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.business_tasks enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
using (
  created_by = auth.uid()
  or private.is_organization_member(id)
);

drop policy if exists organizations_insert_own on public.organizations;
create policy organizations_insert_own
on public.organizations
for insert
with check (created_by = auth.uid());

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin
on public.organizations
for update
using (private.has_organization_admin_role(id))
with check (private.has_organization_admin_role(id));

drop policy if exists organizations_delete_owner on public.organizations;
create policy organizations_delete_owner
on public.organizations
for delete
using (
  exists (
    select 1
    from public.organization_members
    where organization_id = organizations.id
      and user_id = auth.uid()
      and role = 'owner'
  )
);

drop policy if exists organization_members_select_member on public.organization_members;
create policy organization_members_select_member
on public.organization_members
for select
using (
  user_id = auth.uid()
  or private.is_organization_member(organization_id)
);

drop policy if exists organization_members_insert_first_owner on public.organization_members;
create policy organization_members_insert_first_owner
on public.organization_members
for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.organizations o
    where o.id = organization_id
      and o.created_by = auth.uid()
  )
);

drop policy if exists organization_members_insert_admin on public.organization_members;
create policy organization_members_insert_admin
on public.organization_members
for insert
with check (private.has_organization_admin_role(organization_id));

drop policy if exists organization_members_update_admin on public.organization_members;
create policy organization_members_update_admin
on public.organization_members
for update
using (private.has_organization_admin_role(organization_id))
with check (private.has_organization_admin_role(organization_id));

drop policy if exists organization_members_delete_admin on public.organization_members;
create policy organization_members_delete_admin
on public.organization_members
for delete
using (private.has_organization_admin_role(organization_id));

drop policy if exists opportunities_select_member on public.opportunities;
create policy opportunities_select_member
on public.opportunities
for select
using (private.is_organization_member(organization_id));

drop policy if exists opportunities_insert_writer on public.opportunities;
create policy opportunities_insert_writer
on public.opportunities
for insert
with check (
  created_by = auth.uid()
  and private.has_organization_write_role(organization_id)
);

drop policy if exists opportunities_update_writer on public.opportunities;
create policy opportunities_update_writer
on public.opportunities
for update
using (private.has_organization_write_role(organization_id))
with check (private.has_organization_write_role(organization_id));

drop policy if exists opportunities_delete_writer on public.opportunities;
create policy opportunities_delete_writer
on public.opportunities
for delete
using (private.has_organization_write_role(organization_id));

drop policy if exists business_tasks_select_member on public.business_tasks;
create policy business_tasks_select_member
on public.business_tasks
for select
using (private.is_organization_member(organization_id));

drop policy if exists business_tasks_insert_writer on public.business_tasks;
create policy business_tasks_insert_writer
on public.business_tasks
for insert
with check (
  created_by = auth.uid()
  and private.has_organization_write_role(organization_id)
);

drop policy if exists business_tasks_update_writer on public.business_tasks;
create policy business_tasks_update_writer
on public.business_tasks
for update
using (private.has_organization_write_role(organization_id))
with check (private.has_organization_write_role(organization_id));

drop policy if exists business_tasks_delete_writer on public.business_tasks;
create policy business_tasks_delete_writer
on public.business_tasks
for delete
using (private.has_organization_write_role(organization_id));

drop policy if exists activity_events_select_member on public.activity_events;
create policy activity_events_select_member
on public.activity_events
for select
using (private.is_organization_member(organization_id));

drop policy if exists activity_events_insert_writer on public.activity_events;
create policy activity_events_insert_writer
on public.activity_events
for insert
with check (
  (actor_user_id is null or actor_user_id = auth.uid())
  and private.has_organization_write_role(organization_id)
);

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.opportunities to authenticated;
grant select, insert, update, delete on public.business_tasks to authenticated;
grant select, insert on public.activity_events to authenticated;
