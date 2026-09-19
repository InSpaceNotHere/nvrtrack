-- Session 9.5B Phase 1
-- Additive USDA-backed catalog foundation and source snapshot metadata.

create table if not exists public.food_catalog (
  id uuid primary key default gen_random_uuid(),
  fdc_id bigint not null,
  description text not null,
  normalized_name text not null,
  aliases text[] not null default '{}'::text[],
  data_type text not null,
  brand_owner text,
  brand_name text,
  gtin_upc text,
  food_category text,
  ingredients text,
  serving_size numeric,
  serving_unit text,
  serving_weight_grams numeric,
  calories_per_100g numeric,
  protein_g_per_100g numeric,
  carbohydrate_g_per_100g numeric,
  fat_g_per_100g numeric,
  fiber_g_per_100g numeric,
  sugar_g_per_100g numeric,
  sodium_mg_per_100g numeric,
  source_published_date date,
  source_modified_date date,
  retrieved_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_catalog_fdc_id_positive check (fdc_id > 0),
  constraint food_catalog_description_not_blank check (btrim(description) <> ''),
  constraint food_catalog_normalized_name_not_blank check (btrim(normalized_name) <> ''),
  constraint food_catalog_data_type_not_blank check (btrim(data_type) <> ''),
  constraint food_catalog_serving_size_positive check (serving_size is null or serving_size > 0),
  constraint food_catalog_serving_unit_not_blank check (serving_unit is null or btrim(serving_unit) <> ''),
  constraint food_catalog_serving_weight_positive check (
    serving_weight_grams is null or serving_weight_grams > 0
  ),
  constraint food_catalog_calories_nonnegative check (
    calories_per_100g is null or calories_per_100g >= 0
  ),
  constraint food_catalog_protein_nonnegative check (
    protein_g_per_100g is null or protein_g_per_100g >= 0
  ),
  constraint food_catalog_carbohydrate_nonnegative check (
    carbohydrate_g_per_100g is null or carbohydrate_g_per_100g >= 0
  ),
  constraint food_catalog_fat_nonnegative check (
    fat_g_per_100g is null or fat_g_per_100g >= 0
  ),
  constraint food_catalog_fiber_nonnegative check (
    fiber_g_per_100g is null or fiber_g_per_100g >= 0
  ),
  constraint food_catalog_sugar_nonnegative check (
    sugar_g_per_100g is null or sugar_g_per_100g >= 0
  ),
  constraint food_catalog_sodium_nonnegative check (
    sodium_mg_per_100g is null or sodium_mg_per_100g >= 0
  )
);

create unique index if not exists food_catalog_fdc_id_unique_idx
  on public.food_catalog (fdc_id);

create index if not exists food_catalog_normalized_name_idx
  on public.food_catalog (normalized_name);

create index if not exists food_catalog_is_active_normalized_name_idx
  on public.food_catalog (is_active, normalized_name);

create index if not exists food_catalog_data_type_idx
  on public.food_catalog (data_type);

create index if not exists food_catalog_brand_owner_idx
  on public.food_catalog (brand_owner);

create index if not exists food_catalog_brand_name_idx
  on public.food_catalog (brand_name);

create index if not exists food_catalog_gtin_upc_idx
  on public.food_catalog (gtin_upc);

create index if not exists food_catalog_aliases_gin_idx
  on public.food_catalog using gin (aliases);

drop trigger if exists food_catalog_set_updated_at on public.food_catalog;
create trigger food_catalog_set_updated_at
before update on public.food_catalog
for each row
execute function public.set_updated_at();

alter table public.food_catalog enable row level security;

drop policy if exists food_catalog_select_active on public.food_catalog;
create policy food_catalog_select_active
on public.food_catalog
for select
using (auth.role() = 'authenticated' and is_active = true);

grant select on public.food_catalog to authenticated;

alter table public.foods
  add column if not exists catalog_food_id uuid references public.food_catalog (id) on delete set null,
  add column if not exists fdc_id bigint,
  add column if not exists source_status text,
  add column if not exists source_name text,
  add column if not exists source_data_type text,
  add column if not exists source_description text,
  add column if not exists source_brand text,
  add column if not exists source_gtin_upc text,
  add column if not exists source_retrieved_at timestamptz,
  add column if not exists serving_weight_grams numeric,
  add column if not exists calories_per_100g numeric,
  add column if not exists protein_g_per_100g numeric,
  add column if not exists carbohydrate_g_per_100g numeric,
  add column if not exists fat_g_per_100g numeric,
  add column if not exists fiber_g_per_100g numeric,
  add column if not exists sugar_g_per_100g numeric,
  add column if not exists sodium_mg_per_100g numeric;

alter table public.foods
  alter column source_status set default 'manual';

