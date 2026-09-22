-- Nutrition V2 Phase 2: user-scoped food favorites for Add Food speed layer.
-- Local/proposed only until product review. Do not apply remotely until approved.

create table if not exists public.nutrition_food_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_type text not null,
  catalog_food_id uuid references public.food_catalog (id) on delete cascade,
  food_id uuid references public.foods (id) on delete cascade,
  snapshot_key text,
  created_at timestamptz not null default now(),
  constraint nutrition_food_favorites_identity_type_check
    check (identity_type in ('catalog', 'saved', 'snapshot')),
  constraint nutrition_food_favorites_catalog_shape_check check (
    identity_type <> 'catalog'
    or (
      catalog_food_id is not null
      and food_id is null
      and snapshot_key is null
    )
  ),
  constraint nutrition_food_favorites_saved_shape_check check (
    identity_type <> 'saved'
    or (
      food_id is not null
      and catalog_food_id is null
      and snapshot_key is null
    )
  ),
  constraint nutrition_food_favorites_snapshot_shape_check check (
    identity_type <> 'snapshot'
    or (
      snapshot_key is not null
      and btrim(snapshot_key) <> ''
      and catalog_food_id is null
      and food_id is null
    )
  ),
  constraint nutrition_food_favorites_snapshot_key_length_check check (
    snapshot_key is null or char_length(snapshot_key) <= 400
  )
);

comment on table public.nutrition_food_favorites is
  'User-owned explicit nutrition favorites keyed by logical food identity.';

create unique index if not exists nutrition_food_favorites_user_catalog_uidx
  on public.nutrition_food_favorites (user_id, catalog_food_id)
  where catalog_food_id is not null;

create unique index if not exists nutrition_food_favorites_user_food_uidx
  on public.nutrition_food_favorites (user_id, food_id)
  where food_id is not null;

create unique index if not exists nutrition_food_favorites_user_snapshot_uidx
  on public.nutrition_food_favorites (user_id, snapshot_key)
  where snapshot_key is not null;

create index if not exists nutrition_food_favorites_user_created_at_idx
  on public.nutrition_food_favorites (user_id, created_at desc);

create index if not exists food_entries_user_id_created_at_desc_idx
  on public.food_entries (user_id, created_at desc);

alter table public.nutrition_food_favorites enable row level security;

drop policy if exists nutrition_food_favorites_select_own on public.nutrition_food_favorites;
create policy nutrition_food_favorites_select_own
on public.nutrition_food_favorites
for select
using (auth.uid() = user_id);

drop policy if exists nutrition_food_favorites_insert_own on public.nutrition_food_favorites;
create policy nutrition_food_favorites_insert_own
on public.nutrition_food_favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists nutrition_food_favorites_delete_own on public.nutrition_food_favorites;
create policy nutrition_food_favorites_delete_own
on public.nutrition_food_favorites
for delete
using (auth.uid() = user_id);

grant select, insert, delete on public.nutrition_food_favorites to authenticated;
