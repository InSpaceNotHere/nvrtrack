-- Session 3 database foundation:
-- - private user profiles
-- - private body-weight entries
-- - secure ownership policies via RLS

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  height_inches numeric,
  calorie_goal integer,
  protein_goal integer,
  carbohydrate_goal integer,
  fat_goal integer,
  preferred_weight_unit text not null default 'lb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferred_weight_unit_check check (preferred_weight_unit in ('lb', 'kg')),
  constraint profiles_height_inches_positive check (height_inches is null or height_inches > 0),
  constraint profiles_calorie_goal_nonnegative check (calorie_goal is null or calorie_goal >= 0),
  constraint profiles_protein_goal_nonnegative check (protein_goal is null or protein_goal >= 0),
  constraint profiles_carbohydrate_goal_nonnegative check (carbohydrate_goal is null or carbohydrate_goal >= 0),
  constraint profiles_fat_goal_nonnegative check (fat_goal is null or fat_goal >= 0)
);

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight numeric not null,
  unit text not null default 'lb',
  entry_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weight_entries_unit_check check (unit in ('lb', 'kg')),
  constraint weight_entries_weight_positive check (weight > 0),
  constraint weight_entries_user_id_entry_date_key unique (user_id, entry_date)
);

create index if not exists weight_entries_user_id_entry_date_desc_idx
  on public.weight_entries (user_id, entry_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists weight_entries_set_updated_at on public.weight_entries;
create trigger weight_entries_set_updated_at
before update on public.weight_entries
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill profile rows for users created before this migration.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists weight_entries_select_own on public.weight_entries;
create policy weight_entries_select_own
on public.weight_entries
for select
using (auth.uid() = user_id);

drop policy if exists weight_entries_insert_own on public.weight_entries;
create policy weight_entries_insert_own
on public.weight_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists weight_entries_update_own on public.weight_entries;
create policy weight_entries_update_own
on public.weight_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weight_entries_delete_own on public.weight_entries;
create policy weight_entries_delete_own
on public.weight_entries
for delete
using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.weight_entries to authenticated;