alter table public.foods
  add constraint foods_fdc_id_positive check (fdc_id is null or fdc_id > 0),
  add constraint foods_source_status_check check (
    source_status is null
    or source_status in ('manual', 'usda_catalog', 'usda_live', 'usda_modified')
  ),
  add constraint foods_source_name_not_blank check (
    source_name is null or btrim(source_name) <> ''
  ),
  add constraint foods_source_data_type_not_blank check (
    source_data_type is null or btrim(source_data_type) <> ''
  ),
  add constraint foods_source_description_not_blank check (
    source_description is null or btrim(source_description) <> ''
  ),
  add constraint foods_source_brand_not_blank check (
    source_brand is null or btrim(source_brand) <> ''
  ),
  add constraint foods_source_gtin_upc_not_blank check (
    source_gtin_upc is null or btrim(source_gtin_upc) <> ''
  ),
  add constraint foods_serving_weight_grams_positive check (
    serving_weight_grams is null or serving_weight_grams > 0
  ),
  add constraint foods_calories_per_100g_nonnegative check (
    calories_per_100g is null or calories_per_100g >= 0
  ),
  add constraint foods_protein_per_100g_nonnegative check (
    protein_g_per_100g is null or protein_g_per_100g >= 0
  ),
  add constraint foods_carbohydrate_per_100g_nonnegative check (
    carbohydrate_g_per_100g is null or carbohydrate_g_per_100g >= 0
  ),
  add constraint foods_fat_per_100g_nonnegative check (
    fat_g_per_100g is null or fat_g_per_100g >= 0
  ),
  add constraint foods_fiber_per_100g_nonnegative check (
    fiber_g_per_100g is null or fiber_g_per_100g >= 0
  ),
  add constraint foods_sugar_per_100g_nonnegative check (
    sugar_g_per_100g is null or sugar_g_per_100g >= 0
  ),
  add constraint foods_sodium_per_100g_nonnegative check (
    sodium_mg_per_100g is null or sodium_mg_per_100g >= 0
  );

create index if not exists foods_user_id_source_status_idx
  on public.foods (user_id, source_status);

create index if not exists foods_user_id_fdc_id_idx
  on public.foods (user_id, fdc_id);

create index if not exists foods_user_id_catalog_food_id_idx
  on public.foods (user_id, catalog_food_id);

alter table public.food_entries
  add column if not exists catalog_food_id uuid references public.food_catalog (id) on delete set null,
  add column if not exists fdc_id bigint,
  add column if not exists source_status text,
  add column if not exists source_name text,
  add column if not exists source_data_type text,
  add column if not exists source_description text,
  add column if not exists source_brand text,
  add column if not exists source_gtin_upc text,
  add column if not exists source_retrieved_at timestamptz,
  add column if not exists amount_value numeric,
  add column if not exists amount_unit text,
  add column if not exists amount_grams numeric,
  add column if not exists source_serving_quantity numeric,
  add column if not exists source_serving_unit text,
  add column if not exists source_serving_weight_grams numeric,
  add column if not exists calories_per_100g numeric,
  add column if not exists protein_g_per_100g numeric,
  add column if not exists carbohydrate_g_per_100g numeric,
  add column if not exists fat_g_per_100g numeric,
  add column if not exists fiber_g_per_100g numeric,
  add column if not exists sugar_g_per_100g numeric,
  add column if not exists sodium_mg_per_100g numeric;

alter table public.food_entries
  alter column source_status set default 'manual';

alter table public.food_entries
  add constraint food_entries_fdc_id_positive check (fdc_id is null or fdc_id > 0),
  add constraint food_entries_source_status_check check (
    source_status is null
    or source_status in ('manual', 'usda_catalog', 'usda_live', 'usda_modified')
  ),
  add constraint food_entries_source_name_not_blank check (
    source_name is null or btrim(source_name) <> ''
  ),
  add constraint food_entries_source_data_type_not_blank check (
    source_data_type is null or btrim(source_data_type) <> ''
  ),
  add constraint food_entries_source_description_not_blank check (
    source_description is null or btrim(source_description) <> ''
  ),
  add constraint food_entries_source_brand_not_blank check (
    source_brand is null or btrim(source_brand) <> ''
  ),
  add constraint food_entries_source_gtin_upc_not_blank check (
    source_gtin_upc is null or btrim(source_gtin_upc) <> ''
  ),
  add constraint food_entries_amount_value_positive check (
    amount_value is null or amount_value > 0
  ),
  add constraint food_entries_amount_unit_not_blank check (
    amount_unit is null or btrim(amount_unit) <> ''
  ),
  add constraint food_entries_amount_grams_positive check (
    amount_grams is null or amount_grams > 0
  ),
  add constraint food_entries_source_serving_quantity_positive check (
    source_serving_quantity is null or source_serving_quantity > 0
  ),
  add constraint food_entries_source_serving_unit_not_blank check (
    source_serving_unit is null or btrim(source_serving_unit) <> ''
  ),
  add constraint food_entries_source_serving_weight_positive check (
    source_serving_weight_grams is null or source_serving_weight_grams > 0
  ),
  add constraint food_entries_calories_per_100g_nonnegative check (
    calories_per_100g is null or calories_per_100g >= 0
  ),
  add constraint food_entries_protein_per_100g_nonnegative check (
    protein_g_per_100g is null or protein_g_per_100g >= 0
  ),
  add constraint food_entries_carbohydrate_per_100g_nonnegative check (
    carbohydrate_g_per_100g is null or carbohydrate_g_per_100g >= 0
  ),
  add constraint food_entries_fat_per_100g_nonnegative check (
    fat_g_per_100g is null or fat_g_per_100g >= 0
  ),
  add constraint food_entries_fiber_per_100g_nonnegative check (
    fiber_g_per_100g is null or fiber_g_per_100g >= 0
  ),
  add constraint food_entries_sugar_per_100g_nonnegative check (
    sugar_g_per_100g is null or sugar_g_per_100g >= 0
  ),
  add constraint food_entries_sodium_per_100g_nonnegative check (
    sodium_mg_per_100g is null or sodium_mg_per_100g >= 0
  );

create index if not exists food_entries_user_id_source_status_idx
  on public.food_entries (user_id, source_status);

create index if not exists food_entries_user_id_fdc_id_idx
  on public.food_entries (user_id, fdc_id);

create index if not exists food_entries_user_id_catalog_food_id_idx
  on public.food_entries (user_id, catalog_food_id);
