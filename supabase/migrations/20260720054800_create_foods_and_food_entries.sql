-- Session 6 database foundation:
-- - private user-owned saved foods
-- - private user-owned food log entries
-- - immutable nutrition snapshots for historical accuracy

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  serving_size numeric not null,
  serving_unit text not null,
  calories numeric not null,
  protein_g numeric not null default 0,
  carbohydrate_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_name_not_blank check (btrim(name) <> ''),
  constraint foods_serving_size_positive check (serving_size > 0),
  constraint foods_serving_unit_not_blank check (btrim(serving_unit) <> ''),
  constraint foods_calories_nonnegative check (calories >= 0),
  constraint foods_protein_nonnegative check (protein_g >= 0),
  constraint foods_carbohydrate_nonnegative check (carbohydrate_g >= 0),
  constraint foods_fat_nonnegative check (fat_g >= 0),
  constraint foods_fiber_nonnegative check (fiber_g is null or fiber_g >= 0)
);

comment on table public.foods is 'User-owned saved foods for quick logging.';

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  entry_date date not null,
  meal_type text not null,
  servings numeric not null default 1,
  food_name text not null,
  brand_name text,
  serving_size numeric not null,
  serving_unit text not null,
  calories_per_serving numeric not null,
  protein_per_serving_g numeric not null default 0,
  carbohydrate_per_serving_g numeric not null default 0,
  fat_per_serving_g numeric not null default 0,
  fiber_per_serving_g numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_entries_meal_type_check check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  constraint food_entries_servings_positive check (servings > 0),
  constraint food_entries_food_name_not_blank check (btrim(food_name) <> ''),
  constraint food_entries_serving_size_positive check (serving_size > 0),
  constraint food_entries_serving_unit_not_blank check (btrim(serving_unit) <> ''),
  constraint food_entries_calories_nonnegative check (calories_per_serving >= 0),
  constraint food_entries_protein_nonnegative check (protein_per_serving_g >= 0),
  constraint food_entries_carbohydrate_nonnegative check (carbohydrate_per_serving_g >= 0),
  constraint food_entries_fat_nonnegative check (fat_per_serving_g >= 0),
  constraint food_entries_fiber_nonnegative check (fiber_per_serving_g is null or fiber_per_serving_g >= 0)
);

comment on table public.food_entries is 'User-owned logged food entries with nutrition snapshots for immutable history.';

create index if not exists foods_user_id_created_at_desc_idx
  on public.foods (user_id, created_at desc);

create index if not exists foods_user_id_name_lower_idx
  on public.foods (user_id, lower(name));

create index if not exists foods_user_id_updated_at_desc_idx
  on public.foods (user_id, updated_at desc);

create index if not exists food_entries_user_id_entry_date_desc_idx
  on public.food_entries (user_id, entry_date desc);

create index if not exists food_entries_user_id_entry_date_meal_type_idx
  on public.food_entries (user_id, entry_date, meal_type);

create index if not exists food_entries_user_id_food_id_idx
  on public.food_entries (user_id, food_id);

drop trigger if exists foods_set_updated_at on public.foods;
create trigger foods_set_updated_at
before update on public.foods
for each row
execute function public.set_updated_at();

drop trigger if exists food_entries_set_updated_at on public.food_entries;
create trigger food_entries_set_updated_at
before update on public.food_entries
for each row
execute function public.set_updated_at();

alter table public.foods enable row level security;
alter table public.food_entries enable row level security;

drop policy if exists foods_select_own on public.foods;
create policy foods_select_own
on public.foods
for select
using (auth.uid() = user_id);

drop policy if exists foods_insert_own on public.foods;
create policy foods_insert_own
on public.foods
for insert
with check (auth.uid() = user_id);

drop policy if exists foods_update_own on public.foods;
create policy foods_update_own
on public.foods
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists foods_delete_own on public.foods;
create policy foods_delete_own
on public.foods
for delete
using (auth.uid() = user_id);

drop policy if exists food_entries_select_own on public.food_entries;
create policy food_entries_select_own
on public.food_entries
for select
using (auth.uid() = user_id);

drop policy if exists food_entries_insert_own on public.food_entries;
create policy food_entries_insert_own
on public.food_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists food_entries_update_own on public.food_entries;
create policy food_entries_update_own
on public.food_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists food_entries_delete_own on public.food_entries;
create policy food_entries_delete_own
on public.food_entries
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.foods to authenticated;
grant select, insert, update, delete on public.food_entries to authenticated;
